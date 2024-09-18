import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../utils/date/date.js";

const GenerateUserLogs = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Users Logs");

  // Add headers to the worksheet
  const headers = [
    { header: "Date", key: "date", width: 20 },
    { header: "Operation Type", key: "operationType", width: 20 },
    { header: "Done By", key: "created_by", width: 30 },
    { header: "User Name", key: "user_name", width: 20 },
    { header: "Name", key: "name", width: 25 },
    { header: "Age", key: "age", width: 10 },
    { header: "Gender", key: "gender", width: 10 },
    { header: "Email ID", key: "email_id", width: 30 },
    { header: "Pincode", key: "pincode", width: 15 },
    { header: "Mobile No", key: "mobile_no", width: 20 },
    { header: "Country", key: "country", width: 20 },
    { header: "State", key: "state", width: 20 },
    { header: "City", key: "city", width: 20 },
    { header: "Address", key: "address", width: 40 },
    { header: "Blood Group", key: "blood_group", width: 10 },
    { header: "DOB", key: "dob", width: 20 },
    { header: "Status", key: "status", width: 10 },
    { header: "Role Name", key: "role_id", width: 30 },
    { header: "Remarks", key: "user_remarks", width: 30 },
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
      user_name: log.data.fullDocument.user_name,
      name: `${log.data.fullDocument.first_name} ${log.data.fullDocument.last_name} `,
      age: log.data.fullDocument.age,
      gender: log.data.fullDocument.gender,
      email_id: log.data.fullDocument.email_id,
      pincode: log.data.fullDocument.pincode,
      mobile_no: `${log.data.fullDocument.country_code} ${log.data.fullDocument.mobile_no}`,
      country: log.data.fullDocument.country,
      address: log.data.fullDocument.address,
      blood_group: log.data.fullDocument.blood_group,
      dob: convDate(log.data.fullDocument.dob),
      city: log.data.fullDocument.city,
      state: log.data.fullDocument.state,
      status: log.data.fullDocument.status,
      role_id: log.data.fullDocument.role_id.role_name,
      user_remarks: log.data.fullDocument.user_remarks,
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

export { GenerateUserLogs };
