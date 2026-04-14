import ExcelJS from 'exceljs';
import fs from 'fs/promises';

/**
 * Format date to DD/MM/YYYY
 */
const formatDate = (dateInput) => {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
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
 * Generate Tapping Item Stock Register Thickness Wise Excel (Report -2).
 *
 * Layout (11 columns, 2-row header):
 *   Difference from Report -1: "Sales Item Name" column removed.
 *
 * Row 1 (title): "Report -2"
 * Row 2 (title): "Splicing Item Stock Register thickness wise - DD/MM/YYYY and DD/MM/YYYY"
 * Row 3: blank gap
 *
 * Header Row 1:
 *   Col  1: Item Name        (merged rows 1–2)
 *   Col  2: Thickness        (merged rows 1–2)
 *   Col  3: Log No           (merged rows 1–2)
 *   Col  4: Date             (merged rows 1–2)
 *   Col  5: Opening Balance  (merged rows 1–2)
 *   Cols 6–7: Tapping        (merged horizontally, row 1 only)
 *   Col  8: Issue            (row 1 label; sub-label "Pressing" in row 2)
 *   Col  9: Process Waste    (merged rows 1–2)
 *   Col 10: Sales            (merged rows 1–2)
 *   Col 11: Closing Balance  (merged rows 1–2)
 *
 * Header Row 2:
 *   (Cols 1–5, 9–11 merged down from row 1)
 *   Col  6: Hand Splice
 *   Col  7: Machine Splice
 *   Col  8: Pressing
 *
 * @param {Array}  rows      - processed stock rows from controller
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate   - YYYY-MM-DD
 */
const GenerateTappingItemStockRegisterThicknessWiseExcel = async (
  rows,
  startDate,
  endDate
) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Stock Register');

  const numFmt = '0.00';
  const negFmt = '0.00;(0.00)';
  const TOTAL_COLS = 11;

  let r = 1;

  // ─── Title Row: Report name + date range ──────────────────────────────────
  ws.mergeCells(r, 1, r, TOTAL_COLS);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = `Splicing Item Stock Register thickness wise - ${formatDate(startDate)} and ${formatDate(endDate)}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(r).height = 22;
  r += 2; // blank gap row

  // ─── 2-Row Header ─────────────────────────────────────────────────────────
  const hRow1 = r;
  const hRow2 = r + 1;

  // Cols merged vertically (rows 1–2): 1, 2, 3, 4, 5, 9, 10, 11
  const verticalCols = [
    { col: 1,  label: 'Item Name'       },
    { col: 2,  label: 'Thickness'       },
    { col: 3,  label: 'Log No'          },
    { col: 4,  label: 'Date'            },
    { col: 5,  label: 'Opening Balance' },
    { col: 9,  label: 'Process Waste'   },
    { col: 10, label: 'Sales'           },
    { col: 11, label: 'Closing Balance' },
  ];
  verticalCols.forEach(({ col, label }) => {
    ws.mergeCells(hRow1, col, hRow2, col);
    const cell = ws.getCell(hRow1, col);
    cell.value = label;
    styleHeader(cell, { wrapText: true });
  });

  // "Tapping" merged across cols 6–7, row 1 only
  ws.mergeCells(hRow1, 6, hRow1, 7);
  const tappingCell = ws.getCell(hRow1, 6);
  tappingCell.value = 'Tapping';
  styleHeader(tappingCell);

  // "Issue" label in row 1 col 8 (sub-label "Pressing" in row 2)
  const issueCell = ws.getCell(hRow1, 8);
  issueCell.value = 'Issue';
  styleHeader(issueCell);

  // Row 2 sub-labels for cols 6, 7, 8
  const subLabels = [
    { col: 6, label: 'Hand Splice'    },
    { col: 7, label: 'Machine Splice' },
    { col: 8, label: 'Pressing'       },
  ];
  subLabels.forEach(({ col, label }) => {
    const cell = ws.getCell(hRow2, col);
    cell.value = label;
    styleHeader(cell);
  });

  [hRow1, hRow2].forEach((rowNum) => { ws.getRow(rowNum).height = 18; });
  r += 2;

  // ─── Data Rows ────────────────────────────────────────────────────────────
  let totOpeningBalance  = 0;
  let totTappingHand     = 0;
  let totTappingMachine  = 0;
  let totIssuePressing   = 0;
  let totProcessWaste    = 0;
  let totSales           = 0;
  let totClosingBalance  = 0;

  rows.forEach((row) => {
    const dataRow = ws.getRow(r);

    dataRow.getCell(1).value  = row.item_name        ?? '';
    dataRow.getCell(2).value  = row.thickness        ?? '';
    dataRow.getCell(3).value  = row.log_no           ?? '';
    dataRow.getCell(4).value  = row.date ? formatDate(row.date) : '';
    dataRow.getCell(5).value  = row.opening_balance;
    dataRow.getCell(6).value  = row.tapping_hand;
    dataRow.getCell(7).value  = row.tapping_machine;
    dataRow.getCell(8).value  = row.issue_pressing;
    dataRow.getCell(9).value  = row.process_waste;
    dataRow.getCell(10).value = row.sales;
    dataRow.getCell(11).value = row.closing_balance;

    // Number formatting
    [5, 11].forEach((col) => {
      const cell = dataRow.getCell(col);
      if (typeof cell.value === 'number') cell.numFmt = negFmt;
    });
    [6, 7, 8, 9, 10].forEach((col) => {
      const cell = dataRow.getCell(col);
      if (typeof cell.value === 'number') cell.numFmt = numFmt;
    });

    for (let col = 1; col <= TOTAL_COLS; col++) styleData(dataRow.getCell(col));

    totOpeningBalance  += row.opening_balance;
    totTappingHand     += row.tapping_hand;
    totTappingMachine  += row.tapping_machine;
    totIssuePressing   += row.issue_pressing;
    totProcessWaste    += row.process_waste;
    totSales           += row.sales;
    totClosingBalance  += row.closing_balance;

    r++;
  });

  // ─── Total Row ────────────────────────────────────────────────────────────
  const totalRow = ws.getRow(r);
  totalRow.getCell(1).value  = 'Total';
  totalRow.getCell(5).value  = totOpeningBalance;
  totalRow.getCell(6).value  = totTappingHand;
  totalRow.getCell(7).value  = totTappingMachine;
  totalRow.getCell(8).value  = totIssuePressing;
  totalRow.getCell(9).value  = totProcessWaste;
  totalRow.getCell(10).value = totSales;
  totalRow.getCell(11).value = totClosingBalance;

  totalRow.getCell(1).font = { bold: true };
  [5, 11].forEach((col) => {
    totalRow.getCell(col).font = { bold: true };
    totalRow.getCell(col).numFmt = negFmt;
  });
  [6, 7, 8, 9, 10].forEach((col) => {
    totalRow.getCell(col).font = { bold: true };
    totalRow.getCell(col).numFmt = numFmt;
  });
  for (let col = 1; col <= TOTAL_COLS; col++) styleData(totalRow.getCell(col));

  // ─── Column Widths ────────────────────────────────────────────────────────
  ws.columns = [
    { width: 22 }, // Col  1: Item Name
    { width: 12 }, // Col  2: Thickness
    { width: 14 }, // Col  3: Log No
    { width: 14 }, // Col  4: Date
    { width: 16 }, // Col  5: Opening Balance
    { width: 14 }, // Col  6: Hand Splice
    { width: 16 }, // Col  7: Machine Splice
    { width: 14 }, // Col  8: Pressing
    { width: 14 }, // Col  9: Process Waste
    { width: 10 }, // Col 10: Sales
    { width: 16 }, // Col 11: Closing Balance
  ];

  // ─── Save File ────────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const fileName = `tapping_item_stock_register_thickness_wise_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Tapping';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  return `${process.env.APP_URL}${filePath}`;
};

export { GenerateTappingItemStockRegisterThicknessWiseExcel };
