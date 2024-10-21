import exceljs from "exceljs";
import fs from "fs/promises";
import ApiError from "../../../../../utils/errors/apiError.js";
import dotenv from "dotenv/config";
export const createMdfLogsExcel = async (newData) => {
  try {
    const folderPath = "public/upload/reports/inventory/mdf";
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("flitch-logs");
    const mdfColumns = [
      { header: "Inward Sr No", key: "inward_sr_no", width: 15 },
      { header: "Inward Date", key: "inward_date", width: 20 },
      { header: "Item Sr No", key: "item_sr_no", width: 15 },
      { header: "Item Name", key: "item_name", width: 20 },
      { header: "Supplier Item Name", key: "supplier_item_name", width: 20 },
      { header: "MDF Type", key: "mdf_type", width: 20 },
      { header: "MDF Sub Type", key: "mdf_sub_type", width: 20 },
      { header: "Pallet Number", key: "pallet_number", width: 20 },
      { header: "Length", key: "length", width: 10 },
      { header: "Width", key: "width", width: 10 },
      { header: "Thickness", key: "thickness", width: 10 },
      { header: "Sheets", key: "sheets", width: 10 },
      { header: "Total Sq Meter", key: "total_sq_meter", width: 15 },
      { header: "Rate in Currency", key: "rate_in_currency", width: 20 },
      { header: "Rate in INR", key: "rate_in_inr", width: 20 },
      { header: "Exchange Rate", key: "exchange_rate", width: 15 }, // exchange rate added
      { header: "Amount", key: "amount", width: 15 },
      { header: "Remark", key: "remark", width: 20 },
      //   { header: "Invoice ID", key: "invoice_id", width: 30 },

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
        key: "contact_person_mobile_no",
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
      {
        header: "Invoice Value with GST",
        key: "invoice_value_with_gst",
        width: 20,
      },
      { header: "Invoice Remark", key: "invoice_remark", width: 20 },
    ];

    worksheet.columns = mdfColumns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        // let contactPersonData = [];

        // data?.supplier_details?.branch_detail?.contact_person?.forEach((cp) => {
        //   contactPersonData.push({
        //     contact_person_name: cp.name,
        //     contact_person_email: cp.email,
        //     contact_person_mobile_number: cp.mobile_number,
        //     contact_person_designation: cp.designation,
        //   });
        // });

        // const contactPersonNames = contactPersonData
        //   .map((cp) => cp.contact_person_name)
        //   .join(", ");
        // const contactPersonEmails = contactPersonData
        //   .map((cp) => cp.contact_person_email)
        //   .join(", ");
        // const contactPersonMobileNumbers = contactPersonData
        //   .map((cp) => cp.contact_person_mobile_number)
        //   .join(", ");
        // const contactPersonDesignations = contactPersonData
        //   .map((cp) => cp.contact_person_designation)
        //   .join(", ");

        const rowData = {
          //   inward_sr_no:  data.invoice_Details.,
          supplier_item_name: data.supplier_item_name,
          item_sr_no: data.item_sr_no,
          item_name: data.item_name,
          mdf_type: data.mdf_type,
          mdf_sub_type: data.item_sub_category_name,
          pallet_number: data.pallet_number,
          length: data.length,
          width: data.width,
          thickness: data.thickness,
          sheets: data.sheets,
          total_sq_meter: data.total_sq_meter,
          rate_in_currency: data.rate_in_currency,
          exchange_rate: data.exchange_rate,
          rate_in_inr: data.rate_in_inr,
          amount: data.amount,
          remark: data.remark,
          //   invoice_id: data.invoice_id,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          inward_sr_no: data.mdf_invoice_details.inward_sr_no,
          inward_date: data.mdf_invoice_details.inward_date,
          currency: data.mdf_invoice_details.currency,
          no_of_workers: data.workers_details.no_of_workers,
          shift: data.workers_details.shift,
          working_hours: data.workers_details.working_hours,
          supplier_name: data.supplier_details.company_details.supplier_name,
          supplier_type: data.supplier_details.company_details.supplier_type,
          branch_name: data.supplier_details.branch_detail.branch_name,

          // contact_person_name: contactPersonNames,
          // contact_person_email: contactPersonEmails,
          // contact_person_mobile_number: contactPersonMobileNumbers,
          // contact_person_designation: contactPersonDesignations,
          contact_person_name: data.mdf_invoice_details.supplier_details.branch_detail.contact_person[0].name,
          contact_person_email: data.mdf_invoice_details.supplier_details.branch_detail.contact_person[0].email,
          contact_person_designation: data.mdf_invoice_details.supplier_details.branch_detail.contact_person[0].designation,
          contact_person_mobile_no: data.mdf_invoice_details.supplier_details.branch_detail.contact_person[0].mobile_number,


          address: data.supplier_details.branch_detail.address,
          city: data.supplier_details.branch_detail.city,
          state: data.supplier_details.branch_detail.state,
          country: data.supplier_details.branch_detail.country,
          pincode: data.supplier_details.branch_detail.pincode,
          gst_number: data.supplier_details.branch_detail.gst_number,
          web_url: data.supplier_details.branch_detail.web_url,
          invoice_date: data.invoice_Details.invoice_date,
          invoice_no: data.invoice_Details.invoice_no,
          total_item_amount: data.invoice_Details.total_item_amount,
          transporter_details: data.invoice_Details.transporter_details,
          gst_percentage: data.invoice_Details.gst_percentage,
          invoice_value_with_gst: data.invoice_Details.invoice_value_with_gst,
          invoice_remark: data.invoice_Details.remark,
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log("Error creating mdf excel => ", error.message);
      }
    });

    const filepath =
      "public/upload/reports/inventory/mdf/mdf-inventory-report.xlsx";
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `MDF-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/mdf/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log("link => ", link);
    return link;
  } catch (error) {
    throw new ApiError(500, error.message, error);
  }
};
