import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../../utils/date/date.js';

const GenerateTappingReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Tapping Reports');
  // Add headers to the worksheet
  worksheet.columns = [
    { header: 'Date', key: 'taping_done_date', width: 15 },
    { header: 'Group No.', key: 'group_no', width: 15 },
    { header: 'Item Name', key: 'item_name', width: 30 },
    { header: 'Item Type', key: 'item_code', width: 15 },
    { header: 'Length', key: 'tapping_length', width: 15 },
    { header: 'Width', key: 'tapping_width', width: 15 },
    { header: 'No. of Pcs', key: 'tapping_no_of_pcs', width: 15 },
    { header: 'Tapping Sqm', key: 'tapping_sqm', width: 15 },
    // { header: "Total Item Sqm", key: "cutting_sqm", width: 15 },
    // { header: "Grade ", key: "item_grade", width: 15 },
    { header: 'Tapping Remarks', key: 'tapping_remarks', width: 30 },
  ];

  details.forEach((order) => {
    // order.cutting_id[0].cutting_id.forEach((item) => {
    const row = worksheet.addRow({
      taping_done_date: convDate(order.taping_done_date),
      item_name:
        order.cutting_id[0].cutting_id[0].item_details.item_data[0].item_name,
      item_code:
        order.cutting_id[0].cutting_id[0].item_details.item_data[0].item_code,
      tapping_no_of_pcs: order.tapping_no_of_pcs,
      group_no: order.group_data.group_no,
      tapping_length: order.tapping_length,
      tapping_width: order.tapping_width,
      // item_grade:
      //   order.cutting_id[0].cutting_id[0].item_details.item_data[0]
      //     .item_grade,
      tapping_remarks: order.tapping_remarks,
      // cutting_sqm: item.item_details.cutting_sqm,
      tapping_sqm: order.tapping_sqm,
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: 'left' };
    });
    // });
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    'public/reports/Tapping/CreatedTappingReportExcel/tapping_report.xlsx';

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `tapping_report_${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Tapping/CreatedTappingReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateTappingReport };
