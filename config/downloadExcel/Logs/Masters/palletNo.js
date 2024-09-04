import ExcelJS from "exceljs";
import convDate from "../../../../utils/date/date.js";

const GeneratePalletLogs = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Pallet Logs");

  // Add headers to the worksheet
  const headers = [
    { header: "Date", key: "date", width: 20 },
    { header: "Operation Type", key: "operationType", width: 20 },
    { header: "Done By", key: "created_by", width: 30 },
    { header: "Pallete No", key: "pallete_no", width: 15 },
    {
      header: "Item Physical Location",
      key: "item_physical_location",
      width: 30,
    },
    { header: "Pallete Remarks", key: "pallete_remarks", width: 30 },
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
      pallete_no: log.data.fullDocument.pallete_no,
      pallete_remarks: log.data.fullDocument.pallete_remarks,
      status: log.data.fullDocument.status,
      item_physical_location: log.data.fullDocument.item_physical_location,
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

export { GeneratePalletLogs };
