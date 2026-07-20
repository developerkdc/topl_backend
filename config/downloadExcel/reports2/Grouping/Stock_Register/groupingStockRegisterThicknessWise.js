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
 *   Row 1 : Title
 *   Row 2 : blank
 *   Row 3 : Super-header (quantity names merged over sub-cols, gray fill, bold)
 *   Row 4 : Sub-header ("Sheets" | "SQM" | "Amount" | "Expense Amount" per quantity), gray fill, bold
 *   Row 5+: Data rows (one per thickness group)
 *   Last  : Total row
 *
 * Columns: 3 key columns, then 7 quantity blocks.
 * Each quantity block has 2 cols (Sheets, SQM) normally,
 * or 4 cols (Sheets, SQM, Amount, Expense Amount) if includeCostAndExpense.
 */
const GenerateGroupingStockRegisterThicknessWiseExcel = async (
  rows,
  startDate,
  endDate,
  includeCostAndExpense
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Grouping Stock Register');

  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);

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
  // Base keys per quantity — sheets/sqm/amount/expense derived from these
  const quantityBaseKeys = [
    'opening_balance',
    'grouping_done',
    'issue_tapping',
    'issue_challan',
    'issue_sales',
    'damage',
    'closing_balance',
  ];

  const colsPerBlock = includeCostAndExpense ? 4 : 2;
  const KEY_COLS = keyHeaders.length;
  const numCols = KEY_COLS + quantityHeaders.length * colsPerBlock;

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
    worksheet.mergeCells(currentRow, i + 1, currentRow + 1, i + 1); // span both header rows
  });
  quantityHeaders.forEach((h, i) => {
    const col = KEY_COLS + 1 + i * colsPerBlock;
    const cell = superHeaderRow.getCell(col);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = grayFill;
    setCellStyle(cell);
    for (let c = col + 1; c < col + colsPerBlock; c++) {
      setCellStyle(superHeaderRow.getCell(c));
    }
    worksheet.mergeCells(currentRow, col, currentRow, col + colsPerBlock - 1);
  });
  currentRow++;

  // Sub-header row
  const subHeaderRow = worksheet.getRow(currentRow);
  const subLabels = includeCostAndExpense
    ? ['Sheets', 'SQM', 'Amount', 'Expense Amount']
    : ['Sheets', 'SQM'];

  for (let i = 0; i < quantityHeaders.length; i++) {
    const startCol = KEY_COLS + 1 + i * colsPerBlock;
    subLabels.forEach((label, j) => {
      const cell = subHeaderRow.getCell(startCol + j);
      cell.value = label;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = grayFill;
      setCellStyle(cell);
    });
  }
  currentRow++;

  // Totals accumulator
  const totals = {};
  quantityBaseKeys.forEach((base) => {
    totals[base] = 0; // sheets
    totals[`${base}_sqm`] = 0;
    if (includeCostAndExpense) {
      totals[`${base}_amount`] = 0;
      totals[`${base}_expense_amount`] = 0;
    }
  });

  const numericCols = [3]; // Thickness
  for (let i = 0; i < quantityHeaders.length; i++) {
    const startCol = KEY_COLS + 1 + i * colsPerBlock;
    for (let c = 0; c < colsPerBlock; c++) numericCols.push(startCol + c);
  }

  // Data rows
  rows.forEach((r) => {
    const dataRow = worksheet.getRow(currentRow);

    dataRow.getCell(1).value = r.item_group_name ?? '';
    dataRow.getCell(2).value = r.item_name ?? '';
    dataRow.getCell(3).value = r.thickness ?? 0;

    quantityBaseKeys.forEach((base, i) => {
      const startCol = KEY_COLS + 1 + i * colsPerBlock;
      const sheetsKey = base;
      const sqmKey = `${base}_sqm`;

      dataRow.getCell(startCol).value = r[sheetsKey] ?? 0;
      dataRow.getCell(startCol + 1).value = r[sqmKey] ?? 0;
      totals[sheetsKey] += r[sheetsKey] ?? 0;
      totals[sqmKey] += r[sqmKey] ?? 0;

      if (includeCostAndExpense) {
        const amountKey = `${base}_amount`;
        const expenseKey = `${base}_expense_amount`;
        dataRow.getCell(startCol + 2).value = r[amountKey] ?? 0;
        dataRow.getCell(startCol + 3).value = r[expenseKey] ?? 0;
        totals[amountKey] += r[amountKey] ?? 0;
        totals[expenseKey] += r[expenseKey] ?? 0;
      }
    });

    numericCols.forEach((col) => {
      const c = dataRow.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.00';
    });

    for (let col = 1; col <= numCols; col++) setCellStyle(dataRow.getCell(col));

    currentRow++;
  });

  // Total row
  const totalRow = worksheet.getRow(currentRow);
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(2).value = '';
  totalRow.getCell(3).value = '';

  quantityBaseKeys.forEach((base, i) => {
    const startCol = KEY_COLS + 1 + i * colsPerBlock;
    totalRow.getCell(startCol).value = totals[base];
    totalRow.getCell(startCol + 1).value = totals[`${base}_sqm`];
    if (includeCostAndExpense) {
      totalRow.getCell(startCol + 2).value = totals[`${base}_amount`];
      totalRow.getCell(startCol + 3).value = totals[`${base}_expense_amount`];
    }
  });

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
    if (col > KEY_COLS && typeof cell.value === 'number') cell.numFmt = '0.00';
  }

  // Column widths
  const columns = [
    { width: 20 }, // Item Group Name
    { width: 20 }, // Sales Item Name
    { width: 12 }, // Thickness
  ];
  for (let i = 0; i < quantityHeaders.length; i++) {
    columns.push({ width: 14 }, { width: 14 }); // Sheets, SQM
    if (includeCostAndExpense) {
      columns.push({ width: 14 }, { width: 16 }); // Amount, Expense Amount
    }
  }
  worksheet.columns = columns;

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