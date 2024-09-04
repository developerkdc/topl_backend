import ExcelJS from "exceljs";
import fs from "fs/promises";

const GenerateConsumedGoodsReport = async (data) => {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Consumed Goods Reports");

  const columns = [
    { header: "ITEM NAME", key: "cons_item_name", width: 20 },
    { header: "UNITS", key: "units", width: 20 },
    { header: "OPENING", key: "available_quantity", width: 10 },
    { header: "ADDITIONS", key: "received_quantity", width: 10 },
    ...Object.keys(data[0].dailyConsumption).map((date) => {
      const [year, month, day] = date.split("-");
      const formattedDate = `${day}/${month}/${year.slice(-2)}`;
      return { header: formattedDate, key: date, width: 10 };
    }),

    { header: "CLOSING", key: "closing", width: 10 },
  ];

  worksheet.columns = columns;

  data.forEach((item) => {
    let closingQuantity = item.available_quantity + item.received_quantity;
    Object.values(item.dailyConsumption).forEach((consumption) => {
      closingQuantity -= consumption;
    });
    const rowData = {
      cons_item_name: item.cons_item_name,
      units: item.units,
      received_quantity: item.received_quantity ? item.received_quantity : 0,
      available_quantity: item.available_quantity ? item.available_quantity : 0,
      closing: closingQuantity,
    };
    Object.keys(item.dailyConsumption).forEach((date) => {
      rowData[date] = item.dailyConsumption[date];
    });

    worksheet.addRow(rowData);
  });

  const filePath =
    "public/reports/OtherGoods/ConsumedReportExcel/other_goods_report.xlsx";

  await workbook.xlsx.writeFile(filePath);

  const timestamp = new Date().getTime();
  const downloadFileName = `Other_Goods_Report_${timestamp}.xlsx`;

  const destinationPath = `public/reports/OtherGoods/ConsumedReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateConsumedGoodsReport };
