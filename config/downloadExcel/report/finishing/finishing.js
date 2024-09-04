import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../../utils/date/date.js";

const GenerateFinishingReport = async (details) => {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Finishing Reports");

  // Add headers to the worksheet

  worksheet.columns = [
    { header: "Date", key: "created_at", width: 15 },
    { header: "Item Name", key: "item_name", width: 30 },
    { header: "Item Type", key: "item_code", width: 15 },
    { header: "Group No.", key: "group_no", width: 15 },
    { header: "No. of Pcs", key: "finishing_no_of_pcs", width: 15 },
    { header: "Length", key: "finishing_length", width: 15 },
    { header: "Width", key: "finishing_width", width: 15 },
    { header: "Finishing Sqm", key: "finishing_sqm", width: 15 },
    { header: "Finishing Remarks", key: "finishing_remarks", width: 30 },
    { header: "Status", key: "status", width: 30 },
  ];

  details.forEach((order) => {


    const row = worksheet.addRow({
      created_at: convDate(order.created_at),
      item_name:
        order.cutting_details.cutting_id[0].item_details.item_data[0].item_name,
      item_code:
        order.cutting_details.cutting_id[0].item_details.item_data[0].item_code,
      finishing_no_of_pcs: order.finishing_no_of_pcs,
      group_no: order.group_no,
      finishing_length: order.finishing_length,
      finishing_width: order.finishing_width,
      item_grade:
        order.cutting_details.cutting_id[0].item_details.item_data[0]
          .item_grade,
      finishing_remarks: order.finishing_remarks,
      finishing_sqm: order.finishing_sqm,
      status: order.status === 'pending' ? 'qc done' : order.status, 
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
    "public/reports/Finishing/FinishingReportExcel/finishing_report_.xlsx";

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `finishing_report_${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Finishing/FinishingReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateFinishingReport };
