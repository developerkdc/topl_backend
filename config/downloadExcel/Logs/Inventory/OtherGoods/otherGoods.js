// import exceljs from "exceljs";
// import fs from "fs/promises";
// import ApiError from "../../../../../utils/errors/apiError.js";
// import dotenv from "dotenv/config";
// export const GenerateOtherGoodsLogs = async (newData) => {
//   try {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet("flitch-logs");
//     const OtherGoodsColumns = [
//       { header: "Inward Sr No", key: "inward_sr_no", width: 15 },
//       { header: "Item Sr No", key: "item_sr_no", width: 15 },
//       { header: "Item Name", key: "item_name", width: 20 },
//       { header: "Supplier Item Name", key: "supplier_item_name", width: 20 },
//       { header: "MDF Type", key: "mdf_type", width: 20 },
//       { header: "MDF Sub Type", key: "mdf_sub_type", width: 20 },
//       { header: "Pallet Number", key: "pallet_number", width: 20 },
//       { header: "Length", key: "length", width: 10 },
//       { header: "Width", key: "width", width: 10 },
//       { header: "Thickness", key: "thickness", width: 10 },
//       { header: "Sheets", key: "sheets", width: 10 },
//       { header: "Total Sq Meter", key: "total_sq_meter", width: 15 },
//       { header: "Rate in Currency", key: "rate_in_currency", width: 20 },
//       { header: "Rate in INR", key: "rate_in_inr", width: 20 },
//       { header: "Exchange Rate", key: "exchange_rate", width: 15 }, // exchange rate added
//       { header: "Amount", key: "amount", width: 15 },
//       { header: "Remark", key: "remark", width: 20 },
//       //   { header: "Invoice ID", key: "invoice_id", width: 30 },
//       { header: "Inward Date", key: "inward_date", width: 20 },
//       { header: "Created Date", key: "createdAt", width: 20 },
//       { header: "Updated Date", key: "updatedAt", width: 20 },
//       { header: "Currency", key: "currency", width: 10 },
//       { header: "No of Workers", key: "no_of_workers", width: 15 },
//       { header: "Shift", key: "shift", width: 10 },
//       { header: "Working Hours", key: "working_hours", width: 15 },
//       { header: "Supplier Name", key: "supplier_name", width: 30 },
//       { header: "Supplier Type", key: "supplier_type", width: 20 },
//       { header: "Branch Name", key: "branch_name", width: 25 },
//       { header: "Branch Address", key: "address", width: 25 },
//       { header: "City", key: "city", width: 20 },
//       { header: "State", key: "state", width: 15 },
//       { header: "Country", key: "country", width: 15 },
//       { header: "Pincode", key: "pincode", width: 15 },
//       { header: "GST Number", key: "gst_number", width: 20 },
//       { header: "Web URL", key: "web_url", width: 25 },
//       { header: "Invoice Date", key: "invoice_date", width: 20 },
//       { header: "Invoice No", key: "invoice_no", width: 20 },
//       { header: "Total Item Amount", key: "total_item_amount", width: 20 },
//       { header: "Transporter Details", key: "transporter_details", width: 30 },
//       { header: "GST Percentage", key: "gst_percentage", width: 20 },
//       {
//         header: "Invoice Value with GST",
//         key: "invoice_value_with_gst",
//         width: 20,
//       },
//       { header: "Invoice Remark", key: "invoice_remark", width: 20 },
//     ];

//     worksheet.columns = OtherGoodsColumns;
//     worksheet.getRow(1).eachCell((cell) => {
//       cell.font = { bold: true };
//     });

//     newData?.forEach((data) => {
//       try {
//         const rowData = {
//           //   inward_sr_no:  data.invoice_Details.,
//           supplier_item_name: data.supplier_item_name,
//           item_sr_no: data.item_sr_no,
//           item_name: data.item_name,
//           mdf_type: data.mdf_type,
//           mdf_sub_type: data.mdf_sub_type,
//           pallet_number: data.pallet_number,
//           length: data.length,
//           width: data.width,
//           thickness: data.thickness,
//           sheets: data.sheets,
//           total_sq_meter: data.total_sq_meter,
//           rate_in_currency: data.rate_in_currency,
//           exchange_rate: data.exchange_rate,
//           rate_in_inr: data.rate_in_inr,
//           amount: data.amount,
//           remark: data.remark,
//           //   invoice_id: data.invoice_id,
//           createdAt: data.createdAt,
//           updatedAt: data.updatedAt,
//           inward_sr_no: data.mdf_invoice_details.inward_sr_no,
//           inward_date: data.mdf_invoice_details.inward_date,
//           currency: data.mdf_invoice_details.currency,
//           no_of_workers: data.workers_details.no_of_workers,
//           shift: data.workers_details.shift,
//           working_hours: data.workers_details.working_hours,
//           supplier_name: data.supplier_details.company_details.supplier_name,
//           supplier_type: data.supplier_details.company_details.supplier_type,
//           branch_name: data.supplier_details.branch_detail.branch_name,
//           address: data.supplier_details.branch_detail.address,
//           city: data.supplier_details.branch_detail.city,
//           state: data.supplier_details.branch_detail.state,
//           country: data.supplier_details.branch_detail.country,
//           pincode: data.supplier_details.branch_detail.pincode,
//           gst_number: data.supplier_details.branch_detail.gst_number,
//           web_url: data.supplier_details.branch_detail.web_url,
//           invoice_date: data.invoice_Details.invoice_date,
//           invoice_no: data.invoice_Details.invoice_no,
//           total_item_amount: data.invoice_Details.total_item_amount,
//           transporter_details: data.invoice_Details.transporter_details,
//           gst_percentage: data.invoice_Details.gst_percentage,
//           invoice_value_with_gst: data.invoice_Details.invoice_value_with_gst,
//           invoice_remark: data.invoice_Details.remark,
//         };

//         worksheet.addRow(rowData);
//       } catch (error) {
//         console.log("Error creating othergoods excel => ", error.message);
//       }
//     });

//     const filepath =
//       "public/upload/reports/inventory/othergoods/othergoods-inventory-report.xlsx";
//     await workbook.xlsx.writeFile(filepath);

//     const timeStamp = new Date().getTime();
//     const dwnldFileName = `OtherGoods-Inventory-report-${timeStamp}.xlsx`;

//     const destinationPath = `public/upload/reports/inventory/othergoods/${dwnldFileName}`;
//     await fs.rename(filepath, destinationPath);

//     const link = `${process.env.APP_URL}${destinationPath}`;
//     console.log("link => ", link);
//     return link;
//   } catch (error) {
//     throw new ApiError(500, error.message, error);
//   }
// };

// // export { GenerateOtherGoodsLogs };
import exceljs from "exceljs";
import fs from "fs/promises";
import ApiError from "../../../../../utils/errors/apiError.js";
import dotenv from "dotenv/config";

export const GenerateOtherGoodsLogs = async (newData) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("flitch-logs");

    // Define columns for the worksheet
    const OtherGoodsColumns = [
      { header: "Inward Sr No", key: "inward_sr_no", width: 15 },
      { header: "Item Sr No", key: "item_sr_no", width: 15 },
      { header: "Item Name", key: "item_name", width: 20 },
      { header: "Item Sub Type", key: "item_sub_type", width: 20 },
      { header: "Department Name", key: "department_name", width: 25 },
      { header: "Machine Name", key: "machine_name", width: 25 },
      { header: "Brand Name", key: "brand_name", width: 15 },
      { header: "Total Quantity", key: "total_quantity", width: 15 },
      { header: "Rate In Currency", key: "rate_in_currency", width: 20 },
      { header: "Exchange Rate", key: "exchange_rate", width: 15 },
      { header: "Amount", key: "amount", width: 20 },
      { header: "Supplier Name", key: "supplier_name", width: 25 },
      { header: "Supplier Type", key: "supplier_type", width: 20 },
      { header: "Contact Person Name", key: "contact_person_name", width: 25 },
      {
        header: "Contact Person Email",
        key: "contact_person_email",
        width: 25,
      },
      { header: "Invoice No", key: "invoice_no", width: 20 },
      { header: "Invoice Date", key: "invoice_date", width: 20 },
      { header: "Remark", key: "remark", width: 20 },
      { header: "Created By", key: "created_by", width: 25 },
    ];

    worksheet.columns = OtherGoodsColumns;

    // Add rows to the worksheet based on the data
    newData.forEach((data) => {
      data.othergoods_invoice_details.supplier_details.branch_detail.contact_person.forEach(
        (person) => {
          worksheet.addRow({
            inward_sr_no: data.othergoods_invoice_details.inward_sr_no,
            item_sr_no: data.item_sr_no,
            item_name: data.item_name,
            item_sub_type: data.item_sub_type,
            department_name: data.department_name,
            machine_name: data.machine_name,
            brand_name: data.brand_name,
            total_quantity: data.total_quantity,
            rate_in_currency: data.rate_in_currency,
            exchange_rate: data.exchange_rate,
            amount: data.amount,
            supplier_name:
              data.othergoods_invoice_details.supplier_details.company_details
                .supplier_name,
            supplier_type:
              data.othergoods_invoice_details.supplier_details.company_details
                .supplier_type,
            contact_person_name: person.name,
            contact_person_email: person.email,
            invoice_no:
              data.othergoods_invoice_details.invoice_Details.invoice_no,
            invoice_date: new Date(
              data.othergoods_invoice_details.invoice_Details.invoice_date
            ).toLocaleDateString(),
            remark: data.remark,
            created_by:
              data.created_user.first_name + " " + data.created_user.last_name,
          });
        }
      );
    });

    // Write the workbook to a file
    const filePath = `./other_goods_logs_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    console.log("Excel file created successfully at:", filePath);
    return filePath;
  } catch (error) {
    throw new ApiError("Error generating Excel file", 500, error);
  }
};
