import { parentPort } from 'worker_threads';
import mongoose from 'mongoose';
import mongo_service from "../../../../database/mongo.service.js";
import XLSX from 'xlsx';
import { veneer_inventory_invoice_model, veneer_inventory_items_model } from '../../../../database/schema/inventory/venner/venner.schema.js';
import ApiError from "../../../../utils/errors/apiError.js";
import ItemNameModel from "../../../../database/schema/masters/itemName.schema.js";
import itemSubCategoryModel from "../../../../database/schema/masters/item.subcategory.schema.js";
import seriesModel from "../../../../database/schema/masters/series.schema.js";
import CutModel from "../../../../database/schema/masters/cut.schema.js";
import GradeModel from "../../../../database/schema/masters/grade.schema.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
mongo_service();

parentPort.on('message', async (data) => {
    const { file, otherDetails, created_by, reqBody } = data;

    const session = await mongoose.startSession();
    session.startTransaction({
        readConcern: { level: 'local' }, // Local read concern (faster than snapshot)
        writeConcern: { w: 'majority' }, // Ensure writes are acknowledged
    });

    try {
        const workbook = XLSX.readFile(file.path);
        const invoice = workbook.Sheets[workbook.SheetNames[0]];
        const items = workbook.Sheets[workbook.SheetNames[1]];

        const invoiceDetails = XLSX.utils.sheet_to_json(invoice);
        const itemsDetails = XLSX.utils.sheet_to_json(items);

        if (invoiceDetails.length === 0 || itemsDetails.length === 0) {
            throw new Error('No invoice or items found in the uploaded file.');
        }

        let invoiceDate = invoiceDetails?.[0].invoice_date;

        if (typeof invoiceDate === 'number') {
            const parsedDate = XLSX.SSF.parse_date_code(invoiceDate);
            invoiceDate = parsedDate
                ? new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d, parsedDate.H, parsedDate.M, parsedDate.S)
                : null;
        } else if (typeof invoiceDate === 'string') {
            invoiceDate = new Date(invoiceDate);
        }

        // Check if the date is valid
        if (!(invoiceDate instanceof Date) || isNaN(invoiceDate.getTime())) {
            invoiceDate = new Date(); // Fallback to current date
        }

        const inward_sr_no = await veneer_inventory_invoice_model.aggregate([
            {
                $group: {
                    _id: null,
                    latest_inward_sr_no: { $max: "$inward_sr_no" }
                }
            }
        ]);

        const latest_inward_sr_no =
            inward_sr_no?.length > 0 && inward_sr_no?.[0]?.latest_inward_sr_no
                ? inward_sr_no[0].latest_inward_sr_no + 1
                : 1;

        const invoiceFinalData = {
            ...otherDetails,
            inward_sr_no: latest_inward_sr_no,
            invoice_Details: {
                ...invoiceDetails[0],
                invoice_date: invoiceDate,
                invoice_no: otherDetails?.invoice_no,

            },
            created_by: created_by,
        };

        const invoiceInstance = new veneer_inventory_invoice_model(invoiceFinalData);
        try {
            await invoiceInstance.validate();
        } catch (error) {
            throw error
        }
        const invoiceDetailsData = await invoiceInstance.save();
        const invoiceId = invoiceDetailsData._id;

        const bulkOperations = [];
        const validationErrors = [];

        const totalItems = itemsDetails.length;
        let processedItems = 0;

        for (const elm of itemsDetails) {
            try {
                const item_name = elm?.item_name?.trim();
                const item_sub_category_name = elm?.item_sub_category_name?.trim();
                const cut_name = elm?.cut_name?.trim();
                const series_name = elm?.series_name?.trim();
                const grades_name = elm?.grades_name?.trim();

                // Fetch related details using await
                const itemNameDetails = await ItemNameModel.aggregate([
                    {
                        $lookup: {
                            from: "item_categories",
                            localField: "category",
                            foreignField: "_id",
                            pipeline: [{ $match: { category: "VENEER" } }],
                            as: "categoryDetails",
                        },
                    },
                    { $unwind: "$categoryDetails" },
                    { $match: { item_name: item_name } },
                    { $project: { item_name: 1 } },
                ]);
                const itemSubcategoryDetails = await itemSubCategoryModel.findOne({ name: item_sub_category_name }, { name: 1 });
                const cutNameDetails = await CutModel.findOne({ cut_name: cut_name }, { cut_name: 1 });
                const seriesNameDetails = await seriesModel.findOne({ series_name: series_name }, { series_name: 1 });
                const gradeNameDetails = await GradeModel.findOne({ grade_name: grades_name }, { grade_name: 1 });

                // Construct the object
                const itemDetailsObj = {
                    ...elm,
                    exchange_rate: otherDetails?.exchange_rate,
                    item_id: itemNameDetails?.[0]?._id,
                    item_sub_category_id: itemSubcategoryDetails?._id,
                    cut_id: cutNameDetails?._id,
                    series_id: seriesNameDetails?._id,
                    grades_id: gradeNameDetails?._id,
                    invoice_id: invoiceId,
                    created_by: created_by
                };

                // Create a Mongoose document instance to validate the schema
                const itemDetails = new veneer_inventory_items_model(itemDetailsObj);

                // Validate the document (async)
                try {
                    await itemDetails.validate();
                    // If validation passed, add to bulk operations
                    bulkOperations.push({
                        insertOne: {
                            document: itemDetailsObj
                        }
                    });

                    processedItems++;

                    // Send progress update after processing each item
                    const progress = Math.round((processedItems / totalItems) * 100);
                    parentPort.postMessage({
                        status: 'progress',
                        progress: progress,
                    });
                } catch (validationError) {
                    // If validation fails, log the error and skip this entry
                    console.error(`Validation failed for item ${elm.item_name}:`, validationError);
                    validationErrors.push({
                        item_name: elm.item_name,
                        errors: validationError.errors
                    });
                }
            } catch (err) {
                console.error("Error processing item:", elm, err);
                throw err;
            }
        }

        // Execute bulk insert if there are any operations to perform
        // if (bulkOperations.length > 0) {
        if (validationErrors.length === 0) {
            try {
                await veneer_inventory_items_model.bulkWrite(bulkOperations, { session });
                console.log("Bulk insert successfully completed.");
            } catch (err) {
                console.log("Error during bulk insert:", err);
                await veneer_inventory_invoice_model.deleteOne({ _id: invoiceId });
                throw err
            }
        } else {
            await veneer_inventory_invoice_model.deleteOne({ _id: invoiceId });
            console.log("No valid items to upload.");
        }

        // Handle validation errors if there are any
        if (validationErrors.length > 0) {
            console.error("Some items failed validation:", validationErrors);
            throw new Error("Item validation failed")
        }
        await session.commitTransaction();
        session.endSession();

        parentPort.postMessage({
            status: 'success',
            message: 'Bulk insert successfully completed.',
            validationErrors
        });
    } catch (error) {
        console.log(error)
        await session.abortTransaction();
        session.endSession();
        parentPort.postMessage({
            status: 'error',
            message: error.message,
        });
    }
});
