import ExcelJS from 'exceljs';
import fs from 'fs/promises';

/**
 * Format date string to DD/MM/YYYY
 */
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return 'N/A';
  }
};

/**
 * Style a header cell: gray background, bold, centered, bordered.
 */
const styleHeader = (cell, { wrapText = false } = {}) => {
  cell.font = { bold: true };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
};

/**
 * Style a data cell with a border.
 */
const styleData = (cell) => {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
};

/**
 * Generate Tapping Stock Register Excel.
 *
 * Layout (9 columns, 2-row header):
 *
 * Header Row 1:
 *   Col 1: Item Name          (merged rows 1–2)
 *   Col 2: Sales Item Name    (merged rows 1–2)
 *   Col 3: Opening Balance    (merged rows 1–2)
 *   Cols 4–5: Tapping         (merged across cols 4–5, row 1 only)
 *   Col 6: Issue              (merged rows 1–2 — "Issue" label; sub-label "Pressing" in row 2)
 *   Col 7: Process Waste      (merged rows 1–2)
 *   Col 8: Sales              (merged rows 1–2)
 *   Col 9: Closing Balance    (merged rows 1–2)
 *
 * Header Row 2:
 *   (cols 1,2,3,7,8,9 are merged down from row 1)
 *   Col 4: Hand Splice
 *   Col 5: Machine Splice
 *   Col 6: Pressing  (sub-label under Issue)
 *
 * @param {Array} rows  - processed stock rows from controller
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate   - YYYY-MM-DD
 */
const GenerateTappingStockRegisterExcel = async (rows, startDate, endDate) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Stock Register');

  const numFmt = '0.00';
  const negFmt = '0.00;(0.00)';
  const TOTAL_COLS = 9;

  let r = 1;

  // ─── Title Row ────────────────────────────────────────────────────────────
  ws.mergeCells(r, 1, r, TOTAL_COLS);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = `Splicing Item Stock Register sales name wise - ${formatDate(startDate)} and ${formatDate(endDate)}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(r).height = 22;
  r += 2;

  // ─── 2-Row Header ─────────────────────────────────────────────────────────
  const hRow1 = r;
  const hRow2 = r + 1;

  // Cols merged vertically (rows 1–2): 1, 2, 3, 7, 8, 9
  const verticalCols = [
    { col: 1, label: 'Item Name' },
    { col: 2, label: 'Sales Item Name' },
    { col: 3, label: 'Opening Balance' },
    { col: 7, label: 'Process Waste' },
    { col: 8, label: 'Sales' },
    { col: 9, label: 'Closing Balance' },
  ];
  verticalCols.forEach(({ col, label }) => {
    ws.mergeCells(hRow1, col, hRow2, col);
    const cell = ws.getCell(hRow1, col);
    cell.value = label;
    styleHeader(cell, { wrapText: true });
  });

  // "Tapping" merged across cols 4–5, row 1
  ws.mergeCells(hRow1, 4, hRow1, 5);
  const tappingCell = ws.getCell(hRow1, 4);
  tappingCell.value = 'Tapping';
  styleHeader(tappingCell);

  // "Issue" merged rows 1–2 for col 6 (label "Issue" in row 1, "Pressing" in row 2)
  // We show "Issue" in row 1 and "Pressing" directly in row 2 for col 6
  const issueCell = ws.getCell(hRow1, 6);
  issueCell.value = 'Issue';
  styleHeader(issueCell);

  // Row 2 sub-labels for cols 4, 5, 6
  const subLabels = [
    { col: 4, label: 'Hand Splice' },
    { col: 5, label: 'Machine Splice' },
    { col: 6, label: 'Pressing' },
  ];
  subLabels.forEach(({ col, label }) => {
    const cell = ws.getCell(hRow2, col);
    cell.value = label;
    styleHeader(cell);
  });

  [hRow1, hRow2].forEach((rowNum) => { ws.getRow(rowNum).height = 18; });
  r += 2;

  // ─── Data Rows ────────────────────────────────────────────────────────────
  // Totals accumulators
  let totOpeningBalance = 0;
  let totTappingHand = 0;
  let totTappingMachine = 0;
  let totIssuePressing = 0;
  let totProcessWaste = 0;
  let totSales = 0;
  let totClosingBalance = 0;

  rows.forEach((row) => {
    const dataRow = ws.getRow(r);

    dataRow.getCell(1).value = row.item_name;
    dataRow.getCell(2).value = row.sales_item_name;
    dataRow.getCell(3).value = row.opening_balance;
    dataRow.getCell(4).value = row.tapping_hand;
    dataRow.getCell(5).value = row.tapping_machine;
    dataRow.getCell(6).value = row.issue_pressing;
    dataRow.getCell(7).value = row.process_waste;
    dataRow.getCell(8).value = row.sales;
    dataRow.getCell(9).value = row.closing_balance;

    // Number formatting (allow negatives in parentheses for balance cols)
    [3, 9].forEach((col) => {
      const cell = dataRow.getCell(col);
      if (typeof cell.value === 'number') cell.numFmt = negFmt;
    });
    [4, 5, 6, 7, 8].forEach((col) => {
      const cell = dataRow.getCell(col);
      if (typeof cell.value === 'number') cell.numFmt = numFmt;
    });

    for (let col = 1; col <= TOTAL_COLS; col++) styleData(dataRow.getCell(col));

    totOpeningBalance += row.opening_balance;
    totTappingHand += row.tapping_hand;
    totTappingMachine += row.tapping_machine;
    totIssuePressing += row.issue_pressing;
    totProcessWaste += row.process_waste;
    totSales += row.sales;
    totClosingBalance += row.closing_balance;

    r++;
  });

  // ─── Total Row ────────────────────────────────────────────────────────────
  const totalRow = ws.getRow(r);
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(3).value = totOpeningBalance;
  totalRow.getCell(4).value = totTappingHand;
  totalRow.getCell(5).value = totTappingMachine;
  totalRow.getCell(6).value = totIssuePressing;
  totalRow.getCell(7).value = totProcessWaste;
  totalRow.getCell(8).value = totSales;
  totalRow.getCell(9).value = totClosingBalance;

  totalRow.getCell(1).font = { bold: true };
  [3, 9].forEach((col) => {
    totalRow.getCell(col).font = { bold: true };
    totalRow.getCell(col).numFmt = negFmt;
  });
  [4, 5, 6, 7, 8].forEach((col) => {
    totalRow.getCell(col).font = { bold: true };
    totalRow.getCell(col).numFmt = numFmt;
  });
  for (let col = 1; col <= TOTAL_COLS; col++) styleData(totalRow.getCell(col));

  // ─── Column Widths ────────────────────────────────────────────────────────
  ws.columns = [
    { width: 22 }, // Item Name
    { width: 22 }, // Sales Item Name
    { width: 16 }, // Opening Balance
    { width: 14 }, // Hand Splice
    { width: 16 }, // Machine Splice
    { width: 14 }, // Pressing
    { width: 14 }, // Process Waste
    { width: 10 }, // Sales
    { width: 16 }, // Closing Balance
  ];

  // ─── Save File ────────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const fileName = `tapping_stock_register_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Tapping';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  return `${process.env.APP_URL}${filePath}`;
};

export { GenerateTappingStockRegisterExcel };
