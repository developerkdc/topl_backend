import path from "path";
import { fileURLToPath } from "url";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { generatePDF } from "../../../utils/generatePDF/generatePDFBuffer.js";
import { StatusCodes } from "../../../utils/constants.js";
import mongoose from "mongoose";
import ApiError from "../../../utils/errors/apiError.js";
import challan_done_model from "../../../database/schema/challan/challan_done/challan_done.schema.js";
import itemCategoryModel from "../../../database/schema/masters/item.category.schema.js";
import moment from "moment";
import { getIrnQrDataUrl } from "../../../utils/qrcode/getIrnQrDataUrl.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate e-Way Bill PDF for a challan.
 * Uses the same template as dispatch e-way bill (views/dispatch/eway.hbs).
 * Only generates when e-way bill exists; IRN QR/section shown only if IRN data is available.
 */
export const challan_ewaybill_pdf = catchAsync(async (req, res, next) => {
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
                from: "issue_for_challan_details",
                localField: "raw_material_items",
                foreignField: "_id",
                as: "issue_for_challan_item_details",
            },
        },
    ];

    const result = await challan_done_model.aggregate(pipeline);
    const challanDetails = result?.[0];

    if (!challanDetails) {
        throw new ApiError("Challan not found", StatusCodes.NOT_FOUND);
    }

    // Only generate PDF when e-way bill has been generated
    if (!challanDetails.eway_bill_no) {
        throw new ApiError(
            "E-way bill has not been generated for this challan",
            StatusCodes.BAD_REQUEST
        );
    }

    const ewayBillDate = challanDetails.eway_bill_date
        ? moment(challanDetails.eway_bill_date).format("DD/MM/YYYY h:mm:ss A")
        : "-";
    const ewayBillValidUpto = challanDetails.eway_bill_valid_upto
        ? moment(challanDetails.eway_bill_valid_upto).format("DD/MM/YYYY h:mm:ss A")
        : "-";
    const docDate = challanDetails.challan_date
        ? moment(challanDetails.challan_date).format("DD/MM/YYYY")
        : "-";
    // Challan schema has no acknowledgement_date; use "-" when no IRN
    const ackDate = "-";

    // IRN QR: challan schema has no qr_code_link; only show QR if we had a way to get IRN QR content (e.g. future field). For now, no QR for challan.
    const irnQrLink = challanDetails.qr_code_link?.find((l) => l?.name === "irn_number");
    const irnQrContent =
        irnQrLink?.url && challanDetails.irn_number ? irnQrLink.url : null;
    const irnQrImageUrl = getIrnQrDataUrl(irnQrContent) || undefined;

    // Reason for transportation: challan is typically Job Work (subSupplyType 4)
    const reasonForTransport = "Job Work";
    const transporterDisplay = [
        challanDetails.transporter_details?.name,
        challanDetails.transporter_details?.gst_no,
    ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
        challanDetails.transporter_details?.name ||
        challanDetails.transporter_name ||
        "-";

    // Transaction type display (e.g. "REGULAR" -> "Regular")
    const transactionTypeDisplay = challanDetails.transaction_type
        ? challanDetails.transaction_type.charAt(0).toUpperCase() +
          challanDetails.transaction_type.slice(1).toLowerCase()
        : "-";

    // HSN / items: build from raw_material and category (same as generate_challan_ewaybill)
    let dispatch_items_details = [];
    const itemCategory = await itemCategoryModel.findOne({
        category: challanDetails?.raw_material?.toUpperCase(),
    });
    const hsnCode = itemCategory?.product_hsn_code || "-";
    const itemName = challanDetails.raw_material || "Challan";
    dispatch_items_details = [{ hsn_number: hsnCode, item_name: itemName }];

    // Normalise customer_details for template (company_name used in eway.hbs)
    const customer_details = {
        ...challanDetails.customer_details,
        company_name:
            challanDetails.customer_details?.legal_name ||
            challanDetails.customer_details?.company_name ||
            challanDetails.customer_name ||
            "-",
        gst_number:
            challanDetails.customer_details?.gst_number ||
            challanDetails.address?.bill_to_address?.gst_number ||
            "-",
    };

    const data = {
        ...challanDetails,
        address: challanDetails.address || {},
        customer_details,
        invoice_no: challanDetails.challan_no,
        formatted_eway_bill_date: ewayBillDate,
        formatted_eway_bill_valid_upto: ewayBillValidUpto,
        formatted_ack_date: ackDate,
        formatted_doc_date: docDate,
        irnQrImageUrl,
        reason_for_transport: reasonForTransport,
        transporter_display: transporterDisplay,
        transaction_type_display: transactionTypeDisplay,
        final_total_amount: challanDetails.grand_total ?? challanDetails.total_amount_with_gst ?? "-",
        dispatch_items_details,
    };

    const templatePath = path.join(__dirname, "../../../views/dispatch/eway.hbs");

    try {
        const pdfBuffer = await generatePDF({
            templateName: "dispatch/eway",
            templatePath,
            data,
        });

        const safeChallanNo = (challanDetails.challan_no || "challan")
            .replace(/[^a-zA-Z0-9-_]/g, "_");

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="ewaybill_challan_${safeChallanNo}.pdf"`,
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Content-Length": pdfBuffer.length,
        });

        return res.status(StatusCodes.OK).end(pdfBuffer);
    } catch (error) {
        throw new ApiError(
            "Failed to generate PDF: " + error.message,
            StatusCodes.INTERNAL_SERVER_ERROR
        );
    }
});
