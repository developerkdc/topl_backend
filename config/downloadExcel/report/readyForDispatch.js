import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../utils/date/date.js";

const GenerateReadyForDispatchReport = async (details) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ready For Dispatch Reports");

    // Add headers to the worksheet
    const headers = [
        { header: "QC Date", key: "created_at", width: 15 },
        { header: "Group No", key: "group_no", width: 15 },
        { header: "Item Name", key: "item_name", width: 15 },
        { header: "Item Type", key: "item_code", width: 15 },
        { header: "Finishing Pcs", key: "finishing_no_of_peices", width: 15 },

        { header: "QC Length", key: "qc_length", width: 15 },
        { header: "QC Width", key: "qc_width", width: 15 },
        { header: "Available QC Pcs", key: "qc_no_of_pcs_available", width: 15 },
        { header: "QC Sqm", key: "qc_sqm", width: 15 },

        // { header: "Finishing Length", key: "finishing_length", width: 15 },
        // { header: "Finishing Width", key: "finishing_width", width: 15 },
        // { header: "Finishing Sqm", key: "finishing_sqm", width: 15 },

        // { header: "Pressing Length", key: "pressing_length", width: 15 },
        // { header: "Pressing Width", key: "pressing_width", width: 15 },
        // { header: "Pressing Pcs", key: "pressing_no_of_peices", width: 15 },
        // { header: "Pressing Sqm", key: "pressing_sqm", width: 15 },

        // { header: "Ready Sheet Length", key: "ready_sheet_form_length", width: 30 },
        // { header: "Ready Sheet Width", key: "ready_sheet_form_width", width: 15 },
        // { header: "Ready Sheet Pcs", key: "ready_sheet_form_approved_pcs", width: 15 },
        // { header: "Ready Sheet Sqm", key: "ready_sheet_form_sqm", width: 15 },
        // { header: "Ready Sheet Pallet No", key: "ready_sheet_form_pallete_no", width: 15 },
        // { header: "Ready Sheet Physical Location", key: "ready_sheet_form_physical_location", width: 15 },

        // { header: "Rate Per Sqm", key: "item_rate_per_sqm", width: 15 },
        // { header: "Log No", key: "item_log_no", width: 15 },
        // { header: "Bundle No", key: "item_bundle_no", width: 15 },
        // { header: "Cutting Length", key: "item_length", width: 15 },
        // { header: "Cutting Width", key: "item_width", width: 15 },
        // { header: "No. Of Pattas", key: "item_received_pattas", width: 15 },
        // { header: "Sqm", key: "item_received_sqm", width: 15 },
        // { header: "Natural", key: "item_received_quantities_natural", width: 15 },
        // { header: "Dyed", key: "item_received_quantities_dyed", width: 15 },
        // { header: "Smoked", key: "item_received_quantities_smoked", width: 15 },
        // { header: "Total", key: "item_received_quantities_total", width: 15 },
    ];

    worksheet.columns = headers.map((header) => {
        return {
            header: header.header.toUpperCase(), // Convert to uppercase
            key: header.key,
            width: header.width,
        };
    });

    details.forEach((dispatch) => {
        const itemData = dispatch?.cutting_details?.cutting_id?.[0]?.item_details?.item_data?.[0]
        const row = worksheet.addRow({
            created_at: convDate(dispatch?.created_at),
            group_no: dispatch?.group_no,
            item_name: itemData?.item_name,
            item_code: itemData?.item_code,
            qc_length: dispatch?.qc_length,
            qc_width: dispatch?.qc_width,
            qc_no_of_pcs_available: dispatch?.qc_no_of_pcs_available,
            qc_sqm: dispatch?.qc_sqm,

            // finishing_length: dispatch?.finishing_details?.finishing_length,
            // finishing_width: dispatch?.finishing_details?.finishing_width,
            finishing_no_of_peices: dispatch?.finishing_details?.finishing_no_of_pcs,
            // finishing_sqm: dispatch?.finishing_details?.finishing_sqm,

            // pressing_length: dispatch?.pressing_details?.pressing_length,
            // pressing_width: dispatch?.pressing_details?.pressing_width,
            // pressing_no_of_peices: dispatch?.pressing_details?.pressing_no_of_peices,
            // pressing_sqm: dispatch?.pressing_details?.pressing_sqm,

            // ready_sheet_form_length: dispatch?.ready_sheet_form_history_details?.ready_sheet_form_length,
            // ready_sheet_form_width: dispatch?.ready_sheet_form_history_details?.ready_sheet_form_width,
            // ready_sheet_form_approved_pcs: dispatch?.ready_sheet_form_history_details?.ready_sheet_form_approved_pcs,
            // ready_sheet_form_sqm: dispatch?.ready_sheet_form_history_details?.ready_sheet_form_sqm,
            // ready_sheet_form_pallete_no: dispatch?.ready_sheet_form_history_details?.ready_sheet_form_pallete_no,
            // ready_sheet_form_physical_location: dispatch?.ready_sheet_form_history_details?.ready_sheet_form_physical_location,

            // item_rate_per_sqm: itemData?.item_rate_per_sqm,
            // item_log_no: itemData?.item_log_no,
            // item_bundle_no: itemData?.item_bundle_no,
            // item_length: itemData?.item_length,
            // item_width: itemData?.item_width,
            // item_received_pattas: itemData?.item_received_pattas,
            // item_received_sqm: itemData?.item_received_sqm,
            // item_received_quantities_natural: itemData?.item_received_quantities?.natural,
            // item_received_quantities_dyed: itemData?.item_received_quantities?.dyed,
            // item_received_quantities_smoked: itemData?.item_received_quantities?.smoked,
            // item_received_quantities_total: itemData?.item_received_quantities?.total,
        });
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { horizontal: "left" };
        });
        // dispatch?.cutting_details?.cutting_id?.forEach((item) => {
        //     const itemData = item?.item_details?.[0]?.item_data?.[0]
        // })
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    // Generate a temporary file path
    const filePath = "public/reports/ReadyForDispatchReportExcel/ready_for_dispatch_report.xlsx";

    // Save the workbook to the file
    await workbook.xlsx.writeFile(filePath);

    // Generate a unique filename to avoid overwriting
    const timestamp = new Date().getTime();
    const downloadFileName = `ready_for_dispatch_report_${timestamp}.xlsx`;

    // Move the file to the desired folder
    const destinationPath = `public/reports/ReadyForDispatchReportExcel/${downloadFileName}`;
    await fs.rename(filePath, destinationPath);

    const downloadLink = `${process.env.APP_URL}${destinationPath}`;

    return downloadLink;
};

export { GenerateReadyForDispatchReport };
