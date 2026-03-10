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

const yellowFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFD700' },
};

/**
 * Generate Grouping Stock Register Thickness Wise Excel.
 *
 * Layout:
 *   Row 1 : Title — "Grouping Item Stock Register Thickness Wise between DD/MM/YYYY and DD/MM/YYYY"
 *   Row 2 : blank
 *   Row 3 : Header row (10 columns, gray fill, bold)
 *   Row 4+ : Data rows (one per thickness group)
 *   Last  : Total row (yellow fill, bold)
 *
 * Columns (10):
 *   1  Item Group Name
 *   2  Sales Item Name
 *   3  Thickness         (0.00)
 *   4  Opening Balance   (0.00)
 *   5  Grouping Done     (0.00)
 *   6  Issue for tapping (0.00)
 *   7  Issue for Challan (0.00)
 *   8  Issue Sales       (0.00)
 *   9  Damage            (0.00)
 *  10  Closing Balance   (0.00)
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

  const headers = [
    'Item Group Name',    // col 1
    'Sales Item Name',    // col 2
    'Thickness',          // col 3
    'Opening Balance',    // col 4
    'Grouping Done',      // col 5
    'Issue for tapping',  // col 6
    'Issue for Challan',  // col 7
    'Issue Sales',        // col 8
    'Damage',             // col 9
    'Closing Balance',    // col 10
  ];
  const numCols = headers.length; // 10

  // Numeric column indices (1-based)
  const numericCols = [3, 4, 5, 6, 7, 8, 9, 10];

  let currentRow = 1;

  // Title row
  worksheet.mergeCells(currentRow, 1, currentRow, numCols);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Grouping Item Stock Register Thickness Wise between ${formattedStart} and ${formattedEnd}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow += 2; // leave one blank row

  // Header row
  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = grayFill;
    setCellStyle(cell);
  });
  currentRow++;

  // Totals accumulator
  const totals = {
    opening_balance: 0,
    grouping_done: 0,
    issue_tapping: 0,
    issue_challan: 0,
    issue_sales: 0,
    damage: 0,
    closing_balance: 0,
  };

  // Data rows
  rows.forEach((r) => {
    const dataRow = worksheet.getRow(currentRow);

    dataRow.getCell(1).value = r.item_group_name ?? '';
    dataRow.getCell(2).value = r.item_name ?? '';
    dataRow.getCell(3).value = r.thickness ?? 0;
    dataRow.getCell(4).value = r.opening_balance ?? 0;
    dataRow.getCell(5).value = r.grouping_done ?? 0;
    dataRow.getCell(6).value = r.issue_tapping ?? 0;
    dataRow.getCell(7).value = r.issue_challan ?? 0;
    dataRow.getCell(8).value = r.issue_sales ?? 0;
    dataRow.getCell(9).value = r.damage ?? 0;
    dataRow.getCell(10).value = r.closing_balance ?? 0;

    numericCols.forEach((col) => {
      const c = dataRow.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.00';
    });

    for (let col = 1; col <= numCols; col++) setCellStyle(dataRow.getCell(col));

    totals.opening_balance += r.opening_balance ?? 0;
    totals.grouping_done += r.grouping_done ?? 0;
    totals.issue_tapping += r.issue_tapping ?? 0;
    totals.issue_challan += r.issue_challan ?? 0;
    totals.issue_sales += r.issue_sales ?? 0;
    totals.damage += r.damage ?? 0;
    totals.closing_balance += r.closing_balance ?? 0;

    currentRow++;
  });

  // Total row (yellow fill)
  const totalRow = worksheet.getRow(currentRow);

  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(2).value = '';
  totalRow.getCell(3).value = '';
  totalRow.getCell(4).value = totals.opening_balance;
  totalRow.getCell(5).value = totals.grouping_done;
  totalRow.getCell(6).value = totals.issue_tapping;
  totalRow.getCell(7).value = totals.issue_challan;
  totalRow.getCell(8).value = totals.issue_sales;
  totalRow.getCell(9).value = totals.damage;
  totalRow.getCell(10).value = totals.closing_balance;

  for (let col = 1; col <= numCols; col++) {
    const cell = totalRow.getCell(col);
    cell.fill = yellowFill;
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    if (col >= 4 && typeof cell.value === 'number') {
      cell.numFmt = '0.00';
    }
  }

  // Column widths
  worksheet.columns = [
    { width: 20 }, // Item Group Name
    { width: 20 }, // Sales Item Name
    { width: 12 }, // Thickness
    { width: 16 }, // Opening Balance
    { width: 16 }, // Grouping Done
    { width: 18 }, // Issue for tapping
    { width: 18 }, // Issue for Challan
    { width: 14 }, // Issue Sales
    { width: 12 }, // Damage
    { width: 16 }, // Closing Balance
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
