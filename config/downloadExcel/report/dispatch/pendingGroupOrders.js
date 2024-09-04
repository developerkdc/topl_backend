import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../../utils/date/date.js";
const GeneratePendingGroupOrdersReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Pending Group Orders Reports");

  worksheet.columns = [
    { header: "Order Date", key: "orderDate", width: 15 },
    { header: "Purchase Order No", key: "purchase_order_no", width: 15 },
    { header: "Customer Name", key: "customer_name", width: 15 },
    { header: "City", key: "place", width: 15 }, // Assuming "place" refers to the city
    { header: "Order Mode", key: "order_mode", width: 15 },
    { header: "Order No", key: "order_no", width: 15 },
    { header: "Group No", key: "group_no", width: 15 },
    { header: "Item No", key: "item_no", width: 30 },
    { header: "Item Name", key: "order_item_name", width: 30 }, // Adjusted to match data structure
    { header: "Item Type", key: "order_item_code", width: 15 }, // Adjusted to match data structure
    { header: "Required Pcs", key: "order_required_pcs", width: 15 }, // Adjusted to match data structure
    { header: "Balance", key: "order_balance_pcs_qty", width: 15 }, // Adjusted to match data structure
    { header: "Length", key: "order_length", width: 15 }, // Adjusted to match data structure
    { header: "Width", key: "order_width", width: 15 }, // Adjusted to match data structure
    { header: "Sqm", key: "order_required_sqm", width: 15 }, // Adjusted to match data structure
    { header: "Rate", key: "order_rate", width: 30 }, // Adjusted to match data structure
    { header: "Total Amount", key: "total_order_amount", width: 30 }, // Adjusted to match data structure
    { header: "Status", key: "order_status", width: 30 }, // Adjusted to match data structure
  ];

  details.forEach((item) => {
    item.group_order_details.forEach((groupOrder) => {
      const row = worksheet.addRow({
        orderDate: convDate(item.orderDate), // Adjusted to match data structure
        purchase_order_no: item.purchase_order_no,
        customer_name: item.customer_name,
        place: item.place, // Assuming "place" refers to the city
        order_mode: item.order_mode,
        order_no: item.order_no,
        group_no: groupOrder.order_group_no,
        item_no: groupOrder.item_no,
        order_item_name: groupOrder.order_item_name,
        order_item_code: groupOrder.order_item_code,
        order_required_pcs: groupOrder.order_required_pcs,
        order_balance_pcs_qty: groupOrder.order_balance_pcs_qty,
        order_length: groupOrder.order_length,
        order_width: groupOrder.order_width,
        order_required_sqm: groupOrder.order_required_sqm,
        order_rate: groupOrder.order_rate,
        total_order_amount: groupOrder.total_order_amount,
        order_status: groupOrder.order_status,
      });
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: "left" };
      });
    });
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const filePath =
    "public/reports/Dispatch/PendingGroupOrdersReportExcel/pending_group_orders.xlsx";
  await workbook.xlsx.writeFile(filePath);

  const timestamp = new Date().getTime();
  const downloadFileName = `Pending_Group_Orders_Report_${timestamp}.xlsx`;

  const destinationPath = `public/reports/Dispatch/PendingGroupOrdersReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GeneratePendingGroupOrdersReport };
