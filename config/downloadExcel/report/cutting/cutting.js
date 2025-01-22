import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../../utils/date/date.js';

const GenerateCuttingReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cutting Reports');

  // Add headers to the worksheet
  const headers = [
    { header: 'Date of Cutting', key: 'created_at', width: 15 },
    { header: 'Group No', key: 'group_no', width: 15 },
    { header: 'Item Name', key: 'item_name', width: 15 },
    { header: 'Item Type', key: 'item_code', width: 15 },

    { header: 'Group Length', key: 'group_length', width: 15 },
    { header: 'Group Width', key: 'group_width', width: 15 },
    {
      header: 'Group No of Pattas',
      key: 'group_no_of_pattas_available',
      width: 15,
    },
    { header: 'No of Pcs', key: 'group_no_of_peices', width: 15 },
    { header: 'Group Sqm', key: 'group_sqm_available', width: 15 },
    {
      header: 'Total Item Sqm Avl',
      key: 'total_item_sqm_available',
      width: 15,
    },
    { header: 'Grade', key: 'group_grade', width: 15 },
    { header: 'Orientation', key: 'orientation', width: 15 },
    { header: 'Book Type', key: 'book_type', width: 15 },
    { header: 'Group Pallet No', key: 'group_pallete_no', width: 15 },
    { header: 'Physical Location', key: 'group_physical_location', width: 15 },

    { header: 'Rate Per Sqm', key: 'item_rate_per_sqm', width: 15 },
    { header: 'Log No', key: 'item_log_no', width: 15 },
    { header: 'Bundle No', key: 'item_bundle_no', width: 15 },
    { header: 'Cutting Length', key: 'cutting_length', width: 15 },
    { header: 'Cutting Width', key: 'cutting_width', width: 15 },
    { header: 'Cutting No. Of Pattas', key: 'cutting_no_of_pattas', width: 15 },
    { header: 'Sqm', key: 'cutting_sqm', width: 15 },
    { header: 'Cutting Quantity', key: 'cutting_quantity', width: 20 },
    // { header: "Dyed", key: "cutting_quantity_dyed", width: 15 },
    // { header: "Smoked", key: "cutting_quantity_smoked", width: 15 },
    // { header: "Total", key: "cutting_quantity_total", width: 15 },
    { header: 'Remark', key: 'remark', width: 30 },
  ];

  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(), // Convert to uppercase
      key: header.key,
      width: header.width,
    };
  });

  details.forEach((cutting) => {
    cutting?.group_history_id?.cutting_item_details?.forEach(
      (itemData, index) => {
        const row = worksheet.addRow({
          created_at: convDate(cutting?.created_at),
          group_no: cutting?.group_history_id?.group_id?.group_no,
          item_name: itemData?.item_name,
          item_code: itemData?.item_code,

          group_length: cutting?.group_history_id?.group_id?.group_length,
          group_width: cutting?.group_history_id?.group_id?.group_width,
          group_no_of_pattas_available:
            cutting?.group_history_id?.group_id?.group_no_of_pattas_available,
          group_no_of_peices: cutting?.group_history_id?.group_id?.group_pcs,
          group_sqm_available:
            cutting?.group_history_id?.group_id?.group_sqm_available,
          total_item_sqm_available:
            cutting?.group_history_id?.group_id?.total_item_sqm_available,
          group_grade: cutting?.group_history_id?.group_id?.group_grade,
          orientation: cutting?.group_history_id?.group_id?.orientation,
          book_type: cutting?.group_history_id?.group_id?.book_type,
          group_pallete_no:
            cutting?.group_history_id?.group_id?.group_pallete_no,
          group_physical_location:
            cutting?.group_history_id?.group_id?.group_physical_location,

          item_rate_per_sqm: itemData?.item_rate_per_sqm,
          item_log_no: itemData?.item_log_no,
          item_bundle_no: itemData?.item_bundle_no,
          cutting_length: cutting?.item_details?.[index]?.cutting_length,
          cutting_width: cutting?.item_details?.[index]?.cutting_width,
          cutting_no_of_pattas:
            cutting?.item_details?.[index]?.cutting_no_of_pattas,
          cutting_sqm: cutting?.item_details?.[index]?.cutting_sqm,
          cutting_quantity: itemData?.cutting_quantity,
          wastage_sqm:
            cutting?.item_details?.[index]?.waste_cutting_quantity?.waste_sqm,
          waste_sqm_percentage:
            cutting?.item_details?.[index]?.waste_cutting_quantity
              ?.waste_sqm_percentage,
          // cutting_quantity_dyed: itemData?.cutting_quantity?.dyed,
          // cutting_quantity_smoked: itemData?.cutting_quantity?.smoked,
          // cutting_quantity_total: itemData?.cutting_quantity?.total,
          remark: cutting?.cutting_remarks,
        });
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { horizontal: 'left' };
        });
      }
    );
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    'public/reports/Cutting/CuttingReportExcel/cutting_report.xlsx';

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `cutting_report_${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Cutting/CuttingReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateCuttingReport };
