import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return 'N/A';
  }
};

const headerStyle = {
  font: { bold: true },
  alignment: { horizontal: 'center', vertical: 'middle' },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } },
  border: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  },
};

const totalRowStyle = {
  font: { bold: true },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } },
};

/**
 * Generate Pressing Stock Register Report 3 (Sales name - Thickness) Excel
 * Title: Pressing Item Stock Register sales name - thicksens between DD/MM/YYYY and DD/MM/YYYY
 * Columns (9): Item Name, Sales item Name, Thickness, Size,
 *              Opening SqMtr, Issued for pressing SqMtr, Pressing received Sqmtr,
 *              Pressing Waste SqMtr, Closing SqMtr
 * Grouping: Item Name → Sales item Name; subtotal per Item Name; grand total row.
 *
 * @param {Array}  aggregatedData - Stock rows
 * @param {string} startDate      - YYYY-MM-DD
 * @param {string} endDate        - YYYY-MM-DD
 * @param {object} filter         - Optional filters
 * @returns {string} Download URL
 */
export const GeneratePressingStockRegisterReport3Excel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Pressing';
    await fs.mkdir(folderPath, { recursive: true });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Stock Register Sales Thickness');

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    const title = `Pressing Item Stock Register sales name - thicksens between ${formattedStart} and ${formattedEnd}`;

    const NUM_COLS = 9;
    const NUMERIC_START_COL = 5; // Opening SqMtr onwards

    const headers = [
      'Item Name',
      'Slaes item Name',
      'Thickness',
      'Size',
      'Opening SqMtr',
      'Issued for pressing SqMtr',
      'Pressing received Sqmtr',
      'Pressing Waste SqMtr',
      'Closing SqMtr',
    ];

    let currentRow = 1;

    // Title row
    worksheet.mergeCells(currentRow, 1, currentRow, NUM_COLS);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 20;
    currentRow += 2;

    // Header row
    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      Object.assign(cell, headerStyle);
    });
    currentRow++;

    // Sort: item_name → sales_item_name → thickness → size
    const sortedData = [...aggregatedData].sort((a, b) => {
      const c1 = (a.item_name || '').localeCompare(b.item_name || '');
      if (c1 !== 0) return c1;
      const c2 = (a.sales_item_name || '').localeCompare(b.sales_item_name || '');
      if (c2 !== 0) return c2;
      const c3 = (a.thickness ?? 0) - (b.thickness ?? 0);
      if (c3 !== 0) return c3;
      return (a.size || '').localeCompare(b.size || '');
    });

    const grandTotals = {
      opening_sqm: 0,
      issued_for_pressing: 0,
      pressing_received: 0,
      pressing_waste: 0,
      closing_sqm: 0,
    };

    let prevItemName = null;
    let itemTotals = null;
    let itemStartRow = null;
    const itemMergeRanges = [];

    const writeItemTotal = (name, totals, rowNum) => {
      const tr = worksheet.getRow(rowNum);
      tr.getCell(1).value = name;
      tr.getCell(2).value = 'Total';
      tr.getCell(3).value = '';
      tr.getCell(4).value = '';
      tr.getCell(5).value = totals.opening_sqm;
      tr.getCell(6).value = totals.issued_for_pressing;
      tr.getCell(7).value = totals.pressing_received;
      tr.getCell(8).value = totals.pressing_waste;
      tr.getCell(9).value = totals.closing_sqm;
      for (let c = NUMERIC_START_COL; c <= NUM_COLS; c++) tr.getCell(c).numFmt = '0.00';
      tr.eachCell((cell) => Object.assign(cell, totalRowStyle));
    };

    for (let i = 0; i < sortedData.length; i++) {
      const row = sortedData[i];
      const itemName = row.item_name ?? '';

      if (prevItemName !== null && prevItemName !== itemName) {
        writeItemTotal(prevItemName, itemTotals, currentRow);
        itemMergeRanges.push({ start: itemStartRow, end: currentRow });
        currentRow++;
        itemTotals = null;
        itemStartRow = null;
      }

      if (prevItemName !== itemName) {
        itemStartRow = currentRow;
        itemTotals = {
          opening_sqm: 0,
          issued_for_pressing: 0,
          pressing_received: 0,
          pressing_waste: 0,
          closing_sqm: 0,
        };
      }

      const ob = Number(row.opening_sqm) || 0;
      const issued = Number(row.issued_for_pressing) || 0;
      const received = Number(row.pressing_received) || 0;
      const waste = Number(row.pressing_waste) || 0;
      const closing = Number(row.closing_sqm) || 0;

      const r = worksheet.getRow(currentRow);
      r.getCell(1).value = itemName;
      r.getCell(2).value = row.sales_item_name ?? '';
      r.getCell(3).value = row.thickness ?? 0;
      r.getCell(4).value = row.size ?? '';
      r.getCell(5).value = ob;
      r.getCell(6).value = issued;
      r.getCell(7).value = received;
      r.getCell(8).value = waste;
      r.getCell(9).value = closing;
      r.getCell(3).numFmt = '0.00';
      for (let c = NUMERIC_START_COL; c <= NUM_COLS; c++) r.getCell(c).numFmt = '0.00';

      itemTotals.opening_sqm += ob;
      itemTotals.issued_for_pressing += issued;
      itemTotals.pressing_received += received;
      itemTotals.pressing_waste += waste;
      itemTotals.closing_sqm += closing;

      grandTotals.opening_sqm += ob;
      grandTotals.issued_for_pressing += issued;
      grandTotals.pressing_received += received;
      grandTotals.pressing_waste += waste;
      grandTotals.closing_sqm += closing;

      prevItemName = itemName;
      currentRow++;
    }

    // Last item subtotal
    if (itemTotals !== null && itemStartRow !== null) {
      writeItemTotal(prevItemName, itemTotals, currentRow);
      itemMergeRanges.push({ start: itemStartRow, end: currentRow });
      currentRow++;
    }

    // Merge Item Name column
    itemMergeRanges.forEach(({ start, end }) => {
      if (end > start) worksheet.mergeCells(start, 1, end, 1);
    });

    // Grand total row
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = '';
    totalRow.getCell(4).value = '';
    totalRow.getCell(5).value = grandTotals.opening_sqm;
    totalRow.getCell(6).value = grandTotals.issued_for_pressing;
    totalRow.getCell(7).value = grandTotals.pressing_received;
    totalRow.getCell(8).value = grandTotals.pressing_waste;
    totalRow.getCell(9).value = grandTotals.closing_sqm;
    totalRow.eachCell((cell) => {
      Object.assign(cell, totalRowStyle);
      if (cell.col >= NUMERIC_START_COL) cell.numFmt = '0.00';
    });

    worksheet.columns = [
      { width: 24 },
      { width: 24 },
      { width: 12 },
      { width: 16 },
      { width: 15 },
      { width: 24 },
      { width: 22 },
      { width: 20 },
      { width: 15 },
    ];

    const timeStamp = new Date().getTime();
    const fileName = `Pressing-Stock-Register-Sales-Thickness-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    return `${process.env.APP_URL}${filePath}`;
  } catch (error) {
    console.error('Error creating pressing stock register report 3 Excel:', error);
    throw new ApiError(500, error.message, error);
  }
};
