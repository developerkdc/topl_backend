import ExcelJS from "exceljs";

const GenerateRawVeneerExcel = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Supplier");
  const headerStyle = {
    font: { bold: true, color: { argb: "FFFFFF" } },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4B0082" }, // Dark blue background color
    },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: { horizontal: "center" },
  };

  const dataStyle = {
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: { horizontal: "left" },
  };

  // Define column widths based on header text
  const columnWidths = [
    20, 
    25,
    20,
  ];

  // Set the column widths based on the header text
  worksheet.columns = columnWidths.map((width) => ({ width }));

  // Add the header row
  worksheet
    .addRow([
      "item_id",
      "item_name",
      "item_code",
      "item_log_no",
      "item_bundle_no",
      "item_length",
      "item_width",
      "item_received_quantities_natural",
      "item_received_quantities_dyed",
      "item_received_quantities_smoked",
      "item_received_quantities_total",
      "item_available_quantities_natural",
      "item_available_quantities_dyed",
      "item_available_quantities_smoked",
      "item_available_quantities_total",
      "item_rejected_quantities_natural",
      "item_rejected_quantities_dyed",
      "item_rejected_quantities_smoked",
      "item_rejected_quantities_total",
      "supplier_name",
      "country",
      "state",
      "city",
      "pincode",
      "bill_address",
      "delivery_address",
      "contact_Person_name",
      "contact_Person_number",
      "country_code",
      "item_received_pattas",
      "item_received_sqm",
      "item_available_pattas",
      "item_available_sqm",
      "item_rejected_pattas",
      "item_rejected_sqm",
      "item_pallete_no",
      "item_physical_location",
      "item_grade",
      "item_rate_per_sqm",
      "item_remark",
      "created_employee_id",
    ])
    .eachCell((cell) => {
      cell.style = headerStyle;
    });

  // Loop through each supplier and add their data
  details.forEach((item) => {
    const rowData = [item._id, item.date_of_inward, item.status];

    worksheet.addRow(rowData).eachCell((cell) => {
      cell.style = dataStyle;
    });
  });

  const excelFilename = "raw_veneer.xlsx"; // You can give it a general name for multiple suppliers
  const t = await workbook.xlsx.writeFile(
    "public/upload/excel/" + excelFilename
  );
  const excelUrl = `${process.env.APP_URL}public/upload/excel/` + excelFilename;
  return excelUrl;
};
export { GenerateRawVeneerExcel };
