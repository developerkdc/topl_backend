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
 * Generate Grouping Stock Register Excel.
 *
 * Layout:
 *   Row 1 : Title — "Grouping Item Stock Register Date wise between DD/MM/YYYY and DD/MM/YYYY"
 *   Row 2 : blank
 *   Row 3 : Super-header (quantity names merged over Sheets+SQM pairs), gray fill, bold
 *   Row 4 : Sub-header ("Sheets" | "SQM" per quantity), gray fill, bold
 *   Row 5+ : Data rows (one per tuple)
 *   Last   : Total row (gray fill, bold)
 *
 * Columns (19): 1–5 keys; 6–19 = 7 pairs of (Sheets, SQM)
 */
const GenerateGroupingStockRegisterExcel = async (rows, startDate, endDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Grouping Stock Register');

  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);

  const numCols = 19;

  // Super-header: 5 key labels + 7 quantity names (each will span 2 cols)
  const keyHeaders = ['Item Group Name', 'Sales Item Name', 'Grouping Date', 'Log X', 'Thickness'];
  const quantityHeaders = [
    'Opening Balance',
    'Grouping Done',
    'Issue for tapping',
    'Issue for Challan',
    'Issue Sales',
    'Damage',
    'Closing Balance',
  ];

  // Numeric column indices (1-based) — cols 5 (Thickness) and 6–19 (quantity pairs)
  const numericCols = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  let currentRow = 1;

  // Title row
  worksheet.mergeCells(currentRow, 1, currentRow, numCols);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Grouping Item Stock Register Date wise between ${formattedStart} and ${formattedEnd}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow += 2; // leave one blank row

  // Super-header row (row 1 of headers)
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
    const col = 6 + i * 2;
    const cell = superHeaderRow.getCell(col);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = grayFill;
    setCellStyle(cell);
    worksheet.mergeCells(currentRow, col, currentRow, col + 1);
  });
  currentRow++;

  // Sub-header row (row 2 of headers) — "Sheets" | "SQM" under each quantity
  const subHeaderRow = worksheet.getRow(currentRow);
  for (let col = 1; col <= 5; col++) {
    const cell = subHeaderRow.getCell(col);
    cell.value = '';
    cell.fill = grayFill;
    setCellStyle(cell);
  }
  for (let i = 0; i < 7; i++) {
    const colSheets = 6 + i * 2;
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
    dataRow.getCell(3).value = formatDate(r.grouping_done_date);
    dataRow.getCell(4).value = r.log_no_code ?? '';
    dataRow.getCell(5).value = r.thickness ?? 0;
    dataRow.getCell(6).value = r.opening_balance ?? 0;
    dataRow.getCell(7).value = r.opening_balance_sqm ?? 0;
    dataRow.getCell(8).value = r.grouping_done ?? 0;
    dataRow.getCell(9).value = r.grouping_done_sqm ?? 0;
    dataRow.getCell(10).value = r.issue_tapping ?? 0;
    dataRow.getCell(11).value = r.issue_tapping_sqm ?? 0;
    dataRow.getCell(12).value = r.issue_challan ?? 0;
    dataRow.getCell(13).value = r.issue_challan_sqm ?? 0;
    dataRow.getCell(14).value = r.issue_sales ?? 0;
    dataRow.getCell(15).value = r.issue_sales_sqm ?? 0;
    dataRow.getCell(16).value = r.damage ?? 0;
    dataRow.getCell(17).value = r.damage_sqm ?? 0;
    dataRow.getCell(18).value = r.closing_balance ?? 0;
    dataRow.getCell(19).value = r.closing_balance_sqm ?? 0;

    numericCols.forEach((col) => {
      const c = dataRow.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.00';
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
  totalRow.getCell(1).font = { bold: true };

  [2, 3, 4, 5].forEach((col) => {
    totalRow.getCell(col).value = '';
  });

  totalRow.getCell(6).value = totals.opening_balance;
  totalRow.getCell(7).value = totals.opening_balance_sqm;
  totalRow.getCell(8).value = totals.grouping_done;
  totalRow.getCell(9).value = totals.grouping_done_sqm;
  totalRow.getCell(10).value = totals.issue_tapping;
  totalRow.getCell(11).value = totals.issue_tapping_sqm;
  totalRow.getCell(12).value = totals.issue_challan;
  totalRow.getCell(13).value = totals.issue_challan_sqm;
  totalRow.getCell(14).value = totals.issue_sales;
  totalRow.getCell(15).value = totals.issue_sales_sqm;
  totalRow.getCell(16).value = totals.damage;
  totalRow.getCell(17).value = totals.damage_sqm;
  totalRow.getCell(18).value = totals.closing_balance;
  totalRow.getCell(19).value = totals.closing_balance_sqm;

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
    if (col >= 6) {
      if (typeof cell.value === 'number') cell.numFmt = '0.00';
    }
  }

  // Column widths (19 columns)
  worksheet.columns = [
    { width: 20 },
    { width: 20 },
    { width: 14 },
    { width: 14 },
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
  const fileName = `grouping_stock_register_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Grouping';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;
  return downloadLink;
};

export { GenerateGroupingStockRegisterExcel };
