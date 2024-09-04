import ExcelJS from "exceljs";
import convDate from "../../../../utils/date/date.js";

const GenerateItemNameLogs = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Item Name Logs");

  // Add headers to the worksheet
  const headers = [
    { header: "Date", key: "date", width: 20 },
    { header: "Operation Type", key: "operationType", width: 20 },
    { header: "Done By", key: "created_by", width: 30 },
    { header: "Item Name", key: "item_name", width: 30 },
    { header: "Item Name Remarks", key: "item_name_remarks", width: 40 },
    { header: "Status", key: "status", width: 15 },
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
      item_name: log.data.fullDocument.item_name,
      item_name_remarks: log.data.fullDocument.item_name_remarks,
      status: log.data.fullDocument.status,
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

export { GenerateItemNameLogs };
