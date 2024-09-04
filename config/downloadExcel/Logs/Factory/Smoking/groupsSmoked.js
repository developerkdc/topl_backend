import ExcelJS from "exceljs";
import convDate from "../../../../../utils/date/date.js";
import { displayDateFun } from "../../../../../utils/date/displayDateAndTime.js";

const GenerateGroupSmokedLogs = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Smoked Individuals Logs");

  // Add headers to the worksheet
  const headers = [
    { header: "Date", key: "date", width: 20 },
    { header: "Operation Type", key: "operationType", width: 20 },
    { header: "Done By", key: "created_by", width: 30 },
    { header: "Date Of Grouping", key: "date_of_grouping", width: 20 },
    { header: "Group No", key: "group_no", width: 20 },
    {
      header: "Group No of Pattas",
      key: "group_no_of_pattas_available",
      width: 20,
    },
    {
      header: "Item Sqm Available",
      key: "total_item_sqm_available",
      width: 20,
    },
    { header: "Group Pcs", key: "group_pcs", width: 20 },
    { header: "Group Length", key: "group_length", width: 20 },
    { header: "Group Width", key: "group_width", width: 20 },
    { header: "Group Sqm", key: "group_sqm_available", width: 20 },
    { header: "Group Grade", key: "group_grade", width: 20 },
    { header: "Book Type", key: "book_type", width: 20 },
    { header: "Pallet No", key: "group_pallete_no", width: 20 },
    { header: "Physical Location", key: "group_physical_location", width: 20 },
    { header: "Group Remark", key: "group_remarks", width: 20 },
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
    const fullDocument = log.data.fullDocument.group_id;
    log.data.fullDocument.item_details.forEach((item, index) => {
      const row = worksheet.addRow({
        date: index === 0 ? convDate(log.date) : "",
        operationType: index === 0 ? log.data.operationType : "",
        created_by:
          index === 0
            ? `${log.created_user_id.first_name} ${log.created_user_id.last_name} `
            : "",

        date_of_grouping:
          index === 0 ? convDate(fullDocument.date_of_grouping) : "",
        group_no: index === 0 ? fullDocument.group_no : "",
        group_no_of_pattas_available:
          index === 0 ? fullDocument.group_no_of_pattas_available : "",
        total_item_sqm_available:
          index === 0 ? fullDocument.total_item_sqm_available : "",
        group_pcs: index === 0 ? fullDocument.group_pcs : "",
        group_length: index === 0 ? fullDocument.group_length : "",
        group_width: index === 0 ? fullDocument.group_width : "",
        group_sqm_available:
          index === 0 ? fullDocument.group_sqm_available : "",
        group_grade: index === 0 ? fullDocument.group_grade : "",
        book_type: index === 0 ? fullDocument.book_type : "",
        group_pallete_no: index === 0 ? fullDocument.group_pallete_no : "",
        group_physical_location:
          index === 0 ? fullDocument.group_physical_location : "",
        group_remarks: index === 0 ? fullDocument.group_remarks : "",

        invoice_no: item.invoice_no,
        date_of_inward: convDate(item.date_of_inward),
        status: log.data.fullDocument.status,
        item_name: item.item_name,
        item_code: item.item_code,
        item_log_no: item.item_log_no,
        item_bundle_no: item.item_bundle_no,
        item_length: item.item_length,
        item_width: item.item_width,
        item_available_pattas: item.item_available_pattas,
        item_available_sqm: item.item_available_sqm,
        in_time: displayDateFun(log.data.fullDocument.in_time),
        out_time: displayDateFun(log.data.fullDocument.out_time),
        process_time: `${log.data.fullDocument.process_time} hr`,
        liters_of_ammonia_used: log.data.fullDocument.liters_of_ammonia_used,
        item_pallete_no: item.item_pallete_no,
        item_physical_location: item.item_physical_location,
        item_grade: item.item_grade,
        item_rate_per_sqm: item.item_rate_per_sqm,
        item_remark: item.item_remark,
      });
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: "left" };
      });
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export { GenerateGroupSmokedLogs };
