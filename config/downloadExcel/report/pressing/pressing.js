import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../../utils/date/date.js";

const GeneratePressingReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Pressing Reports");

  // Add headers to the worksheet

  worksheet.columns = [
    { header: "Date", key: "created_at", width: 15 },
    { header: "Item Name", key: "item_name", width: 30 },
    { header: "Item Type", key: "item_code", width: 15 },
    { header: "Group No.", key: "group_no", width: 15 },
    { header: "No. of Pcs", key: "pressing_no_of_peices", width: 15 },
    { header: "Length", key: "pressing_length", width: 15 },
    { header: "Width", key: "pressing_width", width: 15 },
    { header: "Pressing Sqm", key: "pressing_sqm", width: 15 },
    { header: "Grade ", key: "item_grade", width: 15 },
    { header: "Pressing Remarks", key: "pressing_remarks", width: 30 },
    { header: "Consumed Item", key: "consumed_item_name", width: 30 },
    { header: "Consumed Quantity", key: "consumed_quantity", width: 30 },
  ];

  details.forEach((order) => {
    const row = worksheet.addRow({
      created_at: convDate(order.created_at),
      item_name:
        order.cutting_details.cutting_id[0].item_details.item_data[0].item_name,
      item_code:
        order.cutting_details.cutting_id[0].item_details.item_data[0].item_code,
      pressing_no_of_peices: order.pressing_no_of_peices,
      group_no: order.group_no,
      pressing_length: order.pressing_length,
      pressing_width: order.pressing_width,
      pressing_sqm: order.pressing_sqm,
      consumed_quantity: order.consumed_quantity,
      consumed_item_name: order.consumed_item_name,
      item_grade:
        order.cutting_details.cutting_id[0].item_details.item_data[0]
          .item_grade,
      pressing_remarks: order.pressing_remarks,
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: "left" };
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    "public/reports/Pressing/PressingReportExcel/pressing_report_.xlsx";

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `pressing_report_${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Pressing/PressingReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GeneratePressingReport };
