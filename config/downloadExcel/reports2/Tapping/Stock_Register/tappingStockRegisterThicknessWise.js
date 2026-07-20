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
 * Helper to fetch amount value from row regardless of casing style
 */
const getAmountVal = (row, baseKey) => {
  if (row[`${baseKey}_amount`] !== undefined) return row[`${baseKey}_amount`];
  const camelKey = baseKey.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  if (row[`${camelKey}Amount`] !== undefined) return row[`${camelKey}Amount`];
  if (row[`${baseKey}Amount`] !== undefined) return row[`${baseKey}Amount`];
  return 0;
};

/**
 * Helper to fetch expense value from row regardless of casing style
 */
const getExpenseVal = (row, baseKey) => {
  const camelKey = baseKey.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  const keys = [
    `${baseKey}_expense_amount`,
    `${baseKey}_expense`,
    `${camelKey}ExpenseAmount`,
    `${camelKey}Expense`,
    `${baseKey}ExpenseAmount`,
    `${baseKey}Expense`
  ];
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return 0;
};

/**
 * Generate Tapping Stock Register Thickness Wise Excel.
 *
 * Layout (2-row header):
 *   Col 1: Item Name          (merged rows 1–2)
 *   Col 2: Sales Item Name    (merged rows 1–2)
 *   Col 3: Thickness          (merged rows 1–2)
 *   Col 4: Log No             (merged rows 1–2)
 *   Col 5: Date               (merged rows 1–2)
 *   Col 6: Opening Balance    (or block: Qty | Amount | Expense Amount)
 *   Tapping block → Hand Splice, Machine Splice
 *   Issue block   → Pressing
 *   Process Waste (or block)
 *   Sales         (or block)
 *   Closing Balance (or block)
 *
 * When includeCostAndExpense is true, every quantity column expands into a
 * 3-col sub-block: Qty | Amount | Expense Amount.
 */
const GenerateTappingStockRegisterThicknessWiseExcel = async (
  rows,
  startDate,
  endDate,
  includeCostAndExpense
) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Stock Register');

  const numFmt = '0.00';
  const negFmt = '0.00;(0.00)';

  // ── Layout math ────────────────────────────────────────────────────────
  const KEY_COLS = 5; // Item Name, Sales Item Name, Thickness, Log No, Date
  const colsPerQty = includeCostAndExpense ? 3 : 1; // Qty [ | Amount | Expense Amount ]

  const openingCol = KEY_COLS + 1;
  const handSpliceCol = openingCol + colsPerQty;
  const machineSpliceCol = handSpliceCol + colsPerQty;
  const pressingCol = machineSpliceCol + colsPerQty;
  const processWasteCol = pressingCol + colsPerQty;
  const salesCol = processWasteCol + colsPerQty;
  const closingCol = salesCol + colsPerQty;
  const TOTAL_COLS = closingCol + colsPerQty - 1;

  let r = 1;

  // ─── Title Row: Report name + date range ──────────────────────────────────
  ws.mergeCells(r, 1, r, TOTAL_COLS);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = `Splicing Item Stock Register sales name - thickness wise - ${formatDate(startDate)} and ${formatDate(endDate)}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(r).height = 22;
  r += 2; // blank gap row

  // ─── 2-Row Header ─────────────────────────────────────────────────────────
  const hRow1 = r;
  const hRow2 = r + 1;

  // Cols merged vertically (rows 1–2): key cols only
  const verticalKeyCols = [
    { col: 1, label: 'Item Name' },
    { col: 2, label: 'Sales Item Name' },
    { col: 3, label: 'Thickness' },
    { col: 4, label: 'Log No' },
    { col: 5, label: 'Date' },
  ];
  verticalKeyCols.forEach(({ col, label }) => {
    ws.mergeCells(hRow1, col, hRow2, col);
    const cell = ws.getCell(hRow1, col);
    cell.value = label;
    styleHeader(cell, { wrapText: true });
  });

  // Helper to render a single-quantity block (merged label row1, sub-labels row2)
  const renderQtyBlock = (startCol, label) => {
    if (includeCostAndExpense) {
      ws.mergeCells(hRow1, startCol, hRow1, startCol + colsPerQty - 1);
      const topCell = ws.getCell(hRow1, startCol);
      topCell.value = label;
      styleHeader(topCell, { wrapText: true });

      ['Qty', 'Amount', 'Expense Amount'].forEach((sub, i) => {
        const cell = ws.getCell(hRow2, startCol + i);
        cell.value = sub;
        styleHeader(cell);
      });
    } else {
      ws.mergeCells(hRow1, startCol, hRow2, startCol);
      const cell = ws.getCell(hRow1, startCol);
      cell.value = label;
      styleHeader(cell, { wrapText: true });
    }
  };

  renderQtyBlock(openingCol, 'Opening Balance');
  renderQtyBlock(processWasteCol, 'Process Waste');
  renderQtyBlock(salesCol, 'Sales');
  renderQtyBlock(closingCol, 'Closing Balance');

  // "Tapping" merged across Hand Splice + Machine Splice blocks, row 1 only
  ws.mergeCells(hRow1, handSpliceCol, hRow1, machineSpliceCol + colsPerQty - 1);
  const tappingCell = ws.getCell(hRow1, handSpliceCol);
  tappingCell.value = 'Tapping';
  styleHeader(tappingCell);

  // "Issue" label in row 1 over Pressing block
  if (includeCostAndExpense) {
    ws.mergeCells(hRow1, pressingCol, hRow1, pressingCol + colsPerQty - 1);
  }
  const issueCell = ws.getCell(hRow1, pressingCol);
  issueCell.value = 'Issue';
  styleHeader(issueCell);

  // Row 2 sub-labels for Hand Splice / Machine Splice / Pressing
  if (includeCostAndExpense) {
    ['Qty', 'Amount', 'Expense Amount'].forEach((sub, i) => {
      const handCell = ws.getCell(hRow2, handSpliceCol + i);
      handCell.value = i === 0 ? 'Hand Splice' : sub;
      styleHeader(handCell);

      const machineCell = ws.getCell(hRow2, machineSpliceCol + i);
      machineCell.value = i === 0 ? 'Machine Splice' : sub;
      styleHeader(machineCell);

      const pressCell = ws.getCell(hRow2, pressingCol + i);
      pressCell.value = i === 0 ? 'Pressing' : sub;
      styleHeader(pressCell);
    });
  } else {
    const handCell = ws.getCell(hRow2, handSpliceCol);
    handCell.value = 'Hand Splice';
    styleHeader(handCell);

    const machineCell = ws.getCell(hRow2, machineSpliceCol);
    machineCell.value = 'Machine Splice';
    styleHeader(machineCell);

    const pressCell = ws.getCell(hRow2, pressingCol);
    pressCell.value = 'Pressing';
    styleHeader(pressCell);
  }

  [hRow1, hRow2].forEach((rowNum) => { ws.getRow(rowNum).height = 18; });
  r += 2;

  // ─── Data Rows ────────────────────────────────────────────────────────────
  // Quantity block definitions: { startCol, baseKey }
  const qtyBlocks = [
    { startCol: openingCol, baseKey: 'opening_balance', negFmt: true },
    { startCol: handSpliceCol, baseKey: 'tapping_hand' },
    { startCol: machineSpliceCol, baseKey: 'tapping_machine' },
    { startCol: pressingCol, baseKey: 'issue_pressing' },
    { startCol: processWasteCol, baseKey: 'process_waste' },
    { startCol: salesCol, baseKey: 'sales' },
    { startCol: closingCol, baseKey: 'closing_balance', negFmt: true },
  ];

  const totals = {};
  qtyBlocks.forEach(({ baseKey }) => {
    totals[baseKey] = 0;
    if (includeCostAndExpense) {
      totals[`${baseKey}_amount`] = 0;
      totals[`${baseKey}_expense_amount`] = 0;
    }
  });

  rows.forEach((row) => {
    const dataRow = ws.getRow(r);

    dataRow.getCell(1).value = row.item_name ?? '';
    dataRow.getCell(2).value = row.sales_item_name ?? '';
    dataRow.getCell(3).value = row.thickness ?? '';
    dataRow.getCell(4).value = row.log_no ?? '';
    dataRow.getCell(5).value = row.date ? formatDate(row.date) : '';

    qtyBlocks.forEach(({ startCol, baseKey, negFmt: useNegFmt }) => {
      const qtyVal = row[baseKey] ?? 0;
      dataRow.getCell(startCol).value = qtyVal;
      dataRow.getCell(startCol).numFmt = useNegFmt ? negFmt : numFmt;
      totals[baseKey] += qtyVal;

      if (includeCostAndExpense) {
        const amountVal = getAmountVal(row, baseKey);
        const expenseVal = getExpenseVal(row, baseKey);
        dataRow.getCell(startCol + 1).value = amountVal;
        dataRow.getCell(startCol + 1).numFmt = numFmt;
        dataRow.getCell(startCol + 2).value = expenseVal;
        dataRow.getCell(startCol + 2).numFmt = numFmt;
        totals[`${baseKey}_amount`] += amountVal;
        totals[`${baseKey}_expense_amount`] += expenseVal;
      }
    });

    for (let col = 1; col <= TOTAL_COLS; col++) styleData(dataRow.getCell(col));

    r++;
  });

  // ─── Total Row ────────────────────────────────────────────────────────────
  const totalRow = ws.getRow(r);
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(1).font = { bold: true };

  qtyBlocks.forEach(({ startCol, baseKey, negFmt: useNegFmt }) => {
    totalRow.getCell(startCol).value = totals[baseKey];
    totalRow.getCell(startCol).font = { bold: true };
    totalRow.getCell(startCol).numFmt = useNegFmt ? negFmt : numFmt;

    if (includeCostAndExpense) {
      totalRow.getCell(startCol + 1).value = totals[`${baseKey}_amount`];
      totalRow.getCell(startCol + 1).font = { bold: true };
      totalRow.getCell(startCol + 1).numFmt = numFmt;

      totalRow.getCell(startCol + 2).value = totals[`${baseKey}_expense_amount`];
      totalRow.getCell(startCol + 2).font = { bold: true };
      totalRow.getCell(startCol + 2).numFmt = numFmt;
    }
  });

  for (let col = 1; col <= TOTAL_COLS; col++) styleData(totalRow.getCell(col));

  // ─── Column Widths ────────────────────────────────────────────────────────
  const qtyWidths = includeCostAndExpense ? [14, 14, 16] : [14];
  const columns = [
    { width: 22 }, // Item Name
    { width: 22 }, // Sales Item Name
    { width: 12 }, // Thickness
    { width: 14 }, // Log No
    { width: 14 }, // Date
  ];
  qtyBlocks.forEach(() => columns.push(...qtyWidths.map((w) => ({ width: w }))));
  ws.columns = columns;

  // ─── Save File ────────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const fileName = `tapping_stock_register_thickness_wise_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Tapping';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  return `${process.env.APP_URL}${filePath}`;
};

export { GenerateTappingStockRegisterThicknessWiseExcel };
