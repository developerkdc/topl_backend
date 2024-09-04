import ExcelJS from "exceljs";
import convDate from "../../../../../utils/date/date.js";

const GenerateOtherGoodsLogs = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Other Goods Logs");

  // Add headers to the worksheet
  const headers = [
    { header: "Date", key: "date", width: 20 },
    { header: "Operation Type", key: "operationType", width: 20 },
    { header: "Done By", key: "created_by", width: 30 },
    { header: "Date of Inward", key: "date_of_inward", width: 20 },
    { header: "Item Name", key: "item_name", width: 25 },
    { header: "Units", key: "units", width: 10 },
    { header: "Rate", key: "rate", width: 15 },
    { header: "Received Quantity", key: "received_quantity", width: 20 },
    { header: "Available Quantity", key: "available_quantity", width: 20 },
    { header: "Supplier Name", key: "supplier_name", width: 30 },
    { header: "Supplier Country", key: "supplier_country", width: 25 },
    { header: "Supplier State", key: "supplier_state", width: 30 },
    { header: "Supplier City", key: "supplier_city", width: 25 },
    { header: "Supplier Pincode", key: "supplier_pincode", width: 15 },
    { header: "Supplier Bill Address", key: "bill_address", width: 40 },
    { header: "Supplier Delivery Address", key: "delivery_address", width: 40 },
    {
      header: "Supplier Contact Person Name",
      key: "contact_person_name",
      width: 25,
    },
    {
      header: "Supplier Contact Person Number",
      key: "contact_person_number",
      width: 25,
    },
    { header: "Supplier Email ID", key: "email_id", width: 30 },
    { header: "Supplier PAN No", key: "pan_no", width: 20 },
    { header: "Supplier GST No", key: "gst_no", width: 20 },
    { header: "Other Goods Remarks", key: "other_goods_remarks", width: 30 },
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
      date_of_inward: convDate(log.data.fullDocument.date_of_inward),
      item_name: log.data.fullDocument.item_name,
      units: log.data.fullDocument.units,
      rate: log.data.fullDocument.rate,
      received_quantity: log.data.fullDocument.received_quantity,
      available_quantity: log.data.fullDocument.available_quantity,
      supplier_name: log.data.fullDocument.supplier_details.supplier_name,
      supplier_country: log.data.fullDocument.supplier_details.country,
      supplier_state: log.data.fullDocument.supplier_details.state,
      supplier_city: log.data.fullDocument.supplier_details.city,
      supplier_pincode: log.data.fullDocument.supplier_details.pincode,
      bill_address: log.data.fullDocument.supplier_details.bill_address,
      delivery_address: log.data.fullDocument.supplier_details.delivery_address,
      contact_person_name:
        log.data.fullDocument.supplier_details.contact_Person_name,
      contact_person_number: `${log.data.fullDocument.supplier_details.country_code} ${log.data.fullDocument.supplier_details.contact_Person_number}`,
      email_id: log.data.fullDocument.supplier_details.email_id,
      pan_no: log.data.fullDocument.supplier_details.pan_no || "N/A",
      gst_no: log.data.fullDocument.supplier_details.gst_no || "N/A",
      other_goods_remarks: log.data.fullDocument.other_goods_remarks,
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

export { GenerateOtherGoodsLogs };
