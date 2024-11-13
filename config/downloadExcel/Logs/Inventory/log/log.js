import exceljs from "exceljs";
import fs from "fs/promises";
import ApiError from "../../../../../utils/errors/apiError.js";
import dotenv from "dotenv/config";

export const createLogLogsExcel = async (newData) => {
  try {
    const folderPath = "public/upload/reports/inventory/log";
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("log-logsreport");

    const logColumns = [
      { header: "Inward Sr No", key: "inward_sr_no", width: 15 },
      { header: "Inward Date", key: "inward_date", width: 15 },
      { header: "Item Sr No", key: "item_sr_no", width: 15 },
      { header: "Item Name", key: "item_name", width: 20 },
      { header: "Supplier Item Name", key: "supplier_item_name", width: 20 },
      { header: "Log No", key: "log_no", width: 10 },
      { header: "Log Formula", key: "log_formula", width: 15 },
      { header: "Invoice Length", key: "invoice_length", width: 15 },
      { header: "Invoice Diameter", key: "invoice_diameter", width: 15 },
      { header: "Invoice CMT", key: "invoice_cmt", width: 15 },
      { header: "Indian CMT", key: "indian_cmt", width: 15 },
      { header: "Physical Length", key: "physical_length", width: 15 },
      { header: "Physical Diameter", key: "physical_diameter", width: 15 },
      { header: "Physical CMT", key: "physical_cmt", width: 15 },
      { header: "Exchange Rate", key: "exchange_rate", width: 15 },
      { header: "Rate in Currency", key: "rate_in_currency", width: 20 },
      { header: "Rate in INR", key: "rate_in_inr", width: 20 },

      { header: "Amount", key: "amount", width: 20 },
      { header: "Remark", key: "remark", width: 20 },
      { header: "Created Date", key: "createdAt", width: 20 },
      { header: "Updated Date", key: "updatedAt", width: 20 },
      { header: "Currency", key: "currency", width: 10 },
      { header: "No of Workers", key: "no_of_workers", width: 15 },
      { header: "Shift", key: "shift", width: 10 },
      { header: "Working Hours", key: "working_hours", width: 15 },
      { header: "Supplier Name", key: "supplier_name", width: 30 },
      { header: "Supplier Type", key: "supplier_type", width: 20 },
      { header: "Branch Name", key: "branch_name", width: 25 },
      { header: "Contact Person Name", key: "contact_person_name", width: 25 },
      {
        header: "Contact Person Email",
        key: "contact_person_email",
        width: 25,
      },
      {
        header: "Contact Person Mobile Number",
        key: "contact_person_mobile_number",
        width: 25,
      },
      {
        header: "Contact Person Designation",
        key: "contact_person_designation",
        width: 25,
      },
      { header: "Branch Address", key: "address", width: 25 },
      { header: "City", key: "city", width: 20 },
      { header: "State", key: "state", width: 15 },
      { header: "Country", key: "country", width: 15 },
      { header: "Pincode", key: "pincode", width: 15 },
      { header: "GST Number", key: "gst_number", width: 20 },
      { header: "Web URL", key: "web_url", width: 25 },
      { header: "Invoice Date", key: "invoice_date", width: 20 },
      { header: "Invoice No", key: "invoice_no", width: 20 },
      { header: "Total Item Amount", key: "total_item_amount", width: 20 },
      { header: "Transporter Details", key: "transporter_details", width: 30 },
      { header: "GST Percentage", key: "gst_percentage", width: 20 },
      { header: "GST Value", key: "gst_val", width: 20 },
      {
        header: "Invoice Value with GST",
        key: "invoice_value_with_gst",
        width: 20,
      },
      { header: "Invoice Remark", key: "invoice_remark", width: 20 },
    ];

    worksheet.columns = logColumns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      let contactPersonData = [];
      data?.supplier_details?.branch_detail?.contact_person?.forEach((cp) => {
        contactPersonData.push({
          contact_person_name: cp.name,
          contact_person_email: cp.email,
          contact_person_mobile_number: cp.mobile_number,
          contact_person_designation: cp.designation,
        });
      });

      const rowData = {
        inward_sr_no: data.log_invoice_details.inward_sr_no,
        item_sr_no: data.item_sr_no,
        item_name: data.item_name,
        supplier_item_name: data.supplier_item_name,
        log_no: data.log_no,
        log_formula: data.log_formula,
        invoice_length: data.invoice_length,
        invoice_diameter: data.invoice_diameter,
        invoice_cmt: data.invoice_cmt,
        indian_cmt: data.indian_cmt,
        physical_length: data.physical_length,
        physical_diameter: data.physical_diameter,
        physical_cmt: data.physical_cmt,
        exchange_rate: data.exchange_rate,
        rate_in_currency: data.rate_in_currency,
        rate_in_inr: data.rate_in_inr,

        amount: data.amount,
        remark: data.remark,
        inward_date: new Date(
          data.log_invoice_details.inward_date
        ).toLocaleDateString(),
        createdAt: new Date(
          data?.log_invoice_details?.createdAt
        ).toLocaleDateString(),
        updatedAt: new Date(
          data?.log_invoice_details.updatedAt
        ).toLocaleDateString(),
        currency: data.log_invoice_details.currency,
        no_of_workers: data.log_invoice_details.workers_details.no_of_workers,
        shift: data.log_invoice_details.workers_details.shift,
        working_hours: data.log_invoice_details.workers_details.working_hours,
        supplier_name: data.supplier_details.company_details.supplier_name,
        supplier_type: data.supplier_details.company_details.supplier_type,
        branch_name: data.supplier_details.branch_detail.branch_name,
        contact_person_name: contactPersonData
          .map((cp) => cp.contact_person_name)
          .join(", "),
        contact_person_email: contactPersonData
          .map((cp) => cp.contact_person_email)
          .join(", "),
        contact_person_mobile_number: contactPersonData
          .map((cp) => cp.contact_person_mobile_number)
          .join(", "),
        contact_person_designation: contactPersonData
          .map((cp) => cp.contact_person_designation)
          .join(", "),
        address: data.supplier_details.branch_detail.address,
        city: data.supplier_details.branch_detail.city,
        state: data.supplier_details.branch_detail.state,
        country: data.supplier_details.branch_detail.country,
        pincode: data.supplier_details.branch_detail.pincode,
        gst_number: data.supplier_details.branch_detail.gst_number,
        web_url: data.supplier_details.branch_detail.web_url,
        invoice_date: new Date(
          data.log_invoice_details.invoice_Details.invoice_date
        ).toLocaleDateString(),
        invoice_no: data.log_invoice_details.invoice_Details.invoice_no,
        total_item_amount:
          data.log_invoice_details.invoice_Details.total_item_amount,
        transporter_details:
          data.log_invoice_details.invoice_Details.transporter_details,
        gst_percentage: data.log_invoice_details.invoice_Details.gst_percentage,
        gst_val: data?.log_invoice_details?.invoice_Details?.gst_value,
        invoice_value_with_gst:
          data.log_invoice_details.invoice_Details.invoice_value_with_gst,
        invoice_remark: data.log_invoice_details.invoice_Details.remark,
      };

      worksheet.addRow(rowData);
    });

    const filepath =
      "public/upload/reports/inventory/log/log-inventory-report.xlsx";
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `LOG-Inventory-report-${timeStamp}.xlsx`;
    const destinationPath = `public/upload/reports/inventory/log/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log("link => ", link);
    return link;
  } catch (error) {
    throw new ApiError("Error generating  logs Excel file", 500);
  }
};
