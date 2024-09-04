import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../../utils/date/date.js";

const GenerateDispatchedGroupDoneReport = async (details) => {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Dispatched Group Done Reports");

  // Add headers to the worksheet
  const headers = [
    { header: "Date", key: "orderDate", width: 25 },
    { header: "Invoice No", key: "invoice_no", width: 25 },
    { header: "party name", key: "customer_name", width: 25 },
    { header: "party place.", key: "place", width: 15 },
    { header: "Item Name", key: "item_name", width: 25 },
    { header: "Item Type", key: "item_code", width: 25 },
    { header: "Group No.", key: "group_no", width: 15 },
    { header: "No. of Pcs", key: "qc_dispatched_qty", width: 15 },
    { header: "Length", key: "qc_length", width: 15 },
    { header: "Width", key: "qc_width", width: 15 },
    { header: "Group Sqm", key: "group_sqm", width: 15 },
  ];
  worksheet.columns = headers.map((header) => ({
    header: header.header.toUpperCase(),
    key: header.key,
    width: header.width,
  }));
  details.forEach((order) => {
    order.group_dispatch_details.forEach((detail) => {

      detail.dispatch.forEach((dispatchEntry) => {

        const orderItem = order.group_dispatch_details.find(
          (item) => item.item_no === detail.item_no
        );
    
        const row = worksheet.addRow({
          orderDate: convDate(order.order_details.orderDate),
          invoice_no: order.invoice_no,
          customer_name: order.order_details.customer_name,
          place: order.order_details.place,
          item_name: order.order_details.group_order_details[0].order_item_name,
          item_code: order.order_details.group_order_details[0].order_item_code,
          group_no: orderItem.dispatch[0].qc_details.group_no,
          group_sqm: dispatchEntry.dispatch_sqm,
          qc_dispatched_qty: dispatchEntry.qc_dispatched_qty,
          qc_length: orderItem.dispatch[0].qc_details.qc_length,
          qc_width: orderItem.dispatch[0].qc_details.qc_width,
        });
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { horizontal: "left" };
        });
      });
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    "public/reports/Dispatch/DispatchedGroupDoneReport/dispatched_group_done.xlsx";

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `Dispatched_Group_Done_Report${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Dispatch/DispatchedGroupDoneReport/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateDispatchedGroupDoneReport };
