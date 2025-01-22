import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../../utils/date/date.js';

const GenerateGroupingHistoryReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Group History Reports');

  const headers = [
    { header: 'Date', key: 'created_at', width: 25 },
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
    { header: 'Total Item Sqm', key: 'total_item_sqm_available', width: 15 },
    { header: 'Grade ', key: 'group_grade', width: 15 },
    { header: 'Orientation', key: 'orientation', width: 15 },
    { header: 'Formation type ', key: 'book_type', width: 15 },
    { header: 'Pallet No. ', key: 'group_pallete_no', width: 15 },
    { header: 'Physical Location ', key: 'group_physical_location', width: 15 },
    { header: 'Rate Per Sqm', key: 'item_rate_per_sqm', width: 15 },
    { header: 'Log No', key: 'log_no', width: 15 },
    { header: 'Bundle No', key: 'bundle_no', width: 15 },
    {
      header: 'Item Available pattas',
      key: 'item_available_pattas',
      width: 15,
    },
    // { header: "Avl Dyed", key: "avl_dyed", width: 15 },
    // { header: "Avl Smoked", key: "avl_smoked", width: 15 },
    // { header: "Total", key: "total", width: 15 },
  ];
  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(),
      key: header.key,
      width: header.width,
    };
  });
  details.forEach((order) => {
    order.cutting_item_details.forEach((item) => {
      const row = worksheet.addRow({
        created_at: convDate(order.created_at),
        item_name: item.item_name,
        item_code: item.item_code,
        group_no: order.group_id.group_no,
        group_pcs: order.group_id.group_pcs,
        group_no_of_pattas_available:
          order.group_id.group_no_of_pattas_available,
        group_length: order.group_id.group_length,
        group_width: order.group_id.group_width,
        group_sqm_available: order.group_id.group_sqm_available,
        total_item_sqm_available: order.group_id.total_item_sqm_available,
        group_pallete_no: order.group_id.group_pallete_no,
        group_physical_location: order.group_id.group_physical_location,
        group_grade: order.group_id.group_grade,
        orientation: order.group_id.orientation,
        book_type: order.group_id.book_type,
        log_no: item?.item_log_no,
        bundle_no: item?.item_bundle_no,
        item_rate_per_sqm: item?.item_rate_per_sqm,
        item_available_pattas: item?.item_available_pattas,
        // avl_dyed: item?.cutting_quantity?.dyed,
        // avl_smoked: item?.cutting_quantity?.smoked,
        // total: item?.cutting_quantity?.total,
      });
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: 'left' };
      });
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    'public/reports/Group/GroupHistoryReportExcel/group_history_report.xlsx';

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `group_history_report${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Group/GroupHistoryReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateGroupingHistoryReport };
