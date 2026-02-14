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

export const dispatch_invoice_pdf = catchAsync(async (req, res, next) => {
    const { type, id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST);
    }

    const action_map = {
        normal: {
            templateFileName: 'invoice_bill.hbs',
        },
        print: {
            templateFileName: 'invoice_bill_print.hbs',
        },
    };

    const selectedAction = action_map[type] || action_map.normal;

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
    const removalDate = removalDateTime ? moment(removalDateTime).format("DD-MM-YYYY") : null;
    const removalTime = removalDateTime ? moment(removalDateTime).format("HH:mm:ss") : null;
    // GROUP ITEMS LIKE THE IMAGE
    const groupedItems = {};

    (dispatchDetails.dispatch_items_details || []).forEach(item => {
        const labelMap = {
            "DRESSING_FACTORY": "VENEER (DRESSING FACTORY)",
            "GROUPING_FACTORY": "VENEER (GROUPING FACTORY)",
            "CROSSCUTTING": "LOG (CROSSCUTTING)",
            "FLITCHING_FACTORY": "FLITCH (FLITCHING FACTORY)",
        };
        const groupName = labelMap[item.product_category] || item.product_category || "Others";

        if (!groupedItems[groupName]) {
            groupedItems[groupName] = {
                group_name: groupName,
                hsn: item.hsn_number || "",
                items: []
            };
        }

        groupedItems[groupName].items.push({
            sales_item_name: item.alternate_sales_item_name || item.sales_item_name || item.item_name,
            size: `${item.length || "-"}x${item.width || item.diameter || "-"}`,
            quantity_items: item.no_of_sheets || item.no_of_leaves || item.number_of_rolls || item.quantity,
            total_sheets: item.no_of_sheets || item.no_of_leaves || item.number_of_rolls || item.quantity,
            sqm: Number(item.sqm ?? item.cbm ?? item.cmt ?? 0).toFixed(3),
            rate: item.rate,
            taxable_value: Number(item.amount).toFixed(2),
        });
    });

    const summaryMap = {};

    (dispatchDetails.dispatch_items_details || []).forEach(item => {

        const gst = item.gst_details || {};
        const labelMap = {
            "DRESSING_FACTORY": "VENEER (DRESSING FACTORY)",
            "GROUPING_FACTORY": "VENEER (GROUPING FACTORY)",
            "CROSSCUTTING": "LOG (CROSSCUTTING)",
            "FLITCHING_FACTORY": "FLITCH (FLITCHING FACTORY)",
            "OTHER_GOODS": "STORE",
        };
        const cat = labelMap[item.product_category] || item.product_category || "Others";

        if (!summaryMap[cat]) {
            summaryMap[cat] = {
                series: cat,
                items: 0,
                qty_total: 0,
                unit: item.calculate_unit,
                value: 0,
                discount: 0,
                taxable_value: 0,
                gst_rate: gst.gst_percentage || gst.igst_percentage || 0,
                cgst: 0,
                sgst: 0,
                igst: 0,
            };
        }
        const qty = Number(item.sqm ?? item.cbm ?? item.cmt ?? 0);
        const qty3 = Number(qty.toFixed(3));
        summaryMap[cat].items += Number(item.no_of_sheets || item.no_of_leaves || item.number_of_rolls || item.quantity || 0);
        summaryMap[cat].qty_total = Number(
            (Number(summaryMap[cat].qty_total) + qty3).toFixed(3)
        )
        summaryMap[cat].value += Number(item.amount || 0);
        summaryMap[cat].discount += Number(item.discount_value || 0);

        summaryMap[cat].taxable_value += Number(item.final_amount || 0);

        summaryMap[cat].cgst += Number(gst.cgst_amount || 0);
        summaryMap[cat].sgst += Number(gst.sgst_amount || 0);
        summaryMap[cat].igst += Number(gst.igst_amount || 0);
    });

    const summaryRows = Object.values(summaryMap).map(row => ({
        ...row,
        value: row.value.toFixed(2),
        discount: row.discount.toFixed(2),
        taxable_value: row.taxable_value.toFixed(2),
        cgst: row.cgst.toFixed(2),
        sgst: row.sgst.toFixed(2),
        igst: row.igst.toFixed(2),
    }));

    const insurance = dispatchDetails.insurance_details || {};
    const freight = dispatchDetails.freight_details || {};
    const other = dispatchDetails.other_amount_details || {};

    // INSURANCE ROW
    summaryRows.push({
        series: "Insurance",
        items: 0,
        qty_total: Number(0).toFixed(3),
        unit: "OTHER",

        value: Number(insurance.insurance_amount || 0).toFixed(2),
        discount: Number(0).toFixed(2),

        taxable_value: Number(insurance.insurance_amount || 0).toFixed(2),

        gst_rate: insurance.insurance_gst_rate || 18,

        cgst: Number(insurance.insurance_cgst_amt || 0).toFixed(2),
        sgst: Number(insurance.insurance_sgst_amt || 0).toFixed(2),
        igst: Number(insurance.insurance_igst_amt || 0).toFixed(2),
    });

    // FREIGHT ROW
    summaryRows.push({
        series: "Freight",
        items: 0,
        qty_total: Number(0).toFixed(3),
        unit: "OTHER",

        value: Number(freight.freight_amount || 0).toFixed(2),
        discount: Number(0).toFixed(2),

        taxable_value: Number(freight.freight_amount || 0).toFixed(2),

        gst_rate: freight.freight_gst_rate || 18,

        cgst: Number(freight.freight_cgst_amt || 0).toFixed(2),
        sgst: Number(freight.freight_sgst_amt || 0).toFixed(2),
        igst: Number(freight.freight_igst_amt || 0).toFixed(2),
    });

    // OTHER CHARGES ROW
    summaryRows.push({
        series: "Other Charges",
        items: 0,
        qty_total: Number(0).toFixed(3),
        unit: "OTHER",

        value: Number(other.other_amount || 0).toFixed(2),
        discount: Number(0).toFixed(2),

        taxable_value: Number(other.other_amount || 0).toFixed(2),

        gst_rate: other.other_gst_rate || 18,

        cgst: Number(other.other_cgst_amt || 0).toFixed(2),
        sgst: Number(other.other_sgst_amt || 0).toFixed(2),
        igst: Number(other.other_igst_amt || 0).toFixed(2),
    });


    // TOTALS (unchanged except rounding fields)
    const summaryTotals = {
        items: summaryRows.reduce((sum, r) => sum + Number(r.items || 0), 0),
        qty_total: summaryRows.reduce((sum, r) => sum + Number(r.qty_total || 0), 0),

        value: summaryRows.reduce((sum, r) => sum + Number(r.value || 0), 0),

        discount: Number(summaryRows.reduce((sum, r) => sum + Number(r.discount || 0), 0)).toFixed(2),
        taxable_value: Number(summaryRows.reduce((sum, r) => sum + Number(r.taxable_value || 0), 0)).toFixed(2),

        cgst: Number(summaryRows.reduce((sum, r) => sum + Number(r.cgst || 0), 0)).toFixed(2),
        sgst: Number(summaryRows.reduce((sum, r) => sum + Number(r.sgst || 0), 0)).toFixed(2),
        igst: Number(summaryRows.reduce((sum, r) => sum + Number(r.igst || 0), 0)).toFixed(2),
    };


    const pdfData = {
        headerUrl: "https://example.com/header.png", // your logo/header
        footerUrl: "https://example.com/footer.png", // QR code or footer image
        logoUrl: "https://example.com/topl_logo.png",
        transaction_is_regular: dispatchDetails.transaction_type === "REGULAR",
        customer_details: dispatchDetails.customer_details,
        dispatch_from: dispatchDetails.address,
        address: dispatchDetails.address,
        invoice_no: dispatchDetails.invoice_no,
        invoice_date_time: dispatchDetails.invoice_date_time ? moment(dispatchDetails.invoice_date_time).format("DD-MM-YYYY,HH:mm:ss") : "",
        invoice_date: dispatchDetails.invoice_date_time ? moment(dispatchDetails.invoice_date_time).format("DD-MM-YYYY") : "",
        removal_of_good_date_time: dispatchDetails.removal_of_good_date_time,
        removal_date: removalDate,
        goods_removal_time: removalTime,
        TOPLGSTIN: "24AAACT5636N1Z2",
        TOPLPAN: "AAACT5636N",
        TOPLMSME: "UDAYAM-GJ-18-564545",
        TOPLState: "GUJARAT(24)",
        vehicle_details: dispatchDetails.vehicle_details,
        vehicle_number: dispatchDetails.vehicle_details?.map(v => v.vehicle_number) || [],
        // item_summary: dispatchDetails.dispatch_items_details?.map(item => ({
        //     item_name: item.item_name,
        //     sales_item_name: item.sales_item_name,
        //     length: item.length,
        //     width: item.width,
        //     size: `${item.length} x ${item.width}`,
        //     sheets: item.sheets,
        //     sqm: item.sqm,
        //     rate: item.rate,
        //     taxable_value: item.final_row_amount,
        // })) || [],
        grouped_items: Object.values(groupedItems),
        summary_rows: summaryRows,
        summary_totals: summaryTotals,
        basic_amount: dispatchDetails.total_base_amount,
        base_amount_without_gst: dispatchDetails.base_amount_without_gst,
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
        packing_id: dispatchDetails.packing_done_ids?.map(p => p.packing_done_id) || [],
        packing_date: Array.isArray(dispatchDetails.packing_done_ids) ? dispatchDetails.packing_done_ids.map(p => p.packing_date ? moment(p.packing_date).format("DD-MM-YYYY") : "") : [],
        eway_bill_no: dispatchDetails.eway_bill_no,
        eway_bill_date: dispatchDetails.eway_bill_date,
    };


    const templatePath = path.join(
        __dirname,
        "..",
        "..",
        "views",
        "dispatch",
        selectedAction.templateFileName,
    );

    const pdfBuffer = await generatePDF({
        templateName: `${dispatchDetails?.invoice_no}_${dispatchDetails?.customer_details?.company_name}_${dispatchDetails?.invoice_date}`,
        templatePath,
        data: pdfData,
    });

    const sanitizeForFilename = (str = "") =>
        str.replace(/[\/\\:*?"<>|]/g, "-").trim();

    const safeInvoiceNo = sanitizeForFilename(dispatchDetails.invoice_no || "");
    const safeCompanyName = sanitizeForFilename(dispatchDetails.customer_details?.company_name || "");

    const fileName = `Invoice-${safeInvoiceNo}_${safeCompanyName}_${pdfData.invoice_date}.pdf`;

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Access-Control-Expose-Headers": "Content-Disposition",
        "Content-Length": pdfBuffer.length,
    });

    return res.status(StatusCodes.OK).end(pdfBuffer);
}); 