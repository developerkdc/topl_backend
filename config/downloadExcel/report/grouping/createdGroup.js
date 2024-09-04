import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../../utils/date/date.js";

const GenerateGroupingReport = async (details) => {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Created Group Reports");

  // Add headers to the worksheet
  const headers = [
    { header: "Date", key: "date_of_grouping", width: 25 },
    { header: "Item Name", key: "item_name", width: 25 },
    { header: "Item Type", key: "item_code", width: 25 },
    { header: "Group No.", key: "group_no", width: 15 },
    {
      header: "Original Pattas",
      key: "group_no_of_pattas_original",
      width: 15,
    },
    {
      header: "Available Pattas.",
      key: "group_no_of_pattas_available",
      width: 15,
    },
    { header: "No. of Pcs", key: "group_pcs", width: 15 },
    { header: "Length", key: "group_length", width: 15 },
    { header: "Width", key: "group_width", width: 15 },
    { header: "Group Sqm", key: "group_sqm_available", width: 15 },
    { header: "Total Item Sqm", key: "total_item_sqm_available", width: 15 },
    { header: "Pallet No. ", key: "group_pallete_no", width: 15 },
    { header: "Physical Location ", key: "group_physical_location", width: 15 },
    { header: "Grade ", key: "group_grade", width: 15 },
    { header: "Orientation", key: "orientation", width: 15 },
    { header: "Book type ", key: "book_type", width: 15 },
    { header: "Log No", key: "log_no", width: 15 },
    { header: "Bundle No", key: "bundle_no", width: 15 },
    { header: "Length", key: "length", width: 15 },
    { header: "Width", key: "width", width: 15 },
    { header: "Original Pattas", key: "original_pattas", width: 15 },
    { header: "Original Sqm", key: "original_sqm", width: 15 },
    { header: "Avl Pattas", key: "avl_pattas", width: 15 },
    { header: "Avl Total Sqm", key: "avl_total_sqm", width: 15 },
    { header: "Grade", key: "grade", width: 15 },
    { header: "Pallet No", key: "pallet_no", width: 15 },
    { header: "Physical Location", key: "physical_location", width: 15 },
    { header: "Avl Natural", key: "avl_natural", width: 15 },
    { header: "Avl Dyed", key: "avl_dyed", width: 15 },
    { header: "Avl Smoked", key: "avl_smoked", width: 15 },
    { header: "Total", key: "total", width: 15 },
    { header: "Remarks", key: "remark", width: 15 },
  ];
  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(), // Convert to uppercase
      key: header.key,
      width: header.width,
    };
  });
  details.forEach((order) => {
    order.item_details.forEach((item) => {
      const row = worksheet.addRow({
        date_of_grouping: convDate(order.date_of_grouping),
        item_name: item.item_name,
        item_code: item.item_code,
        group_no: order.group_no,
        group_pcs: order.group_pcs,
        group_no_of_pattas_available: order.group_no_of_pattas_available,
        group_no_of_pattas_original: order.group_no_of_pattas_original,
        group_length: order.group_length,
        group_width: order.group_width,
        group_sqm_available: order.group_sqm_available,
        total_item_sqm_available: order.total_item_sqm_available,
        group_pallete_no: order.group_pallete_no,
        group_physical_location: order.group_physical_location,
        group_grade: order.group_grade,
        orientation: order.orientation,
        book_type: order.book_type,
        log_no: item?.item_log_no,
        bundle_no: item?.item_bundle_no,
        length: item?.item_length,
        width: item?.item_width,
        original_pattas: item?.item_received_pattas,
        original_sqm: item?.item_received_sqm,
        avl_pattas: item?.item_available_pattas,
        avl_total_sqm: item?.item_available_sqm,
        grade: item?.item_grade,
        pallet_no: item?.item_pallete_no,
        physical_location: item?.item_physical_location,
        avl_natural: item?.item_available_quantities?.natural,
        avl_dyed: item?.item_available_quantities?.dyed,
        avl_smoked: item?.item_available_quantities?.smoked,
        total: item?.item_available_quantities?.total,
        remark: order?.group_remarks,
      });
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: "left" };
      });
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  // Generate a temporary file path
  const filePath =
    "public/reports/Group/CreatedGroupReportExcel/created_group_report.xlsx";

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `created_group_report${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/Group/CreatedGroupReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateGroupingReport };
