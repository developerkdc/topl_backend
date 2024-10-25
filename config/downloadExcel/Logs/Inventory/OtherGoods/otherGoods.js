import exceljs from "exceljs";
import fs from "fs/promises";
import ApiError from "../../../../../utils/errors/apiError.js";
import dotenv from "dotenv/config";

export const GenerateOtherGoodsLogs = async (newData) => {
  try {
    const folderPath = "public/upload/reports/inventory/othergoods";
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("othergood-logs");

    const OtherGoodsColumns = [
      { header: "Inward Sr No", key: "inward_sr_no", width: 15 },
      { header: "Inward Date", key: "inward_date", width: 15 },
      { header: "Item Sr No", key: "item_sr_no", width: 15 },
      { header: "Item Name", key: "item_name", width: 20 },
      { header: "Item Description", key: "item_description", width: 20 },
      { header: "Item Subcategory", key: "subcategory_name", width: 20 },
      { header: "Department Name", key: "department_name", width: 25 },
      { header: "Machine Name", key: "machine_name", width: 25 },
      { header: "Brand Name", key: "brand_name", width: 15 },
      { header: "Total Quantity", key: "total_quantity", width: 15 },
      { header: "Rate In Currency", key: "rate_in_currency", width: 20 },
      { header: "Exchange Rate", key: "exchange_rate", width: 15 },
      { header: "Rate in INR", key: "rate_in_inr", width: 15 },
      { header: "Amount", key: "amount", width: 20 },
      { header: "Supplier Name", key: "supplier_name", width: 25 },
      { header: "Supplier Type", key: "supplier_type", width: 20 },
      { header: "Contact Person Name", key: "contact_person_name", width: 25 },
      {
        header: "Contact Person Email",
        key: "contact_person_email",
        width: 25,
      },
      { header: "Contact Person Designation", key: "contact_person_designation", width: 25 },
      {
        header: "Contact Person Mobile Number",
        key: "contact_person_mobile_no",
        width: 25,
      },
      { header: "Invoice No", key: "invoice_no", width: 20 },
      { header: "Invoice Date", key: "invoice_date", width: 20 },
      { header: "Remark", key: "remark", width: 20 },
      { header: "Created By", key: "created_by", width: 25 },
    ];

    worksheet.columns = OtherGoodsColumns;

    newData.forEach((data) => {
      // data.othergoods_invoice_details.supplier_details.branch_detail.contact_person.forEach(
      //   (person) => {
      worksheet.addRow({
        inward_sr_no: data?.othergoods_invoice_details?.inward_sr_no,
        inward_date: data?.othergoods_invoice_details?.inward_date,
        item_sr_no: data?.item_sr_no,
        item_name: data?.item_name,
        item_description: data?.item_description,
        subcategory_name: data?.item_sub_category_name,
        department_name: data?.department_name,
        machine_name: data?.machine_name,
        brand_name: data?.brand_name,
        total_quantity: data?.total_quantity,
        rate_in_currency: data?.rate_in_currency || "-",
        exchange_rate: data?.exchange_rate || "-",
        rate_in_inr: data?.rate_in_inr || "-",
        amount: data?.amount,
        supplier_name:
          data?.othergoods_invoice_details?.supplier_details?.company_details
            .supplier_name,
        supplier_type:
          data?.othergoods_invoice_details?.supplier_details?.company_details
            .supplier_type,
        contact_person_name: data?.othergoods_invoice_details?.supplier_details?.branch_detail?.contact_person[0]?.name,
        contact_person_email: data?.othergoods_invoice_details?.supplier_details?.branch_detail?.contact_person[0]?.email,
        contact_person_designation: data?.othergoods_invoice_details?.supplier_details?.branch_detail?.contact_person[0]?.designation,
        contact_person_mobile_no: data?.othergoods_invoice_details?.supplier_details?.branch_detail?.contact_person[0]?.mobile_number,
        invoice_no:
          data?.othergoods_invoice_details?.invoice_Details?.invoice_no,
        invoice_date: new Date(
          data?.othergoods_invoice_details?.invoice_Details?.invoice_date
        ).toLocaleDateString(),
        remark: data?.remark,
        created_by:
          data?.created_user?.first_name + " " + data?.created_user?.last_name,
      });
    }
    );
    // });

    const filepath =
      "public/upload/reports/inventory/othergoods/othergoods-inventory-report.xlsx";
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `OTHERGOODS-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/othergoods/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log("link => ", link);
    return link;
  } catch (error) {
    throw new ApiError("Error generating Excel file", 500, error);
  }
};
