import ExcelJS from "exceljs";
import convDate from "../../../../../utils/date/date.js";
import { displayDateFun } from "../../../../../utils/date/displayDateAndTime.js";

const GenerateIndividualSmokedLogs = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Smoked Individuals Logs");

  // Add headers to the worksheet
  const headers = [
    { header: "Date", key: "date", width: 20 },
    { header: "Operation Type", key: "operationType", width: 20 },
    { header: "Done By", key: "created_by", width: 30 },
    { header: "Invoice No", key: "invoice_no", width: 20 },
    { header: "Date of Inward", key: "date_of_inward", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Item Name", key: "item_name", width: 30 },
    { header: "Item Code", key: "item_code", width: 15 },
    { header: "Item Log No", key: "item_log_no", width: 20 },
    { header: "Item Bundle No", key: "item_bundle_no", width: 20 },
    { header: "Item Length", key: "item_length", width: 15 },
    { header: "Item Width", key: "item_width", width: 15 },
    {
      header: "Item Available Pattas",
      key: "item_available_pattas",
      width: 20,
    },
    {
      header: "Item Smoked Pattas",
      key: "issued_smoking_quantity",
      width: 20,
    },
    { header: "Item Available SQM", key: "item_available_sqm", width: 20 },
    { header: "In Time", key: "in_time", width: 15 },
    { header: "Out Time", key: "out_time", width: 15 },
    { header: "Processed Time", key: "process_time", width: 15 },
    { header: "Ammonia Used", key: "liters_of_ammonia_used", width: 15 },

    { header: "Item Pallete No", key: "item_pallete_no", width: 15 },
    {
      header: "Item Physical Location",
      key: "item_physical_location",
      width: 20,
    },
    { header: "Item Grade", key: "item_grade", width: 15 },
    { header: "Item Rate Per SQM", key: "item_rate_per_sqm", width: 20 },
    { header: "Item Remark", key: "item_remark", width: 30 },
  ];
  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(), // Convert to uppercase
      key: header.key,
      width: header.width,
    };
  });
  details.forEach((log) => {
    const row = worksheet.addRow({
      date: convDate(log.date),
      operationType: log.data.operationType,
      created_by: `${log.created_user_id.first_name} ${log.created_user_id.last_name} `,
      invoice_no: log.data.fullDocument.item_details.invoice_no,
      date_of_inward: convDate(
        log.data.fullDocument.item_details.date_of_inward
      ),
      status: log.data.fullDocument.status,
      item_name: log.data.fullDocument.item_details.item_name,
      item_code: log.data.fullDocument.item_details.item_code,
      item_log_no: log.data.fullDocument.item_details.item_log_no,
      item_bundle_no: log.data.fullDocument.item_details.item_bundle_no,
      item_length: log.data.fullDocument.item_details.item_length,
      item_width: log.data.fullDocument.item_details.item_width,
      item_available_pattas:
        log.data.fullDocument.item_details.item_available_pattas,
      issued_smoking_quantity:
        log.data.fullDocument.issued_smoking_quantity,
      item_available_sqm: log.data.fullDocument.item_details.item_available_sqm,
      in_time: displayDateFun(log.data.fullDocument.in_time),
      out_time: displayDateFun(log.data.fullDocument.out_time),
      process_time: `${log.data.fullDocument.process_time} hr`,
      liters_of_ammonia_used: log.data.fullDocument.liters_of_ammonia_used,
      item_pallete_no: log.data.fullDocument.item_details.item_pallete_no,
      item_physical_location:
        log.data.fullDocument.item_details.item_physical_location,
      item_grade: log.data.fullDocument.item_details.item_grade,
      item_rate_per_sqm: log.data.fullDocument.item_details.item_rate_per_sqm,
      item_remark: log.data.fullDocument.item_details.item_remark,
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: "left" };
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export { GenerateIndividualSmokedLogs };
