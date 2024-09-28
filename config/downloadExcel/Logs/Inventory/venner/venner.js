import exceljs from "exceljs";
import fs from "fs/promises";
import ApiError from "../../../../../utils/errors/apiError.js";
import dotenv from "dotenv/config";
export const createVeneerLogsExcel = async (newData) => {
  try {
    const folderPath = "public/upload/reports/inventory/venner";
    try {
      await fs.access(folderPath);
    } catch (error) {
      console.log("folder errrr => ", error);
      await fs.mkdir(folderPath, { recursive: true });
    }
    console.log("14");
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("venner-logs");
    const veneerColumns = [
      { header: "Inward Sr No", key: "inward_sr_no", width: 15 },
      { header: "Inward Date", key: "inward_date", width: 20 },
      { header: "Veneer Sr No", key: "veneer_sr_no", width: 15 },
      { header: "Item Name", key: "item_name", width: 20 },
      {
        header: "Item Sub Category Name",
        key: "item_sub_category_name",
        width: 20,
      }, // added item sub category name
      { header: "Log Code", key: "log_code", width: 15 }, // added log code
      { header: "Bundle Number", key: "bundle_number", width: 15 }, // added bundle number
      { header: "Pallet Number", key: "pallet_number", width: 20 },
      { header: "Length", key: "length", width: 10 },
      { header: "Width", key: "width", width: 10 },
      { header: "Thickness", key: "thickness", width: 10 },
      { header: "Number of Leaves", key: "number_of_leaves", width: 15 }, // added number of leaves
      { header: "Total Sq Meter", key: "total_sq_meter", width: 15 },
      { header: "Cut Name", key: "cut_name", width: 15 }, // added cut name
      { header: "Series Name", key: "series_name", width: 15 }, // added series name
      { header: "Grade Name", key: "grades_name", width: 15 }, // added grades name
      { header: "Rate in Currency", key: "rate_in_currency", width: 20 },
      { header: "Rate in INR", key: "rate_in_inr", width: 20 },
      { header: "Exchange Rate", key: "exchange_rate", width: 15 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Remark", key: "remark", width: 20 },
      { header: "Created Date", key: "createdAt", width: 20 },
      { header: "Updated Date", key: "updatedAt", width: 20 },
      { header: "Currency", key: "currency", width: 10 },
      { header: "No of Workers", key: "no_of_workers", width: 15 },
      { header: "Shift", key: "shift", width: 10 },
      { header: "Working Hours", key: "working_hours", width: 15 },
      { header: "Supplier Name", key: "supplier_name", width: 30 },
      { header: "Supplier Type", key: "supplier_type", width: 30 }, // now an array, adjust for display
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
      {
        header: "Invoice Value with GST",
        key: "invoice_value_with_gst",
        width: 20,
      },
      { header: "Invoice Remark", key: "invoice_remark", width: 20 },
      { header: "Port of Loading", key: "port_of_loading", width: 25 }, // new field
      { header: "Port of Discharge", key: "port_of_discharge", width: 25 }, // new field
      { header: "Bill of Lading", key: "bill_of_landing", width: 25 }, // new field
      { header: "Freight", key: "freight", width: 15 }, // new field
      { header: "Is Freight Included", key: "isFreightInclude", width: 20 }, // new field
      { header: "Load Unload", key: "load_unload", width: 15 }, // new field
      {
        header: "Is Load Unload Included",
        key: "isLoadUnloadInclude",
        width: 20,
      }, // new field
    ];

    worksheet.columns = veneerColumns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        let contactPersonData = [];

        data?.supplier_details?.branch_detail?.contact_person?.forEach((cp) => {
          contactPersonData.push({
            contact_person_name: cp.name,
            contact_person_email: cp.email,
            contact_person_mobile_number: cp.mobile_number,
            contact_person_designation: cp.designation,
          });
        });

        const contactPersonNames = contactPersonData
          .map((cp) => cp.contact_person_name)
          .join(", ");
        const contactPersonEmails = contactPersonData
          .map((cp) => cp.contact_person_email)
          .join(", ");
        const contactPersonMobileNumbers = contactPersonData
          .map((cp) => cp.contact_person_mobile_number)
          .join(", ");
        const contactPersonDesignations = contactPersonData
          .map((cp) => cp.contact_person_designation)
          .join(", ");

        const rowData = {
          inward_sr_no: data?.veneer_invoice_details?.inward_sr_no,
          inward_date: data?.veneer_invoice_details?.inward_date,
          supplier_item_name: data?.supplier_item_name,
          item_sr_no: data?.item_sr_no,
          item_name: data?.item_name,
          item_sub_category_name: data?.item_sub_category_name,
          log_code: data?.log_code,
          bundle_number: data?.bundle_number,
          pallet_number: data?.pallet_number,
          length: data?.length,
          width: data?.width,
          thickness: data?.thickness,
          number_of_leaves: data?.number_of_leaves,
          total_sq_meter: data?.total_sq_meter,
          cut_name: data?.cut_name,
          series_name: data?.series_name,
          grades_name: data?.grades_name,
          rate_in_currency: data?.rate_in_currency,
          rate_in_inr: data?.rate_in_inr,
          exchange_rate: data?.exchange_rate,
          amount: data?.amount,
          remark: data?.remark,
          createdAt: data?.createdAt,
          updatedAt: data?.updatedAt,
          currency: data?.veneer_invoice_details?.currency,
          no_of_workers:
            data?.veneer_invoice_details?.workers_details?.no_of_workers,
          shift: data?.veneer_invoice_details?.workers_details?.shift,
          working_hours:
            data?.veneer_invoice_details?.workers_details?.working_hours,
          supplier_name:
            data?.veneer_invoice_details?.supplier_details?.company_details
              ?.supplier_name,
          supplier_type:
            data?.veneer_invoice_details?.supplier_details?.company_details?.supplier_type?.join(
              ", "
            ), // handling array
          branch_name:
            data?.veneer_invoice_details?.supplier_details?.branch_detail
              ?.branch_name,
          contact_person_name: contactPersonNames, // Assuming these are pre-calculated
          contact_person_email: contactPersonEmails,
          contact_person_mobile_number: contactPersonMobileNumbers,
          contact_person_designation: contactPersonDesignations,
          address:
            data?.veneer_invoice_details?.supplier_details?.branch_detail
              ?.address,
          city: data?.veneer_invoice_details?.supplier_details?.branch_detail
            ?.city,
          state:
            data?.veneer_invoice_details?.supplier_details?.branch_detail
              ?.state,
          country:
            data?.veneer_invoice_details?.supplier_details?.branch_detail
              ?.country,
          pincode:
            data?.veneer_invoice_details?.supplier_details?.branch_detail
              ?.pincode,
          gst_number:
            data?.veneer_invoice_details?.supplier_details?.branch_detail
              ?.gst_number,
          web_url:
            data?.veneer_invoice_details?.supplier_details?.branch_detail
              ?.web_url,
          invoice_date:
            data?.veneer_invoice_details?.invoice_Details?.invoice_date,
          invoice_no: data?.veneer_invoice_details?.invoice_Details?.invoice_no,
          total_item_amount:
            data?.veneer_invoice_details?.invoice_Details?.total_item_amount,
          transporter_details:
            data?.veneer_invoice_details?.invoice_Details?.transporter_details,
          gst_percentage:
            data?.veneer_invoice_details?.invoice_Details?.gst_percentage,
          invoice_value_with_gst:
            data?.veneer_invoice_details?.invoice_Details
              ?.invoice_value_with_gst,
          invoice_remark: data?.veneer_invoice_details?.invoice_Details?.remark,
          port_of_loading:
            data?.veneer_invoice_details?.invoice_Details?.port_of_loading,
          port_of_discharge:
            data?.veneer_invoice_details?.invoice_Details?.port_of_discharge,
          bill_of_landing:
            data?.veneer_invoice_details?.invoice_Details?.bill_of_landing,
          freight: data?.veneer_invoice_details?.invoice_Details?.freight,
          isFreightInclude:
            data?.veneer_invoice_details?.invoice_Details?.isFreightInclude,
          load_unload:
            data?.veneer_invoice_details?.invoice_Details?.load_unload,
          isLoadUnloadInclude:
            data?.veneer_invoice_details?.invoice_Details?.isLoadUnloadInclude,
        };

        worksheet.addRow(rowData);
        console.log("called");
      } catch (error) {
        console.log("Error creating venner excel => ", error.message);
      }
    });

    const filepath =
      "public/upload/reports/inventory/venner/venner-inventory-report.xlsx";
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `VENNER-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/venner/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log("link => ", link);
    return link;
  } catch (error) {
    console.log("errr => ", error);
    throw new ApiError(error.message, 500);
  }
};
