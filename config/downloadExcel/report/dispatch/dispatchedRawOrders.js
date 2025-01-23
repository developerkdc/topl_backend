import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../../utils/date/date.js';

const GenerateDispatchedRawOrdersReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dispatched Raw Orders Reports');

  worksheet.columns = [
    { header: 'Dispatched Date', key: 'dispatched_date', width: 15 },
    { header: 'Purchase Order No', key: 'purchase_order_no', width: 15 },
    { header: 'Invoice No', key: 'invoice_no', width: 15 },
    { header: 'Customer Name', key: 'customer_name', width: 15 },
    { header: 'City', key: 'customer_city', width: 15 },
    { header: 'Order Mode', key: 'order_mode', width: 15 },
    { header: 'Order No', key: 'order_no', width: 15 },
    { header: 'Item No', key: 'item_no', width: 15 },
    { header: 'Item Name', key: 'item_name', width: 30 },
    { header: 'Item Type', key: 'item_code', width: 15 },
    { header: 'Disp Quantity', key: 'dispatched_quantity', width: 15 },

    // { header: "Disp Natural", key: "dispatched_natural", width: 15 },
    // { header: "Disp Smoked", key: "dispatched_smoked", width: 15 },
    // { header: "Disp Dyed", key: "dispatched_dyed", width: 15 },
    { header: 'Length', key: 'item_length', width: 15 },
    { header: 'Width', key: 'item_width', width: 15 },
    { header: 'Sqm', key: 'item_sqm', width: 15 },
    { header: 'Rate', key: 'item_rate', width: 15 }, // Adjusted key name
    { header: 'Total Amount', key: 'total_amount', width: 15 },
  ];

  details.forEach((dispatch) => {
    dispatch?.raw_dispatch_details.forEach((detail) => {
      detail?.dispatch.forEach((dispatchEntry) => {
        const orderItem = dispatch?.order_details?.raw_order_details.find(
          (item) => item?.item_no === detail?.item_no
        );

        const row = worksheet.addRow({
          dispatched_date: convDate(dispatch?.dispatched_date),
          purchase_order_no: dispatch?.order_details?.purchase_order_no,
          invoice_no: dispatch?.invoice_no,
          customer_name: dispatch?.order_details?.customer_name,
          customer_city: dispatch?.created_employee_id?.city,
          order_mode: dispatch?.order_details?.order_mode,
          order_no: dispatch?.order_details?.order_no,
          item_no: detail?.item_no,
          item_name: dispatchEntry?.raw_details?.item_name,
          item_code: dispatchEntry?.raw_details?.item_code,
          dispatched_quantity: dispatchEntry?.dispatched_quantity,
          // dispatched_natural: dispatchEntry?.natural,
          // dispatched_smoked: dispatchEntry?.smoked,
          // dispatched_dyed: dispatchEntry?.dyed,
          item_length: dispatchEntry?.raw_details?.item_length,
          item_width: dispatchEntry?.raw_details?.item_width,
          item_sqm: dispatchEntry?.dispatch_sqm,
          item_rate: orderItem ? orderItem?.order_rate : '', // Adjusted this line
          total_amount: dispatchEntry?.total_item_amount,
        });
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { horizontal: 'left' };
        });
      });
    });
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const filePath =
    'public/reports/Dispatch/DispatchedRawOrdersReportExcel/dispatched_raw_orders.xlsx';

  await workbook.xlsx.writeFile(filePath);

  const timestamp = new Date().getTime();
  const downloadFileName = `Dispatched_Raw_Orders_Report_${timestamp}.xlsx`;

  const destinationPath = `public/reports/Dispatch/DispatchedRawOrdersReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateDispatchedRawOrdersReport };
