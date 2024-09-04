import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../../utils/date/date.js";

const GenerateOtherGoodsReport = async (details) => {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Other Goods Reports");
  // Add headers to the worksheet
  const headers = [
    { header: "DATE", key: "date_of_inward", width: 15 },
    { header: "ITEM NAME", key: "item_name", width: 30 },
    { header: "received quantity", key: "received_quantity", width: 15 },
    { header: "available quantity", key: "available_quantity", width: 15 },
    { header: "units", key: "units", width: 15 },
    { header: "rate", key: "rate", width: 15 },
    { header: "supplier name", key: "supplier_name", width: 15 },
    { header: "remarks", key: "other_goods_remarks", width: 15 },
   
  ];
  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(), // Convert to uppercase
      key: header.key,
      width: header.width,
    };
  });

  details.forEach((order) => {
    const row = worksheet.addRow({
      date_of_inward: convDate(order.date_of_inward),
      item_name: order.item_name,
      received_quantity: order.received_quantity,
      available_quantity: order.available_quantity,
      rate: order.rate,
      units: order.units,
      supplier_name: order.supplier_details.supplier_name,
      other_goods_remarks: order.other_goods_remarks,

    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: "left" };
    });
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  // Generate a temporary file path
  const filePath =
    "public/reports/OtherGoods/OtherGoodsReportExcel/OtherGoodsReport.xlsx";

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `Other_Goods_Report${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/OtherGoods/OtherGoodsReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateOtherGoodsReport };
