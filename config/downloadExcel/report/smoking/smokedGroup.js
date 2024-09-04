import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../../utils/date/date.js";
import { formatDateWithTime } from "../../../../utils/date/dateAndTime.js";

const GenerateSmokedGroupsReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Smoked Groups Reports");

  // Add headers to the worksheet
  const headers = [
    { header: "DATE", key: "created_at", width: 15 },
    { header: "GROUP NO", key: "group_no", width: 15 },
    { header: "ITEM NAME", key: "item_name", width: 30 },
    { header: "ITEM TYPE", key: "item_code", width: 15 },
    { header: "GROUP L", key: "group_length", width: 15 },
    { header: "GROUP W", key: "group_width", width: 15 },
    { header: "NO OF PATTAS", key: "group_no_of_pattas_available", width: 15 },
    { header: "NO PCS", key: "group_pcs", width: 15 },
    { header: "GROUP SQM", key: "group_sqm_available", width: 15 },
    {
      header: "TOTAL ITEM SQM AVAILABLE",
      key: "total_item_sqm_available",
      width: 15,
    },
    { header: "In Time", key: "in_time", width: 15 },
    { header: "Out Time", key: "out_time", width: 15 },
    { header: "Processed Time (HR)", key: "process_time", width: 15 },
    { header: "Consumed Item Name", key: "consumed_item_name", width: 25 },
    { header: "Consumed Quantity Ltr", key: "liters_of_ammonia_used", width: 25 },
    { header: "GRADE", key: "group_grade", width: 15 },
    { header: "orientation", key: "orientation", width: 15 },
    { header: "book_type", key: "book_type", width: 15 },
    { header: "GROUP PALLET NO", key: "group_pallete_no", width: 20 },
    {
      header: "GROUP physical_location",
      key: "group_physical_location",
      width: 20,
    },
    { header: "Remark", key: "group_smoked_remarks", width: 20 },
    { header: "Log No", key: "item_log_no", width: 20 },
    { header: "Bundle No", key: "item_bundle_no", width: 20 },
    { header: "ITEM Length", key: "item_length", width: 20 },
    { header: "ITEM Width", key: "item_width", width: 20 },
    { header: "Original Pattas", key: "item_received_pattas", width: 20 },
    { header: "Original Sqm	", key: "item_received_sqm", width: 20 },
    { header: "Avl Pattas", key: "item_available_pattas", width: 20 },
    { header: "Avl Total Sqm", key: "item_available_sqm", width: 20 },
    { header: "ITEM Grade", key: "item_grade", width: 20 },
    { header: "ITEM Pallet No", key: "item_pallete_no", width: 20 },
    {
      header: "ITEM Physical Location",
      key: "item_physical_location",
      width: 20,
    },
    // { header: "Avl Natural	", key: "natural", width: 20 },
    // { header: "Avl Dyed	", key: "dyed", width: 20 },
    // { header: "Avl Smoked", key: "smoked", width: 20 },
    // { header: "Total", key: "total", width: 20 },
  ];
  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(), // Convert to uppercase
      key: header.key,
      width: header.width,
    };
  });
  details.forEach((order) => {
    order?.item_details.forEach((Item) => {
      const row = worksheet.addRow({
        created_at: convDate(order?.created_at),
        group_no: order?.group_id?.group_no,
        group_smoked_remarks: order?.group_smoked_remarks,
        in_time: formatDateWithTime(order?.in_time),
        out_time: formatDateWithTime(order?.out_time),
        process_time: order?.process_time,
        consumed_item_name: order?.consumed_item_name,
        liters_of_ammonia_used: order?.liters_of_ammonia_used,
        item_name: Item?.item_name,
        item_code: Item?.item_code,
        group_length: order?.group_id?.group_length,
        group_width: order?.group_id?.group_width,
        group_no_of_pattas_available: order?.group_id?.group_no_of_pattas_available,
        group_pcs: order?.group_id?.group_pcs,
        group_sqm_available: order?.group_id?.group_sqm_available,
        total_item_sqm_available: order?.group_id?.total_item_sqm_available,
        group_grade: order?.group_id?.group_grade,
        orientation: order?.group_id?.orientation,
        book_type: order?.group_id?.book_type,
        group_pallete_no: order?.group_id?.group_pallete_no,
        group_physical_location: order?.group_id?.group_physical_location,
        item_log_no: Item?.item_log_no,
        item_bundle_no: Item?.item_bundle_no,
        item_length: Item?.item_length,
        item_width: Item?.item_width,
        item_received_pattas: Item?.item_received_pattas,
        item_received_sqm: Item?.item_received_sqm,
        item_available_pattas: Item?.item_available_pattas,
        item_available_sqm: Item?.item_available_sqm,
        item_grade: Item?.item_grade,
        item_pallete_no: Item?.item_pallete_no,
        item_physical_location: Item?.item_physical_location,
        // natural: Item.item_available_quantities.natural,
        // dyed: Item.item_available_quantities.dyed,
        // smoked: Item.item_available_quantities.smoked,
        // total: Item.item_available_quantities.total,
      });
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: "left" };
      });
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath = "public/reports/Smoking/SmokedGroupsReportExcel/smoked_groups_reports.xlsx";

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `smoked_groups_reports${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Smoking/SmokedGroupsReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateSmokedGroupsReport };
