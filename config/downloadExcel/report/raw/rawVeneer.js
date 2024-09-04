import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../../utils/date/date.js";

const GenerateRawReport = async (details) => {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Raw Veneer Stock Reports");
  // Add headers to the worksheet
  const headers = [
    { header: "DATE", key: "date_of_inward", width: 15 },
    { header: "Supplier Name", key: "supplier_name", width: 15 },
    { header: "invoice no", key: "invoice_no", width: 15 },
    { header: "ITEM NAME", key: "item_name", width: 30 },
    { header: "ITEM TYPE", key: "item_code", width: 15 },
    { header: "LOG NO", key: "item_log_no", width: 15 },
    { header: "B.NO", key: "item_bundle_no", width: 15 },
    { header: "L", key: "item_length", width: 15 },
    { header: "W", key: "item_width", width: 15 },
    { header: "PCS", key: "item_available_pattas", width: 15 },
    { header: "SQM", key: "item_available_sqm", width: 15 },
    { header: "Rate per Sqm", key: "item_rate_per_sqm", width: 15 },
    { header: "PALLET NO", key: "item_pallete_no", width: 20 },
    { header: "PALLET Location", key: "item_physical_location", width: 20 },
    { header: "Status", key: "status", width: 20 },
    { header: "REMARK", key: "item_remark", width: 20 },
    { header: "TOTAL VALUE", key: "total_value", width: 15 },
    { header: "currency ", key: "currency", width: 15 },
    { header: "conversion rate ", key: "conversion_rate", width: 15 },
    { header: "Rate per Sqm for currency", key: "item_rate_per_sqm_for_currency", width: 15 },
  ];
  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(), // Convert to uppercase
      key: header.key,
      width: header.width,
    };
  });

  details.forEach((order) => {
    const row = worksheet.addRow({
      date_of_inward: convDate(order.date_of_inward),
      item_name: order.item_name,
      item_code: order.item_code,
      item_log_no: order.item_log_no,
      item_bundle_no: order.item_bundle_no,
      item_length: order.item_length,
      item_width: order.item_width,
      item_width: order.item_width,
      item_available_sqm: parseFloat(order.item_available_sqm).toFixed(2),
      item_pallete_no: order.item_pallete_no,
      item_available_pattas: order.item_available_pattas,
      item_remark: order.item_remark,
      invoice_no: order.invoice_no,
      supplier_name: order.supplier_details.supplier_name,
      item_physical_location: order.item_physical_location,
      item_rate_per_sqm: order.item_rate_per_sqm,
      status: order.status,
      conversion_rate: order.conversion_rate,
      item_rate_per_sqm_for_currency: order.item_rate_per_sqm_for_currency,
      currency: order.currency,
      total_value: parseFloat(
        order.item_rate_per_sqm * order.item_available_sqm
      ).toFixed(2),
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: "left" };
    });
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  // Generate a temporary file path 

  const filePath = "public/reports/Raw/RawReportExcel/raw_report.xlsx";

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `Raw_Veneer_Stock${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Raw/RawReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateRawReport };
