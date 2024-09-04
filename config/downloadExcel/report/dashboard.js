import ExcelJS from "exceljs";
import fs from "fs/promises";
import convDate from "../../../utils/date/date.js";

const GenerateDashboardReport = async (details) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Dashboard Reports");
  // Add headers to the worksheet for both pcs and sqm

  const headers = [
    { header: "Date (Pcs)", key: "pcs_date", width: 15 },
    { header: "GROUPING (Pcs)", key: "group_pcs", width: 15 },
    { header: "CUTTING (Pcs)", key: "cutting_pcs", width: 15 },
    { header: "TAPPING (Pcs)", key: "tapping_pcs", width: 15 },
    { header: "PRESSING (Pcs)", key: "pressing_pcs", width: 15 },
    { header: "FINISHING (Pcs)", key: "finishing_pcs", width: 15 },
    { header: "DISPATCH RAW (Pcs)", key: "dispatch_raw_pcs", width: 15 },
    { header: "DISPATCH GROUP (Pcs)", key: "dispatch_group_pcs", width: 15 },
    { header: "", key: "", width: 15 }, // Spacer column
    { header: "Date (SQM)", key: "sqm_date", width: 15 },
    { header: "GROUPING (SQM)", key: "group_sqm", width: 15 },
    { header: "CUTTING (SQM)", key: "cutting_sqm", width: 15 },
    { header: "TAPPING (SQM)", key: "tapping_sqm", width: 15 },
    { header: "PRESSING (SQM)", key: "pressing_sqm", width: 15 },
    { header: "FINISHING (SQM)", key: "finishing_sqm", width: 15 },
    { header: "DISPATCH RAW (SQM)", key: "dispatch_raw_sqm", width: 15 },
    { header: "DISPATCH GROUP (SQM)", key: "dispatch_group_sqm", width: 15 },
  ];

  worksheet.columns = headers.map((header) => ({
    header: header.header.toUpperCase(),
    key: header.key,
    width: header.width,
    style: {
      border: {
        top: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
      },
      // Remove bottom border for spacer column
      ...(header.key === "" && { border: { bottom: { style: "none" } } }),
    },
  }));

  let totalGroupPcs = 0,
    totalCuttingPcs = 0,
    totalTappingPcs = 0,
    totalPressingPcs = 0,
    totalFinishingPcs = 0,
    totalDispatchRawPcs = 0,
    totalDispatchGroupPcs = 0;

  let totalGroupSqm = 0,
    totalCuttingSqm = 0,
    totalTappingSqm = 0,
    totalPressingSqm = 0,
    totalFinishingSqm = 0,
    totalDispatchRawSqm = 0,
    totalDispatchGroupSqm = 0;

  // Determine the maximum number of rows between pcs and sqm data
  const maxRows = Math.max(details.pcs.length, details.sqm.length);

  // Add rows for both pcs and sqm in parallel
  for (let i = 0; i < maxRows; i++) {
    const pcsOrder = details.pcs[i] || {};
    const sqmOrder = details.sqm[i] || {};

    worksheet.addRow({
      pcs_date: convDate(pcsOrder.pcs_date),
      group_pcs: pcsOrder.group_pcs,
      cutting_pcs: pcsOrder.cutting_pcs,
      tapping_pcs: pcsOrder.tapping_pcs,
      pressing_pcs: pcsOrder.pressing_pcs,
      finishing_pcs: pcsOrder.finishing_pcs,
      dispatch_raw_pcs: pcsOrder.dispatch_raw_pcs,
      dispatch_group_pcs: pcsOrder.dispatch_group_pcs,
      spacer: "", // Spacer column
      sqm_date: convDate(sqmOrder.sqm_date),
      group_sqm: sqmOrder.group_sqm,
      cutting_sqm: sqmOrder.cutting_sqm,
      tapping_sqm: sqmOrder.tapping_sqm,
      pressing_sqm: sqmOrder.pressing_sqm,
      finishing_sqm: sqmOrder.finishing_sqm,
      dispatch_raw_sqm: sqmOrder.dispatch_raw_sqm,
      dispatch_group_sqm: sqmOrder.dispatch_group_sqm,
    });

    // Update totals for pcs
    totalGroupPcs += pcsOrder.group_pcs || 0;
    totalCuttingPcs += pcsOrder.cutting_pcs || 0;
    totalTappingPcs += pcsOrder.tapping_pcs || 0;
    totalPressingPcs += pcsOrder.pressing_pcs || 0;
    totalFinishingPcs += pcsOrder.finishing_pcs || 0;
    totalDispatchRawPcs += pcsOrder.dispatch_raw_pcs || 0;
    totalDispatchGroupPcs += pcsOrder.dispatch_group_pcs || 0;

    // Update totals for sqm
    totalGroupSqm += sqmOrder.group_sqm || 0;
    totalCuttingSqm += sqmOrder.cutting_sqm || 0;
    totalTappingSqm += sqmOrder.tapping_sqm || 0;
    totalPressingSqm += sqmOrder.pressing_sqm || 0;
    totalFinishingSqm += sqmOrder.finishing_sqm || 0;
    totalDispatchRawSqm += sqmOrder.dispatch_raw_sqm || 0;
    totalDispatchGroupSqm += sqmOrder.dispatch_group_sqm || 0;
  }
  const avgGroupPcs = parseFloat(totalGroupPcs / maxRows).toFixed(2);
  const avgCuttingPcs = parseFloat(totalCuttingPcs / maxRows).toFixed(2);
  const avgTappingPcs = parseFloat(totalTappingPcs / maxRows).toFixed(2);
  const avgPressingPcs = parseFloat(totalPressingPcs / maxRows).toFixed(2);
  const avgFinishingPcs = parseFloat(totalFinishingPcs / maxRows).toFixed(2);
  const avgDispatchRawPcs = parseFloat(totalDispatchRawPcs / maxRows).toFixed(
    2
  );
  const avgDispatchGroupPcs = parseFloat(
    totalDispatchGroupPcs / maxRows
  ).toFixed(2);

  const avgGroupSqm = parseFloat(totalGroupSqm / maxRows).toFixed(2);
  const avgCuttingSqm = parseFloat(totalCuttingSqm / maxRows).toFixed(2);
  const avgTappingSqm = parseFloat(totalTappingSqm / maxRows).toFixed(2);
  const avgPressingSqm = parseFloat(totalPressingSqm / maxRows).toFixed(2);
  const avgFinishingSqm = parseFloat(totalFinishingSqm / maxRows).toFixed(2);
  const avgDispatchRawSqm = parseFloat(totalDispatchRawSqm / maxRows).toFixed(
    2
  );
  const avgDispatchGroupSqm = parseFloat(
    totalDispatchGroupSqm / maxRows
  ).toFixed(2);

  // Add totals to the last row

  worksheet
    .addRow([
      "Total",
      totalGroupPcs,
      totalCuttingPcs,
      totalTappingPcs,
      totalPressingPcs,
      totalFinishingPcs,
      totalDispatchRawPcs,
      totalDispatchGroupPcs,
      "", // Spacer column
      "Total",
      totalGroupSqm,
      totalCuttingSqm,
      totalTappingSqm,
      totalPressingSqm,
      totalFinishingSqm,
      totalDispatchRawSqm,
      totalDispatchGroupSqm,
    ])
    .eachCell({ includeEmpty: true }, function (cell) {
      cell.font = { bold: true };
      if (cell.value === "Total" || cell.value === "AVERAGE") {
        cell.alignment = { horizontal: "left" };
      } else {
        cell.alignment = { horizontal: "right" };
      }
    });

  worksheet
    .addRow([
      "AVERAGE",
      avgGroupPcs,
      avgCuttingPcs,
      avgTappingPcs,
      avgPressingPcs,
      avgFinishingPcs,
      avgDispatchRawPcs,
      avgDispatchGroupPcs,
      "", // Spacer column
      "AVERAGE",
      avgGroupSqm,
      avgCuttingSqm,
      avgTappingSqm,
      avgPressingSqm,
      avgFinishingSqm,
      avgDispatchRawSqm,
      avgDispatchGroupSqm,
    ])
    .eachCell({ includeEmpty: true }, function (cell) {
      cell.font = { bold: true };
      if (cell.value === "Total" || cell.value === "AVERAGE") {
        cell.alignment = { horizontal: "left" };
      } else {
        cell.alignment = { horizontal: "right" };
      }
    });

  // Apply bold font to header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  // Generate a temporary file path
  const filePath =
    "public/reports/DashboardReportExcel/dashboardReportExcel_report.xlsx";

  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);

  // Generate a unique filename to avoid overwriting
  const timestamp = new Date().getTime();
  const downloadFileName = `Dashboard_Excel_Report${timestamp}.xlsx`;

  // Move the file to the desired folder
  const destinationPath = `public/reports/DashboardReportExcel/${downloadFileName}`;
  await fs.rename(filePath, destinationPath);

  const downloadLink = `${process.env.APP_URL}${destinationPath}`;

  return downloadLink;
};

export { GenerateDashboardReport };
