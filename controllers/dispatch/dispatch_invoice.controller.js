import path from "path";
import catchAsync from "../../utils/errors/catchAsync.js";
import { generatePDF } from "../../utils/generatePDF/generatePDFBuffer.js";
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { StatusCodes } from "../../utils/constants.js";
import mongoose from "mongoose";

import ApiError from "../../utils/errors/apiError.js";
import dispatchModel from "../../database/schema/dispatch/dispatch.schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dispatch_invoice_pdf = catchAsync(async (req, res, next) => {
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

    const pdfData = {
        headerUrl: "https://example.com/header.png", // your logo/header
        footerUrl: "https://example.com/footer.png", // QR code or footer image
        customer_details: dispatchDetails.customer_details,
        address: dispatchDetails.address,
        invoice_no: dispatchDetails.invoice_no,
        invoice_date_time: dispatchDetails.invoice_date_time,
        removal_of_good_date_time: dispatchDetails.removal_of_good_date_time,
        goods_removal_time: dispatchDetails.goods_removal_time || "", // if separate
        vehicle_details: dispatchDetails.vehicle_details,
        item_summary: dispatchDetails.dispatch_items_details?.map(item => ({
            item_name: item.item_name,
            length: item.length,
            width: item.width,
            size: `${item.length} x ${item.width}`,
            sheets: item.sheets,
            sqm: item.sqm,
            rate: item.rate,
            taxable_value: item.taxable_value,
        })) || [],
        basic_amount: dispatchDetails.total_base_amount,
        insurance: dispatchDetails.insurance_amount,
        freight: dispatchDetails.freight_amount,
        total: dispatchDetails.total_amount_with_expenses,
        igst: dispatchDetails.gst_details?.igst_amount,
        grand_total: dispatchDetails.final_total_amount,
        bank_details: dispatchDetails.bank_details || "",
        irn: dispatchDetails.irn_number || "",
        additional_remarks: dispatchDetails.remark || "",
        msme_number: dispatchDetails.customer_details?.msme_number || "",
        msme_type: dispatchDetails.customer_details?.msme_type || "",
        packing_id: dispatchDetails.packing_done_ids?.[0]?.packing_done_id || "",
        packing_date: dispatchDetails.invoice_date_time, // or actual packing date
        eway_bill_no: dispatchDetails.eway_bill_no,
        eway_bill_date: dispatchDetails.eway_bill_date,
    };


    const templatePath = path.join(
        __dirname,
        "..",
        "..",
        "views",
        "dispatch/invoice_bill.hbs"
    );

    const pdfBuffer = await generatePDF({
        templateName: "Invoice_bill",
        templatePath,
        data: pdfData,
    });

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Invoice-${id}.pdf`,
        "Content-Length": pdfBuffer.length,
    });

    return res.status(StatusCodes.OK).end(pdfBuffer);
});