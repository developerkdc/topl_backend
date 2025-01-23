import ExcelJS from 'exceljs';
import convDate from '../../../../utils/date/date.js';

const GenerateSuppliersLogs = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Suppliers Logs');

  // Add headers to the worksheet
  const headers = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Operation Type', key: 'operationType', width: 20 },
    { header: 'Done By', key: 'created_by', width: 30 },
    { header: 'Supplier Name', key: 'supplier_name', width: 30 },
    { header: 'Country', key: 'country', width: 20 },
    { header: 'State', key: 'state', width: 20 },
    { header: 'City', key: 'city', width: 20 },
    { header: 'Pincode', key: 'pincode', width: 15 },
    { header: 'Billing Address', key: 'bill_address', width: 40 },
    { header: 'Delivery Address', key: 'delivery_address', width: 40 },
    { header: 'Contact Person Name', key: 'contact_person_name', width: 30 },
    {
      header: 'Contact Person Number',
      key: 'contact_person_number',
      width: 20,
    },
    { header: 'Email ID', key: 'email_id', width: 30 },
    { header: 'PAN Number', key: 'pan_no', width: 20 },
    { header: 'GST Number', key: 'gst_no', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Remarks', key: 'supplier_remarks', width: 30 },
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
      supplier_name: log.data.fullDocument.supplier_name,
      country: log.data?.fullDocument.country,
      state: log.data?.fullDocument.state,
      city: log.data?.fullDocument.city,
      pincode: log.data?.fullDocument.pincode,
      bill_address: log.data?.fullDocument.bill_address,
      delivery_address: log.data?.fullDocument.delivery_address,
      contact_person_name: log.data?.fullDocument.contact_Person_name,
      contact_person_number: `${log.data?.fullDocument.country_code} ${log.data?.fullDocument.contact_Person_number}`,
      email_id: log.data?.fullDocument.email_id,
      pan_no: log.data?.fullDocument.pan_no,
      gst_no: log.data?.fullDocument.gst_no,
      status: log.data?.fullDocument.status,
      supplier_remarks: log.data?.fullDocument.supplier_remarks,
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: 'left' };
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export { GenerateSuppliersLogs };
