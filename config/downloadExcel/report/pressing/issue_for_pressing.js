import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../../utils/date/date.js";

const GenerateIssuePressingReport = async (details) => {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Issue For Pressing Reports");

    // Add headers to the worksheet
    const headers = [
        { header: "Issued Date", key: "created_at", width: 15 },
        { header: "Group No", key: "group_no", width: 15 },
        { header: "Item Name", key: "item_name", width: 30 },
        { header: "Item Type", key: "item_code", width: 15 },
        { header: "Ready Sheet Length", key: "ready_sheet_form_length", width: 15 },
        { header: "Ready Sheet Width", key: "ready_sheet_form_width", width: 15 },
        { header: "Ready Sheet Pcs", key: "ready_sheet_form_approved_pcs", width: 15 },
        { header: "Ready Sheet Sqm", key: "ready_sheet_form_sqm", width: 15 },
        { header: "Ready Sheet Pallet No", key: "ready_sheet_form_pallete_no", width: 15 },
        { header: "Ready Sheet Physical Location", key: "ready_sheet_form_physical_location", width: 15 },
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

    details.forEach((pressing) => {
        const itemData = pressing?.cutting_details?.cutting_id?.[0]?.item_details?.item_data?.[0]
        const row = worksheet.addRow({
            created_at:convDate(pressing?.created_at),
            group_no:pressing?.ready_sheet_form_history_details?.group_no,
            item_name:itemData?.item_name,
            item_code:itemData?.item_code,
            ready_sheet_form_length:pressing?.ready_sheet_form_history_details?.ready_sheet_form_length,
            ready_sheet_form_width:pressing?.ready_sheet_form_history_details?.ready_sheet_form_width,
            ready_sheet_form_approved_pcs:pressing?.ready_sheet_form_history_details?.ready_sheet_form_approved_pcs,
            ready_sheet_form_sqm:pressing?.ready_sheet_form_history_details?.ready_sheet_form_sqm,
            ready_sheet_form_pallete_no:pressing?.ready_sheet_form_history_details?.ready_sheet_form_pallete_no,
            ready_sheet_form_physical_location:pressing?.ready_sheet_form_history_details?.ready_sheet_form_physical_location,
            // item_rate_per_sqm:itemData?.item_rate_per_sqm,
            // item_log_no:itemData?.item_log_no,
            // item_bundle_no:itemData?.item_bundle_no,
            // item_length:itemData?.item_length,
            // item_width:itemData?.item_width,
            // item_received_pattas:itemData?.item_received_pattas,
            // item_received_sqm:itemData?.item_received_sqm,
            // item_received_quantities_natural:itemData?.item_received_quantities?.natural,
            // item_received_quantities_dyed:itemData?.item_received_quantities?.dyed,
            // item_received_quantities_smoked:itemData?.item_received_quantities?.smoked,
            // item_received_quantities_total:itemData?.item_received_quantities?.total,
        });
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { horizontal: "left" };
        });
        // pressing?.cutting_details?.cutting_id?.forEach((item) => {
        //     const itemData = item?.item_details?.item_data?.[0]
        // })
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    // Generate a temporary file path
    const filePath = "public/reports/Pressing/IssueForPressingReportExcel/issue_for_pressing_report.xlsx";

    // Save the workbook to the file
    await workbook.xlsx.writeFile(filePath);

    // Generate a unique filename to avoid overwriting
    const timestamp = new Date().getTime();
    const downloadFileName = `issue_for_pressing_report_${timestamp}.xlsx`;

    // Move the file to the desired folder
    const destinationPath = `public/reports/Pressing/IssueForPressingReportExcel/${downloadFileName}`;
    await fs.rename(filePath, destinationPath);

    const downloadLink = `${process.env.APP_URL}${destinationPath}`;

    return downloadLink;
};

export { GenerateIssuePressingReport };
