import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../../utils/date/date.js';
import { formatDateWithTime } from '../../../../utils/date/dateAndTime.js';

const GenerateDyedIndividualReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dyed Individual Reports');

  // Add headers to the worksheet

  worksheet.columns = [
    { header: 'DATE', key: 'date_of_dying', width: 15 },
    { header: 'ITEM NAME', key: 'item_name', width: 30 },
    { header: 'ITEM TYPE', key: 'item_code', width: 15 },
    { header: 'Log No', key: 'item_log_no', width: 20 },
    { header: 'Bundle No', key: 'item_bundle_no', width: 20 },
    { header: 'L', key: 'item_length', width: 15 },
    { header: 'W', key: 'item_width', width: 15 },
    { header: 'Avl Pattas', key: 'item_available_pattas', width: 20 },
    { header: 'Avl Total Sqm', key: 'item_available_sqm', width: 20 },
    { header: 'In Time', key: 'in_time', width: 15 },
    { header: 'Out Time', key: 'out_time', width: 15 },
    { header: 'Processed Time (HR)', key: 'process_time', width: 15 },
    { header: 'Consumed Item', key: 'consumed_item_name', width: 25 },
    {
      header: 'Consumed Quantity Ltr',
      key: 'liters_of_ammonia_used',
      width: 25,
    },
    { header: 'GRADE', key: 'item_grade', width: 15 },
    { header: 'Pallet No', key: 'item_pallete_no', width: 20 },
    {
      header: 'Physical Location',
      key: 'item_physical_location',
      width: 20,
    },

    {
      header: 'Issued Dying Quantity',
      key: 'issued_dying_quantity',
      width: 20,
    },
    // { header: "Issued Dying Quantity Dyed	", key: "Issued_dyed", width: 20 },
    // {
    //   header: "Issued Dying Quantity Smoked",
    //   key: "Issued_smoked",
    //   width: 20,
    // },
    // { header: "Issued Dying Quantity Total", key: "Issued_total", width: 20 },

    { header: 'Received Quantity', key: 'item_received_pattas', width: 20 },
    // { header: "Received Quantity Dyed	", key: "Received_dyed", width: 20 },
    // { header: "Received Quantity Smoked", key: "Received_smoked", width: 20 },
    // { header: "Received Quantity Total", key: "Received_total", width: 20 },

    // {
    //   header: "Available Quantity Natural	",
    //   key: "Available_natural",
    //   width: 20,
    // },
    // { header: "Available Quantity Dyed	", key: "Available_dyed", width: 20 },
    // { header: "Available Quantity Smoked", key: "Available_smoked", width: 20 },
    // { header: "Available Quantity Total", key: "Available_total", width: 20 },

    { header: 'Rejected Quantity', key: 'item_rejected_pattas', width: 20 },
    // { header: "Rejected Quantity Dyed	", key: "Rejected_dyed", width: 20 },
    // { header: "Rejected Quantity Smoked", key: "Rejected_smoked", width: 20 },
    // { header: "Rejected Quantity Total", key: "Rejected_total", width: 20 },
    { header: 'SUPPLIER', key: 'supplier', width: 20 },
    { header: 'Remark', key: 'individual_dying_remarks', width: 20 },
  ];

  details.forEach((order) => {
    // order.item_details.forEach((order.item_details) => {
    const row = worksheet.addRow({
      date_of_dying: convDate(order?.date_of_dying),
      individual_dying_remarks: order?.individual_dying_remarks,
      in_time: formatDateWithTime(order?.in_time),
      out_time: formatDateWithTime(order?.out_time),
      process_time: order?.process_time,
      consumed_item_name: order?.consumed_item_name,
      liters_of_ammonia_used: order?.liters_of_ammonia_used,
      item_name: order?.item_details?.item_name,
      item_code: order?.item_details?.item_code,
      supplier: order?.item_details?.supplier_details.supplier_name,
      item_log_no: order?.item_details?.item_log_no,
      item_bundle_no: order?.item_details?.item_bundle_no,
      item_length: order?.item_details?.item_length,
      item_width: order?.item_details?.item_width,
      item_received_pattas: order?.item_details?.item_received_pattas,
      item_received_sqm: order?.item_details?.item_received_sqm,
      item_available_pattas: order?.item_details?.item_available_pattas,
      item_available_sqm: order?.item_details?.item_available_sqm,
      item_grade: order?.item_details?.item_grade,
      item_pallete_no: order?.item_details?.item_pallete_no,
      item_physical_location: order?.item_details?.item_physical_location,
      item_available_pattas: order?.item_details?.item_available_pattas,
      item_rejected_pattas: order?.item_details?.item_rejected_pattas,
      item_available_pattas: order?.item_details?.item_available_pattas,
      issued_dying_quantity: order?.issued_dying_quantity,

      // Rejected_natural: order?.item_details?.item_rejected_quantities.natural,
      // Rejected_dyed: order?.item_details?.item_rejected_quantities.dyed,
      // Rejected_smoked: order?.item_details?.item_rejected_quantities.smoked,
      // Rejected_total: order?.item_details?.item_rejected_quantities.total,
      // Issued_natural: order?.issued_dying_quantity.natural,
      // Issued_dyed: order?.issued_dying_quantity.dyed,
      // Issued_smoked: order?.issued_dying_quantity.smoked,
      // Issued_total: order?.issued_dying_quantity.total,
      // Available_natural: order?.item_details?.item_available_quantities.natural,
      // Available_dyed: order?.item_details?.item_available_quantities.dyed,
      // Available_smoked: order?.item_details?.item_available_quantities.smoked,
      // Available_total: order?.item_details?.item_available_quantities.total,
      // Received_natural: order?.item_details?.item_received_quantities.natural,
      // Received_dyed: order?.item_details?.item_received_quantities.dyed,
      // Received_smoked: order?.item_details?.item_received_quantities.smoked,
      // Received_total: order?.item_details?.item_received_quantities.total,
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: 'left' };
    });
  });
  //   });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    'public/reports/Dying/DyedIndividualReportExcel/dyed_individual_reports.xlsx';

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `dyed_individual_reports${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Dying/DyedIndividualReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateDyedIndividualReport };
