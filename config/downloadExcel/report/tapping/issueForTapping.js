import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../../utils/date/date.js';

const GenerateIssueTappingReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Issue For Tapping Reports');

  // Add headers to the worksheet
  const headers = [
    { header: 'Tapping Issued Date', key: 'issued_for_taping_date', width: 15 },
    { header: 'Group No', key: 'group_no', width: 15 },
    { header: 'Name', key: 'item_name', width: 30 },
    { header: 'Code', key: 'item_code', width: 15 },
    { header: 'Log No', key: 'item_log_no', width: 15 },
    { header: 'Bundle No', key: 'item_bundle_no', width: 15 },
    { header: 'Rate Per SQM', key: 'item_rate_per_sqm', width: 15 },
    { header: 'Original Patta', key: 'item_received_pattas', width: 15 },
    { header: 'Original Length', key: 'item_length', width: 15 },
    { header: 'Original Width', key: 'item_width', width: 15 },
    { header: 'Original SQM', key: 'item_received_sqm', width: 15 },
    { header: 'Qutting Quantity', key: 'final_cutting_quantity', width: 15 },
    // { header: "Natural Pattas", key: "final_cutting_quantity_natural", width: 15 },
    // { header: "Dyed Pattas", key: "final_cutting_quantity_dyed", width: 15 },
    // { header: "Smoked Pattas", key: "final_cutting_quantity_smoked", width: 15 },
    { header: 'Cutting No Of Patta', key: 'cutting_no_of_pattas', width: 15 },
    { header: 'Cutting Length', key: 'cutting_length', width: 15 },
    { header: 'Cutting Width', key: 'cutting_width', width: 15 },
    { header: 'Cutting SQM', key: 'cutting_sqm', width: 15 },
    { header: 'Remarks', key: 'item_remark', width: 30 },
  ];

  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(), // Convert to uppercase
      key: header.key,
      width: header.width,
    };
  });

  details.forEach((tapping) => {
    tapping?.cutting_id?.[0]?.cutting_id?.forEach((item) => {
      const itemData = item?.item_details?.item_data?.[0];
      const row = worksheet.addRow({
        issued_for_taping_date: convDate(tapping?.issued_for_taping_date),
        group_no: tapping?.group_data?.group_no,
        item_name: itemData?.item_name,
        item_code: itemData?.item_code,
        item_log_no: itemData?.item_log_no,
        item_bundle_no: itemData?.item_bundle_no,
        item_rate_per_sqm: itemData?.item_rate_per_sqm,
        item_received_pattas: itemData?.item_received_pattas,
        item_length: itemData?.item_length,
        item_width: itemData?.item_width,
        item_received_sqm: itemData?.item_received_sqm,
        final_cutting_quantity: item?.item_details?.final_cutting_quantity,
        // final_cutting_quantity_natural:item?.item_details?.final_cutting_quantity?.natural,
        // final_cutting_quantity_dyed:item?.item_details?.final_cutting_quantity?.dyed,
        // final_cutting_quantity_smoked:item?.item_details?.final_cutting_quantity?.smoked,
        cutting_no_of_pattas: item?.item_details?.cutting_no_of_pattas,
        cutting_length: item?.item_details?.cutting_length,
        cutting_width: item?.item_details?.cutting_width,
        cutting_sqm: item?.item_details?.cutting_sqm,
        item_remark: itemData?.item_remark,
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
    'public/reports/Tapping/IssueForTappingReportExcel/issue_for_tapping_report.xlsx';

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `issue_for_tapping_report_${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Tapping/IssueForTappingReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateIssueTappingReport };
