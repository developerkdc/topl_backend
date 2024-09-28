import exceljs from "exceljs";
import fs from "fs/promises";
import ApiError from "../../../../../utils/errors/apiError.js";
import dotenv from "dotenv/config";

export const createFleeceLogsExcel = async (newData) => {
  try {
    const folderPath = "public/upload/reports/inventory/fleecePaper";
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log("Folder created:", folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("fleece-logs");

    const columns = [
      { header: "Inward Sr No", key: "inward_sr_no", width: 15 },
      { header: "Inward Date", key: "inward_date", width: 20 },
      { header: "Item Sr No", key: "item_sr_no", width: 15 },
      { header: "Item Name", key: "item_name", width: 20 },
      { header: "Supplier Item Name", key: "supplier_item_name", width: 20 },
      { header: "Length", key: "length", width: 10 },
      { header: "Width", key: "width", width: 10 },
      { header: "Thickness", key: "thickness", width: 10 },
      { header: "Number of Sheets", key: "number_of_sheets", width: 20 },
      { header: "Total Sq Meter", key: "total_sq_meter", width: 20 },
      { header: "Grade Name", key: "grade_name", width: 15 },
      { header: "Rate in Currency", key: "rate_in_currency", width: 20 },
      { header: "Rate in INR", key: "rate_in_inr", width: 20 },
      { header: "Exchange Rate", key: "exchange_rate", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
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
      { header: "Branch Address", key: "address", width: 25 },
      { header: "City", key: "city", width: 20 },
      { header: "State", key: "state", width: 15 },
      { header: "Country", key: "country", width: 15 },
      { header: "Pincode", key: "pincode", width: 15 },
      { header: "GST Number", key: "gst_number", width: 20 },
      { header: "Web URL", key: "web_url", width: 25 },
      { header: "Invoice No", key: "invoice_no", width: 20 },
      { header: "Total Item Amount", key: "total_item_amount", width: 20 },
      { header: "Transporter Details", key: "transporter_details", width: 30 },
      { header: "GST Percentage", key: "gst_percentage", width: 20 },
      {
        header: "Invoice Value with GST",
        key: "invoice_value_with_gst",
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
          inward_sr_no: data.fleece_invoice_details?.inward_sr_no,
          item_sr_no: data.item_sr_no,
          item_name: data.item_name,
          supplier_item_name: data.supplier_item_name,
          length: data.length,
          width: data.width,
          thickness: data.thickness,
          number_of_sheets: data.number_of_sheets,
          total_sq_meter: data.total_sq_meter,
          grade_name: data.grade_name,
          rate_in_currency: data.rate_in_currency,
          rate_in_inr: data.rate_in_inr,
          exchange_rate: data.exchange_rate,
          amount: data.amount,
          remark: data.remark,
          inward_date: data.fleece_invoice_details?.inward_date,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          currency: data.fleece_invoice_details?.currency,
          no_of_workers:
            data.fleece_invoice_details?.workers_details?.no_of_workers,
          shift: data.fleece_invoice_details?.workers_details?.shift,
          working_hours:
            data.fleece_invoice_details?.workers_details?.working_hours,
          supplier_name:
            data.fleece_invoice_details?.supplier_details?.company_details
              ?.supplier_name,
          supplier_type:
            data.fleece_invoice_details?.supplier_details?.company_details?.supplier_type?.join(
              ", "
            ),
          branch_name:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.branch_name,
          address:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.address,
          city: data.fleece_invoice_details?.supplier_details?.branch_detail
            ?.city,
          state:
            data.fleece_invoice_details?.supplier_details?.branch_detail?.state,
          country:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.country,
          pincode:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.pincode,
          gst_number:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.gst_number,
          web_url:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.web_url,
          invoice_no: data.fleece_invoice_details?.invoice_Details?.invoice_no,
          total_item_amount:
            data.fleece_invoice_details?.invoice_Details?.total_item_amount,
          transporter_details:
            data.fleece_invoice_details?.invoice_Details?.transporter_details,
          gst_percentage:
            data.fleece_invoice_details?.invoice_Details?.gst_percentage,
          invoice_value_with_gst:
            data.fleece_invoice_details?.invoice_Details
              ?.invoice_value_with_gst,
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log("Error creating fleece logs Excel => ", error.message);
      }
    });

    const filepath =
      "public/upload/reports/inventory/fleecePaper/fleece-inventory-report.xlsx";
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Fleece-Paper-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/fleecePaper/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log("File renamed from", filepath, "to", destinationPath);

    return link;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};
