import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../../utils/date/date.js';

const GenerateIssueCuttingReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Issue For Cutting Reports');

  // Add headers to the worksheet
  const headers = [
    { header: 'Cutting Issued Date', key: 'created_at', width: 15 },
    { header: 'Group No', key: 'group_no', width: 15 },
    { header: 'Item Name', key: 'item_name', width: 15 },
    { header: 'Item Type', key: 'item_code', width: 15 },

    { header: 'Group Length', key: 'group_length', width: 15 },
    { header: 'Group Width', key: 'group_width', width: 15 },
    { header: 'No of Pcs', key: 'group_no_of_peices', width: 15 },
    { header: 'Issued Sqm', key: 'group_sqm', width: 15 },
    { header: 'Grade', key: 'grade', width: 15 },
    { header: 'Pallet No', key: 'pallet_no', width: 15 },
    { header: 'Physical Location', key: 'physical_location', width: 15 },
    { header: 'Book Type', key: 'book_type', width: 15 },

    { header: 'Rate Per Sqm', key: 'item_rate_per_sqm', width: 15 },
    { header: 'Log No', key: 'item_log_no', width: 15 },
    { header: 'Cutting Quantity', key: 'cutting_quantity', width: 15 },
    // { header: "Natural", key: "cutting_quantity_natural", width: 15 },
    // { header: "Natural", key: "cutting_quantity_natural", width: 15 },
    // { header: "Dyed", key: "cutting_quantity_dyed", width: 15 },
    // { header: "Smoked", key: "cutting_quantity_smoked", width: 15 },
    // { header: "Total", key: "cutting_quantity_total", width: 15 },
  ];

  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(), // Convert to uppercase
      key: header.key,
      width: header.width,
    };
  });

  details.forEach((cutting) => {
    cutting?.cutting_item_details?.forEach((itemData) => {
      const row = worksheet.addRow({
        created_at: convDate(cutting?.created_at),
        group_no: cutting?.group_id?.group_no,
        item_name: itemData?.item_name,
        item_code: itemData?.item_code,

        group_length: cutting?.group_id?.group_length,
        group_width: cutting?.group_id?.group_width,
        group_no_of_peices: cutting?.group_id?.group_pcs,
        group_sqm: cutting?.cutting_issued_sqm,
        grade: cutting?.group_id?.group_grade,
        pallet_no: cutting?.group_history_id?.group_id?.group_pallete_no,
        physical_location:
          cutting?.group_history_id?.group_id?.group_physical_location,
        book_type: cutting?.group_id?.book_type,

        item_rate_per_sqm: itemData?.item_rate_per_sqm,
        item_log_no: itemData?.item_log_no,
        item_bundle_no: itemData?.item_bundle_no,
        cutting_quantity: itemData?.cutting_quantity,
        // cutting_quantity_natural: itemData?.cutting_quantity?.natural,
        // cutting_quantity_dyed: itemData?.cutting_quantity?.dyed,
        // cutting_quantity_smoked: itemData?.cutting_quantity?.smoked,
        // cutting_quantity_total: itemData?.cutting_quantity?.total,
      });
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: 'left' };
      });
    });
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    'public/reports/Cutting/IssueForCuttingReportExcel/issue_for_cutting_report.xlsx';

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `issue_for_cutting_report_${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Cutting/IssueForCuttingReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateIssueCuttingReport };
