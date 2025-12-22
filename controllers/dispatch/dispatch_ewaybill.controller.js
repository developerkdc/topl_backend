import path from "path";
import catchAsync from "../../utils/errors/catchAsync.js";
import { generatePDF } from "../../utils/generatePDF/generatePDFBuffer.js";
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { StatusCodes } from "../../utils/constants.js";
import mongoose from "mongoose";
import ApiError from "../../utils/errors/apiError.js";
import dispatchModel from "../../database/schema/dispatch/dispatch.schema.js";
import moment from "moment";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dispatch_ewaybill_pdf = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST);
    }

    const pipeline = [
        {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(id),
            },
        },
        {
            $lookup: {
                from: "dispatch_items",
                localField: "_id",
                foreignField: "dispatch_id",
                as: "dispatch_items_details",
            },
        },
    ];

    const result = await dispatchModel.aggregate(pipeline);
    const dispatchDetails = result?.[0];

    if (!dispatchDetails) {
        throw new ApiError("Dispatch not found", StatusCodes.NOT_FOUND);
    }

    const removalDateTime = dispatchDetails.removal_of_good_date_time;
    const removalDate = removalDateTime ? moment(removalDateTime).format("DD/MM/YYYY") : "-";
    const removalTime = removalDateTime ? moment(removalDateTime).format("h:mm:ss A") : "";

    const ewayBillDate = dispatchDetails.eway_bill_date ? moment(dispatchDetails.eway_bill_date).format("DD/MM/YYYY h:mm:ss A") : "-";
    const ackDate = dispatchDetails.acknowledgement_date ? moment(dispatchDetails.acknowledgement_date).format("DD/MM/YYYY h:mm:ss A") : "-";
    const docDate = dispatchDetails.invoice_date_time ? moment(dispatchDetails.invoice_date_time).format("DD/MM/YYYY") : "-";

    // Combine data
    const data = {
        ...dispatchDetails,
        removalDate,
        removalTime,
        formatted_eway_bill_date: ewayBillDate,
        formatted_ack_date: ackDate,
        formatted_doc_date: docDate,
    };

    const templatePath = path.join(__dirname, "../../views/dispatch/eway.hbs");

    try {
        const pdfBuffer = await generatePDF({
            templateName: "dispatch/eway",
            templatePath,
            data: data,
        });

        // Sanitize invoice number for filename (remove slashes, replace spaces)
        const safeInvoiceNo = (dispatchDetails.invoice_no || 'document').replace(/[^a-zA-Z0-9-_]/g, '_');

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="ewaybill_${safeInvoiceNo}.pdf"`,
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Content-Length": pdfBuffer.length,
        });

        return res.status(StatusCodes.OK).end(pdfBuffer);
    } catch (error) {
        throw new ApiError("Failed to generate PDF: " + error.message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
})