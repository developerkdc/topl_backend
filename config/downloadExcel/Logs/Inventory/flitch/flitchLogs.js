import exceljs from "exceljs";
import fs from "fs/promises";
import ApiError from "../../../../../utils/errors/apiError.js";
import dotenv from "dotenv/config";
export const createFlitchLogsExcel = async (newData) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("flitch-logs");
    const columns = [
      {
        header: "Inward Sr No",
        key: "inward_sr_no",
        width: 15,
      },
      { header: "Item Sr No", key: "item_sr_no", width: 15 },
      { header: "Item Name", key: "item_name", width: 20 },
      { header: "Supplier Item Name", key: "supplier_item_name", width: 20 },
      { header: "Supplier Flitch No", key: "supplier_flitch_no", width: 20 },
      { header: "Log No", key: "log_no", width: 15 },
      { header: "Flitch Code", key: "flitch_code", width: 15 },
      { header: "Flitch Formula ", key: "formula", width: 15 },
      // { header: "Formula", key: "formula", width: 20 },
      { header: "Length", key: "length", width: 10 },
      { header: "Width1", key: "width1", width: 10 },
      { header: "Width2", key: "width2", width: 10 },
      { header: "Width3", key: "width3", width: 10 },
      { header: "Height", key: "height", width: 10 },
      { header: "Flitch CMT", key: "flitch_cmt", width: 15 },
      { header: "Rate in Currency", key: "rate_in_currency", width: 20 },
      { header: "Rate in INR", key: "rate_in_inr", width: 20 },
      //Todo : add exchange rate
      { header: "Excahange Rate", key: "exchange_rate", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Remark", key: "remark", width: 20 },
      //   { header: "Invoice ID", key: "invoice_id", width: 30 },
      {
        header: "Inward Date",
        key: "inward_date",
        width: 20,
      },
      { header: "Created Date", key: "createdAt", width: 20 },
      { header: "Updated Date", key: "updatedAt", width: 20 },

      { header: "Currency", key: "currency", width: 10 },
      {
        header: "No of Workers",
        key: "no_of_workers",
        width: 15,
      },
      {
        header: "Shift",
        key: "shift",
        width: 10,
      },
      {
        header: "Working Hours",
        key: "working_hours",
        width: 15,
      },
      {
        header: "Supplier Name",
        key: "supplier_name",
        width: 30,
      },
      {
        header: "Supplier Type",
        key: "supplier_type",
        width: 20,
      },
      {
        header: "Branch Name",
        key: "branch_name",
        width: 25,
      },
      {
        header: "Branch Address",
        key: "address",
        width: 25,
      },
      {
        header: "City",
        key: "city",
        width: 20,
      },
      {
        header: "State",
        key: "state",
        width: 15,
      },
      {
        header: "Country",
        key: "country",
        width: 15,
      },
      {
        header: "Pincode",
        key: "pincode",
        width: 15,
      },
      {
        header: "GST Number",
        key: "gst_number",
        width: 20,
      },
      {
        header: "Web URL",
        key: "web_url",
        width: 25,
      },
      {
        header: "Invoice Date",
        key: "invoice_date",
        width: 20,
      },
      {
        header: "Invoice No",
        key: "invoice_no",
        width: 20,
      },
      {
        header: "Total Item Amount",
        key: "total_item_amount",
        width: 20,
      },
      {
        header: "Transporter Details",
        key: "transporter_details",
        width: 30,
      },
      {
        header: "GST Percentage",
        key: "gst_percentage",
        width: 20,
      },
      {
        header: "Invoice Value with GST",
        key: "invoice_value_with_gst",
        width: 20,
      },
      {
        header: "Invoice Remark",
        key: "invoice_remark",
        width: 20,
      },
    ];

    worksheet.columns = columns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        const rowData = {
          supplier_item_name: data.supplier_item_name,
          supplier_flitch_no: data.supplier_flitch_no,
          // item_id: data.item_id,
          item_sr_no: data.item_sr_no,
          item_name: data.item_name,
          log_no: data.log_no,
          flitch_code: data.flitch_code,
          // formula_type: data.flitch_formula.formula_type,
          formula: data.flitch_formula,
          length: data.length,
          width1: data.width1,
          width2: data.width2,
          width3: data.width3,
          height: data.height,
          flitch_cmt: data.flitch_cmt,
          rate_in_currency: data.rate_in_currency,
          rate_in_inr: data.rate_in_inr,
          exchange_rate: data.exchange_rate,
          amount: data.amount,
          remark: data.remark,
          // invoice_id: data.invoice_id,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          inward_sr_no: data.flitch_invoice_details.inward_sr_no,
          inward_date: data.flitch_invoice_details.inward_date,
          currency: data.flitch_invoice_details.currency,
          no_of_workers:
            data.flitch_invoice_details.workers_details.no_of_workers,
          shift: data.flitch_invoice_details.workers_details.shift,
          working_hours:
            data.flitch_invoice_details.workers_details.working_hours,
          supplier_name:
            data.flitch_invoice_details.supplier_details.company_details
              .supplier_name,
          supplier_type:
            data.flitch_invoice_details.supplier_details.company_details
              .supplier_type,
          branch_name:
            data.flitch_invoice_details.supplier_details.branch_detail
              .branch_name,
          address:
            data.flitch_invoice_details.supplier_details.branch_detail.address,
          city: data.flitch_invoice_details.supplier_details.branch_detail.city,
          state:
            data.flitch_invoice_details.supplier_details.branch_detail.state,
          country:
            data.flitch_invoice_details.supplier_details.branch_detail.country,
          pincode:
            data.flitch_invoice_details.supplier_details.branch_detail.pincode,
          gst_number:
            data.flitch_invoice_details.supplier_details.branch_detail
              .gst_number,
          web_url:
            data.flitch_invoice_details.supplier_details.branch_detail.web_url,
          invoice_date:
            data.flitch_invoice_details.invoice_Details.invoice_date,
          invoice_no: data.flitch_invoice_details.invoice_Details.invoice_no,
          total_item_amount:
            data.flitch_invoice_details.invoice_Details.total_item_amount,
          transporter_details:
            data.flitch_invoice_details.invoice_Details.transporter_details,
          gst_percentage:
            data.flitch_invoice_details.invoice_Details.gst_percentage,
          invoice_value_with_gst:
            data.flitch_invoice_details.invoice_Details.invoice_value_with_gst,
          invoice_remark: data.flitch_invoice_details.invoice_Details.remark,
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log("err creatig flitch excel => ", error.message);
      }
    });

    const filepath =
      "public/upload/reports/inventory/flitch/flitch-inventory-report.xlsx";
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Flitch-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/flitch/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log("link => ", link);
    // return res.json(new ApiResponse(200, "Excel created successfully...", link))
    return link;
  } catch (error) {
    throw new ApiError(500, error.message, error);
  }
};
