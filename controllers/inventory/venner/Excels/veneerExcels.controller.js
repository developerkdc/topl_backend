import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import {
  veneer_inventory_invoice_model,
  veneer_inventory_items_model,
} from '../../../../database/schema/inventory/venner/venner.schema.js';
import ApiError from '../../../../utils/errors/apiError.js';
import ItemNameModel from '../../../../database/schema/masters/itemName.schema.js';
import itemSubCategoryModel from '../../../../database/schema/masters/item.subcategory.schema.js';
import seriesModel from '../../../../database/schema/masters/series.schema.js';
import CutModel from '../../../../database/schema/masters/cut.schema.js';
import GradeModel from '../../../../database/schema/masters/grade.schema.js';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { emitProgressUpdate } from '../../../../socket.io.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const downloadVeneerExcelFormat = catchAsync(async (req, res, next) => {
  const destinationPath = `downloadFormat/veneer.xlsx`;

  const link = `${process.env.APP_URL}${destinationPath}`;
  return res.json(
    new ApiResponse(StatusCodes.OK, 'download format successfully...', link)
  );
});

export const importVeneerData = catchAsync(async (Req, res, next) => {});

export const BulkUploaddVeneerData = catchAsync(async (req, res, next) => {
  const file = req.file;
  if (!file || !file.path) {
    return res.status(400).json({
      result: [],
      status: false,
      message: 'No file uploaded or file path not found.',
    });
  }
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const workbook = XLSX.readFile(file.path);
    const invoice = workbook.Sheets[workbook.SheetNames[0]];
    const items = workbook.Sheets[workbook.SheetNames[1]];
    const otherDetails = JSON.parse(req.body?.finalData);
    const created_by = req.userDetails.id;

    const invoiceDetails = XLSX.utils.sheet_to_json(invoice);
    if (invoiceDetails.length === 0) {
      return res.status(400).json({
        result: [],
        status: false,
        message: 'No invoice found in the uploaded file.',
      });
    }
    const itemsDetails = XLSX.utils.sheet_to_json(items);
    if (itemsDetails.length === 0) {
      return res.status(400).json({
        result: [],
        status: false,
        message: 'No items found in the uploaded file.',
      });
    }

    const inward_sr_no = await veneer_inventory_invoice_model.aggregate([
      {
        $group: {
          _id: null,
          latest_inward_sr_no: { $max: '$inward_sr_no' },
        },
      },
    ]);

    const latest_inward_sr_no =
      inward_sr_no?.length > 0 && inward_sr_no?.[0]?.latest_inward_sr_no
        ? inward_sr_no?.[0]?.latest_inward_sr_no + 1
        : 1;

    const invoiceFinalData = {
      ...otherDetails,
      inward_sr_no: latest_inward_sr_no,
      invoice_Details: invoiceDetails[0],
      created_by: created_by,
    };
    const invoiceInstance = new veneer_inventory_invoice_model(
      invoiceFinalData
    );
    await invoiceInstance.validate();
    const invoiceDetailsData = await invoiceInstance.save();
    const invoiceId = invoiceDetailsData?._id;

    const bulkOperations = []; // Array to store bulk operations
    const validationErrors = []; // Array to store validation errors

    // Iterate over each item
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
              from: 'item_categories',
              localField: 'category',
              foreignField: '_id',
              pipeline: [{ $match: { category: 'VENEER' } }],
              as: 'categoryDetails',
            },
          },
          { $unwind: '$categoryDetails' },
          { $match: { item_name: item_name } },
          { $project: { item_name: 1 } },
        ]);
        const itemSubcategoryDetails = await itemSubCategoryModel.findOne(
          { name: item_sub_category_name },
          { name: 1 }
        );
        const cutNameDetails = await CutModel.findOne(
          { cut_name: cut_name },
          { cut_name: 1 }
        );
        const seriesNameDetails = await seriesModel.findOne(
          { series_name: series_name },
          { series_name: 1 }
        );
        const gradeNameDetails = await GradeModel.findOne(
          { grade_name: grades_name },
          { grade_name: 1 }
        );

        // Construct the object
        const itemDetailsObj = {
          ...elm,
          item_id: itemNameDetails?.[0]?._id,
          item_sub_category_id: itemSubcategoryDetails?._id,
          cut_id: cutNameDetails?._id,
          series_id: seriesNameDetails?._id,
          grades_id: gradeNameDetails?._id,
          invoice_id: invoiceId,
          created_by: created_by,
        };

        // Create a Mongoose document instance to validate the schema
        const itemDetails = new veneer_inventory_items_model(itemDetailsObj);

        // Validate the document (async)
        try {
          await itemDetails.validate();
          // If validation passed, add to bulk operations
          bulkOperations.push({
            insertOne: {
              document: itemDetailsObj,
            },
          });
        } catch (validationError) {
          // If validation fails, log the error and skip this entry
          console.error(
            `Validation failed for item ${elm.item_name}:`,
            validationError
          );
          validationErrors.push({
            item_name: elm.item_name,
            errors: validationError.errors,
          });
        }
      } catch (err) {
        console.error('Error processing item:', elm, err);
      }
    }

    // Execute bulk insert if there are any operations to perform
    if (bulkOperations.length > 0) {
      try {
        await veneer_inventory_items_model.bulkWrite(bulkOperations);
        console.log('Bulk insert successfully completed.');
      } catch (err) {
        console.error('Error during bulk insert:', err);
      }
    } else {
      console.log('No valid items to upload.');
    }

    // Handle validation errors if there are any
    if (validationErrors.length > 0) {
      console.error('Some items failed validation:', validationErrors);
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      result: [],
      status: true,
      message: 'Bulk insert successfully completed.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

export const BulkUploadVeneerData = (req, res, next) => {
  const file = req.file;
  const socketId = req.body.socketId;

  if (!file || !file.path) {
    return res.status(400).json({
      result: [],
      status: false,
      message: 'No file uploaded or file path not found.',
    });
  }
  const fileName = file?.filename;
  const worker = new Worker(path.resolve(__dirname, 'bulkUploadWorker.js'));

  worker.postMessage({
    file,
    otherDetails: JSON.parse(req.body.finalData),
    created_by: req.userDetails.id,
    reqBody: req.body,
  });

  worker.on('message', (message) => {
    if (message.status === 'progress') {
      emitProgressUpdate({
        fileName: fileName,
        socketId: socketId,
        progress: message?.progress,
        status: message?.status,
      });
    } else if (message.status === 'success') {
      emitProgressUpdate({
        fileName: fileName,
        socketId: socketId,
        status: message.status || null,
        success: {
          status: true,
          message: message?.message || null,
        },
        validationErrors: message?.validationErrors,
      });
    } else if (message.status === 'error') {
      console.log(message.message, 'error');
      emitProgressUpdate({
        fileName: fileName,
        socketId: socketId,
        status: message.status,
        error: {
          status: true,
          message: message.message,
        },
      });
    }
  });

  worker.on('error', (err) => {
    console.log(err, 'worker error');
    emitProgressUpdate({
      fileName: fileName,
      socketId: socketId,
      status: 'error',
      error: {
        status: true,
        message: err.message,
      },
    });
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Worker stopped with exit code ${code}`);
    }
  });

  return res.status(202).json({
    status: true,
    message: 'Bulk upload processing has started.',
  });
};
