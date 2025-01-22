import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../../utils/date/date.js';

const GenerateGroupingHistoryNormalReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Group History Normal Reports');

  // Add headers to the worksheet
  const headers = [
    { header: 'Date', key: 'created_at', width: 15 },
    { header: 'Item Name', key: 'item_name', width: 25 },
    { header: 'Group No.', key: 'group_no', width: 15 },
    { header: 'Item Type', key: 'item_code', width: 25 },
    { header: 'Group Length', key: 'group_length', width: 15 },
    { header: 'Group Width', key: 'group_width', width: 15 },
    { header: 'No. of Pcs', key: 'group_pcs', width: 15 },
    {
      header: 'Available Pattas.',
      key: 'group_no_of_pattas_available',
      width: 15,
    },
    { header: 'Group Sqm', key: 'group_sqm_available', width: 15 },
    { header: 'Total Item Sqm', key: 'total_item_sqm_original', width: 15 },
    {
      header: 'Total item SQM Available ',
      key: 'total_item_sqm_available',
      width: 20,
    },

    { header: 'Grade ', key: 'group_grade', width: 15 },
    { header: 'Orientation', key: 'orientation', width: 15 },
    { header: 'Formation type ', key: 'book_type', width: 20 },
    { header: 'Pallet No. ', key: 'group_pallete_no', width: 15 },
    { header: 'Physical Location ', key: 'group_physical_location', width: 20 },
  ];
  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(),
      key: header.key,
      width: header.width,
    };
  });
  details.forEach((order) => {
    // order.cutting_item_details.forEach((item) => {
    const row = worksheet.addRow({
      created_at: convDate(order.created_at),
      item_name: order.cutting_item_details[0].item_name,
      item_code: order.cutting_item_details[0].item_code,
      group_no: order.group_id.group_no,
      group_pcs: order.group_id.group_pcs,
      group_no_of_pattas_available: order.group_id.group_no_of_pattas_available,
      group_length: order.group_id.group_length,
      group_width: order.group_id.group_width,
      group_sqm_available: order.group_id.group_sqm_available,
      total_item_sqm_original: order.group_id.total_item_sqm_original,
      total_item_sqm_available: order.group_id.total_item_sqm_available,
      group_pallete_no: order.group_id.group_pallete_no,
      group_physical_location: order.group_id.group_physical_location,
      group_grade: order.group_id.group_grade,
      orientation: order.group_id.orientation,
      book_type: order.group_id.book_type,
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: 'left' };
    });
    // });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    'public/reports/Group/GroupHistoryNormalReportExcel/group_history_normal_report.xlsx';

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `group_history_normal_report${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Group/GroupHistoryNormalReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateGroupingHistoryNormalReport };
