import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../utils/date/date.js";

const GenerateReadySheetFormReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Ready Sheet Form Reports");
  // Add headers to the worksheet
  worksheet.columns = [
    { header: "Date", key: "created_at", width: 25 },
    { header: "Item Name", key: "item_name", width: 25 },
    { header: "Item Type", key: "item_code", width: 25 },
    { header: "Group No.", key: "group_no", width: 15 },
    {
      header: "No. of Pcs",
      key: "ready_sheet_form_no_of_pcs_available1",
      width: 15,
    },
    { header: "Length", key: "ready_sheet_form_length", width: 15 },
    { header: "Width", key: "ready_sheet_form_width", width: 15 },
    { header: "Ready Sheet form Sqm", key: "ready_sheet_form_sqm", width: 15 },
    {
      header: "Ready Sheetform Original Pcs",
      key: "ready_sheet_form_no_of_pcs_original",
      width: 15,
    },
    {
      header: "Ready Sheetform Available Pcs",
      key: "ready_sheet_form_no_of_pcs_available",
      width: 15,
    },
    {
      header: "Ready Sheetform Rejected Pcs",
      key: "ready_sheet_form_rejected_pcs",
      width: 15,
    },
    { header: "Pallet No. ", key: "ready_sheet_form_pallete_no", width: 15 },
    {
      header: "Physical Location ",
      key: "ready_sheet_form_physical_location",
      width: 15,
    },
  ];

  details.forEach((order) => {
    const row = worksheet.addRow({
      created_at: convDate(order.created_at),
      item_name:
        order.cutting_id[0].cutting_id[0].item_details.item_data[0].item_name,
      item_code:
        order.cutting_id[0].cutting_id[0].item_details.item_data[0].item_code,
      group_no: order.group_no,
      ready_sheet_form_no_of_pcs_available1:
        order.ready_sheet_form_no_of_pcs_available,
      ready_sheet_form_length: order.ready_sheet_form_length,
      ready_sheet_form_width: order.ready_sheet_form_width,
      ready_sheet_form_sqm: order.ready_sheet_form_sqm,
      ready_sheet_form_no_of_pcs_original:
        order.ready_sheet_form_no_of_pcs_original,
      ready_sheet_form_no_of_pcs_available:
        order.ready_sheet_form_no_of_pcs_available,
      ready_sheet_form_rejected_pcs: order.ready_sheet_form_rejected_pcs,
      ready_sheet_form_pallete_no: order.ready_sheet_form_pallete_no,
      ready_sheet_form_physical_location:
        order.ready_sheet_form_physical_location,
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: "left" };
    });
  });
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    "public/reports/ReadySheetFormReportExcel/readySheetFormReportExcel_report.xlsx";

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `readySheetFormReportExcel_report${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/ReadySheetFormReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateReadySheetFormReport };
