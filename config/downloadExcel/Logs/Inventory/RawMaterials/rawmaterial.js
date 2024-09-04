import ExcelJS from "exceljs";
import convDate from "../../../../../utils/date/date.js";

const GenerateRawMaterialLogs = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Raw Material Logs");

  // Add headers to the worksheet
  const headers = [
    { header: "Date", key: "date", width: 20 },
    { header: "Operation Type", key: "operationType", width: 20 },
    { header: "Done By", key: "created_by", width: 30 },
    { header: "Invoice No", key: "invoice_no", width: 20 },
    { header: "Date of Inward", key: "date_of_inward", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Item Name", key: "item_name", width: 30 },
    { header: "Item Code", key: "item_code", width: 15 },
    { header: "Item Log No", key: "item_log_no", width: 20 },
    { header: "Item Bundle No", key: "item_bundle_no", width: 20 },
    { header: "Item Length", key: "item_length", width: 15 },
    { header: "Item Width", key: "item_width", width: 15 },

    { header: "Item Received Pattas", key: "item_received_pattas", width: 20 },
    { header: "Item Received SQM", key: "item_received_sqm", width: 20 },
    {
      header: "Item Available Pattas",
      key: "item_available_pattas",
      width: 20,
    },
    { header: "Item Available SQM", key: "item_available_sqm", width: 20 },
    { header: "Item Rejected Pattas", key: "item_rejected_pattas", width: 20 },
    { header: "Item Rejected SQM", key: "item_rejected_sqm", width: 20 },
    { header: "Item Pallete No", key: "item_pallete_no", width: 15 },
    {
      header: "Item Physical Location",
      key: "item_physical_location",
      width: 20,
    },
    { header: "Item Grade", key: "item_grade", width: 15 },
    { header: "Item Rate Per SQM", key: "item_rate_per_sqm", width: 20 },
    { header: "Item Remark", key: "item_remark", width: 30 },
    { header: "Supplier Name", key: "supplier_name", width: 30 },
    { header: "Supplier Country", key: "supplier_country", width: 20 },
    { header: "Supplier State", key: "supplier_state", width: 20 },
    { header: "Supplier City", key: "supplier_city", width: 20 },
    { header: "Supplier Pincode", key: "supplier_pincode", width: 15 },
    { header: "Supplier Bill Address", key: "bill_address", width: 40 },
    { header: "Supplier Delivery Address", key: "delivery_address", width: 40 },
    {
      header: "Supplier Contact Person Name",
      key: "contact_person_name",
      width: 25,
    },
    {
      header: " Supplier Contact Person Number",
      key: "contact_person_number",
      width: 20,
    },
    { header: "Supplier Email ID", key: "email_id", width: 30 },
    { header: "Supplier PAN No", key: "pan_no", width: 20 },
    { header: "Supplier GST No", key: "gst_no", width: 20 },
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
      invoice_no: log.data.fullDocument.invoice_no,
      date_of_inward: convDate(log.data.fullDocument.date_of_inward),
      status: log.data.fullDocument.status,
      item_name: log.data.fullDocument.item_name,
      item_code: log.data.fullDocument.item_code,
      item_log_no: log.data.fullDocument.item_log_no,
      item_bundle_no: log.data.fullDocument.item_bundle_no,
      item_length: log.data.fullDocument.item_length,
      item_width: log.data.fullDocument.item_width,
      item_received_pattas: log.data.fullDocument.item_received_pattas,
      item_received_sqm: log.data.fullDocument.item_received_sqm,
      item_available_pattas: log.data.fullDocument.item_available_pattas,
      item_available_sqm: log.data.fullDocument.item_available_sqm,
      item_rejected_pattas: log.data.fullDocument.item_rejected_pattas,
      item_rejected_sqm: log.data.fullDocument.item_rejected_sqm,
      item_pallete_no: log.data.fullDocument.item_pallete_no,
      item_physical_location: log.data.fullDocument.item_physical_location,
      item_grade: log.data.fullDocument.item_grade,
      item_rate_per_sqm: log.data.fullDocument.item_rate_per_sqm,
      item_remark: log.data.fullDocument.item_remark,
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
      pan_no: log.data.fullDocument.supplier_details.pan_no,
      gst_no: log.data.fullDocument.supplier_details.gst_no,
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

export { GenerateRawMaterialLogs };
