import ExcelJS from 'exceljs';
import fs from 'fs/promises';

/**
 * Format a Date or date string to DD/MM/YYYY
 */
const formatDate = (value) => {
  try {
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return 'N/A';
  }
};

const setCellStyle = (cell, bold = false) => {
  if (bold) cell.font = { bold: true };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
};

const grayFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD3D3D3' },
};

/**
 * Generate Grouping Stock Register Thickness Wise Excel.
 *
 * Layout:
 *   Row 1 : Title — "Grouping Item Stock Register Thickness Wise between DD/MM/YYYY and DD/MM/YYYY"
 *   Row 2 : blank
 *   Row 3 : Super-header (quantity names merged over Sheets+SQM pairs), gray fill, bold
 *   Row 4 : Sub-header ("Sheets" and "SQM" per quantity), gray fill, bold
 *   Row 5+ : Data rows (one per thickness group)
 *   Last   : Total row (gray fill, bold)
 *
 * Columns (17): 1–3 keys; 4–17 = 7 pairs of (Sheets, SQM)
 */
const GenerateGroupingStockRegisterThicknessWiseExcel = async (
  rows,
  startDate,
  endDate
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Grouping Stock Register');

  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);

  const numCols = 17;

  const keyHeaders = ['Item Group Name', 'Sales Item Name', 'Thickness'];
  const quantityHeaders = [
    'Opening Balance',
    'Grouping Done',
    'Issue for tapping',
    'Issue for Challan',
    'Issue Sales',
    'Damage',
    'Closing Balance',
  ];

  const numericCols = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

  let currentRow = 1;

  // Title row
  worksheet.mergeCells(currentRow, 1, currentRow, numCols);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Grouping Item Stock Register Thickness Wise between ${formattedStart} and ${formattedEnd}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow += 2;

  // Super-header row
  const superHeaderRow = worksheet.getRow(currentRow);
  keyHeaders.forEach((h, i) => {
    const cell = superHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = grayFill;
    setCellStyle(cell);
  });
  quantityHeaders.forEach((h, i) => {
    const col = 4 + i * 2;
    const cell = superHeaderRow.getCell(col);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = grayFill;
    setCellStyle(cell);
    worksheet.mergeCells(currentRow, col, currentRow, col + 1);
  });
  currentRow++;

  // Sub-header row
  const subHeaderRow = worksheet.getRow(currentRow);
  [1, 2, 3].forEach((col) => {
    const cell = subHeaderRow.getCell(col);
    cell.value = '';
    cell.fill = grayFill;
    setCellStyle(cell);
  });
  for (let i = 0; i < 7; i++) {
    const colSheets = 4 + i * 2;
    const colSqm = colSheets + 1;
    subHeaderRow.getCell(colSheets).value = 'Sheets';
    subHeaderRow.getCell(colSqm).value = 'SQM';
    [colSheets, colSqm].forEach((col) => {
      const cell = subHeaderRow.getCell(col);
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = grayFill;
      setCellStyle(cell);
    });
  }

  // Merge key headers vertically across super/sub header rows.
  for (let col = 1; col <= 3; col++) {
    worksheet.mergeCells(currentRow - 1, col, currentRow, col);
    const mergedHeaderCell = worksheet.getCell(currentRow - 1, col);
    mergedHeaderCell.font = { bold: true };
    mergedHeaderCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    mergedHeaderCell.fill = grayFill;
    setCellStyle(mergedHeaderCell, true);
  }
  currentRow++;

  // Totals accumulator (sheets + SQM)
  const totals = {
    opening_balance: 0,
    opening_balance_sqm: 0,
    grouping_done: 0,
    grouping_done_sqm: 0,
    issue_tapping: 0,
    issue_tapping_sqm: 0,
    issue_challan: 0,
    issue_challan_sqm: 0,
    issue_sales: 0,
    issue_sales_sqm: 0,
    damage: 0,
    damage_sqm: 0,
    closing_balance: 0,
    closing_balance_sqm: 0,
  };

  // Data rows
  rows.forEach((r) => {
    const dataRow = worksheet.getRow(currentRow);

    dataRow.getCell(1).value = r.item_group_name ?? '';
    dataRow.getCell(2).value = r.item_name ?? '';
    dataRow.getCell(3).value = r.thickness ?? 0;
    dataRow.getCell(4).value = r.opening_balance ?? 0;
    dataRow.getCell(5).value = r.opening_balance_sqm ?? 0;
    dataRow.getCell(6).value = r.grouping_done ?? 0;
    dataRow.getCell(7).value = r.grouping_done_sqm ?? 0;
    dataRow.getCell(8).value = r.issue_tapping ?? 0;
    dataRow.getCell(9).value = r.issue_tapping_sqm ?? 0;
    dataRow.getCell(10).value = r.issue_challan ?? 0;
    dataRow.getCell(11).value = r.issue_challan_sqm ?? 0;
    dataRow.getCell(12).value = r.issue_sales ?? 0;
    dataRow.getCell(13).value = r.issue_sales_sqm ?? 0;
    dataRow.getCell(14).value = r.damage ?? 0;
    dataRow.getCell(15).value = r.damage_sqm ?? 0;
    dataRow.getCell(16).value = r.closing_balance ?? 0;
    dataRow.getCell(17).value = r.closing_balance_sqm ?? 0;

    numericCols.forEach((col) => {
      const c = dataRow.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.000';
    });

    for (let col = 1; col <= numCols; col++) setCellStyle(dataRow.getCell(col));

    totals.opening_balance += r.opening_balance ?? 0;
    totals.opening_balance_sqm += r.opening_balance_sqm ?? 0;
    totals.grouping_done += r.grouping_done ?? 0;
    totals.grouping_done_sqm += r.grouping_done_sqm ?? 0;
    totals.issue_tapping += r.issue_tapping ?? 0;
    totals.issue_tapping_sqm += r.issue_tapping_sqm ?? 0;
    totals.issue_challan += r.issue_challan ?? 0;
    totals.issue_challan_sqm += r.issue_challan_sqm ?? 0;
    totals.issue_sales += r.issue_sales ?? 0;
    totals.issue_sales_sqm += r.issue_sales_sqm ?? 0;
    totals.damage += r.damage ?? 0;
    totals.damage_sqm += r.damage_sqm ?? 0;
    totals.closing_balance += r.closing_balance ?? 0;
    totals.closing_balance_sqm += r.closing_balance_sqm ?? 0;

    currentRow++;
  });

  // Total row
  const totalRow = worksheet.getRow(currentRow);

  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(2).value = '';
  totalRow.getCell(3).value = '';
  totalRow.getCell(4).value = totals.opening_balance;
  totalRow.getCell(5).value = totals.opening_balance_sqm;
  totalRow.getCell(6).value = totals.grouping_done;
  totalRow.getCell(7).value = totals.grouping_done_sqm;
  totalRow.getCell(8).value = totals.issue_tapping;
  totalRow.getCell(9).value = totals.issue_tapping_sqm;
  totalRow.getCell(10).value = totals.issue_challan;
  totalRow.getCell(11).value = totals.issue_challan_sqm;
  totalRow.getCell(12).value = totals.issue_sales;
  totalRow.getCell(13).value = totals.issue_sales_sqm;
  totalRow.getCell(14).value = totals.damage;
  totalRow.getCell(15).value = totals.damage_sqm;
  totalRow.getCell(16).value = totals.closing_balance;
  totalRow.getCell(17).value = totals.closing_balance_sqm;

  for (let col = 1; col <= numCols; col++) {
    const cell = totalRow.getCell(col);
    cell.fill = grayFill;
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    if (col >= 4 && typeof cell.value === 'number') {
      cell.numFmt = '0.000';
    }
  }

  // Column widths (17 columns)
  worksheet.columns = [
    { width: 20 },
    { width: 20 },
    { width: 12 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
  ];

  const timestamp = new Date().getTime();
  const fileName = `grouping_stock_register_thickness_wise_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Grouping';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;
  return downloadLink;
};

export { GenerateGroupingStockRegisterThicknessWiseExcel };
