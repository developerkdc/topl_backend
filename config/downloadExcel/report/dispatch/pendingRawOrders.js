import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../../utils/date/date.js';

const GeneratePendingRawOrdersReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pending Raw Orders Reports');

  // Add headers to the worksheet

  worksheet.columns = [
    { header: 'Order Date', key: 'created_at', width: 15 },
    { header: 'Purchase Order No', key: 'purchase_order_no', width: 15 },
    { header: 'Customer Name', key: 'customer_name', width: 20 },
    { header: 'City', key: 'customer_city', width: 20 },
    { header: 'Order Mode', key: 'order_mode', width: 15 },
    { header: 'Order No', key: 'order_no', width: 15 },
    { header: 'Item No', key: 'item_no', width: 30 },
    { header: 'Item Name', key: 'item_name', width: 30 },
    { header: 'Item Type', key: 'item_code', width: 15 },
    { header: 'Required quantity', key: 'required_quantity', width: 20 },
    { header: 'Balance quantity', key: 'balance_quantity', width: 20 },
    // { header: "Natural", key: "required_natural", width: 15 },
    // { header: "Smoked", key: "required_smoked", width: 15 },
    // { header: "Dyed", key: "required_dyed", width: 15 },
    { header: 'Length', key: 'item_length', width: 15 },
    { header: 'Width', key: 'item_width', width: 15 },
    { header: 'Sqm', key: 'item_sqm', width: 15 },
    { header: 'Rate', key: 'item_remarks', width: 20 },
    { header: 'Total Amount', key: 'total_amount', width: 20 },
    { header: 'Status', key: 'status', width: 20 },
  ];

  details.forEach((item) => {
    item.raw_order_details.forEach((rawOrder) => {
      const row = worksheet.addRow({
        created_at: convDate(item.created_at),
        order_no: item.order_no,
        purchase_order_no: item.purchase_order_no,
        customer_name: item.customer_name,
        customer_city: item.place,
        order_mode: item.order_mode,
        item_no: rawOrder.item_no,
        item_name: rawOrder.order_item_name,
        item_code: rawOrder.order_item_code,
        required_quantity: rawOrder.required_quantity,
        balance_quantity: rawOrder.balance_quantity,
        // required_natural: rawOrder.required_quantity.natural || 0,
        // required_smoked: rawOrder.required_quantity.smoked || 0,
        // required_dyed: rawOrder.required_quantity.dyed || 0,
        item_length: rawOrder.order_length,
        item_width: rawOrder.order_width,
        item_sqm: rawOrder.order_sqm,
        item_remarks: rawOrder.order_rate,
        total_amount: rawOrder.total_order_amount,
        status: rawOrder.order_status,
      });
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: 'left' };
      });
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    'public/reports/Dispatch/PendingRawOrdersReportExcel/pending_raw_orders.xlsx';

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `Pending_Raw_Orders_Report_${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Dispatch/PendingRawOrdersReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GeneratePendingRawOrdersReport };
