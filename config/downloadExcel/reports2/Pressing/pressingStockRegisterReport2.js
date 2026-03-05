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
 * Generate Pressing Stock Register Report 2 (Group No Wise) Excel
 * Title: Pressing Item Stock Register between group no wise DD/MM/YYYY and DD/MM/YYYY
 * Columns (11): Item Name, Group no, Photo No, Order No, Thickness, Size,
 *               Opening SqMtr, Issued for pressing SqMtr, Pressing received Sqmtr,
 *               Pressing Waste SqMtr, Closing SqMtr
 * Grouping: Item Name; subtotal per Item Name; grand total row.
 *
 * @param {Array}  aggregatedData - Stock rows
 * @param {string} startDate      - YYYY-MM-DD
 * @param {string} endDate        - YYYY-MM-DD
 * @param {object} filter         - Optional filters
 * @returns {string} Download URL
 */
export const GeneratePressingStockRegisterReport2Excel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Pressing';
    await fs.mkdir(folderPath, { recursive: true });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Stock Register Group Wise');

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    const title = `Pressing Item Stock Register between group no wise ${formattedStart} and ${formattedEnd}`;

    const NUM_COLS = 11;
    const NUMERIC_START_COL = 7; // Opening SqMtr onwards

    const headers = [
      'Item Name',
      'Group no',
      'Photo No',
      'Order No',
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

    // Sort by item_name → group_no
    const sortedData = [...aggregatedData].sort((a, b) => {
      const cmp = (a.item_name || '').localeCompare(b.item_name || '');
      if (cmp !== 0) return cmp;
      return (a.group_no || '').localeCompare(b.group_no || '');
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

    const writeItemTotal = (name, totals, endRowNum) => {
      const tr = worksheet.getRow(endRowNum);
      tr.getCell(1).value = name;
      tr.getCell(2).value = 'Total';
      for (let c = 3; c <= 6; c++) tr.getCell(c).value = '';
      tr.getCell(7).value = totals.opening_sqm;
      tr.getCell(8).value = totals.issued_for_pressing;
      tr.getCell(9).value = totals.pressing_received;
      tr.getCell(10).value = totals.pressing_waste;
      tr.getCell(11).value = totals.closing_sqm;
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
      r.getCell(2).value = row.group_no ?? '';
      r.getCell(3).value = row.photo_no ?? '';
      r.getCell(4).value = row.order_no ?? '';
      r.getCell(5).value = row.thickness ?? 0;
      r.getCell(6).value = row.size ?? '';
      r.getCell(7).value = ob;
      r.getCell(8).value = issued;
      r.getCell(9).value = received;
      r.getCell(10).value = waste;
      r.getCell(11).value = closing;
      r.getCell(5).numFmt = '0.00';
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
    for (let c = 2; c <= 6; c++) totalRow.getCell(c).value = '';
    totalRow.getCell(7).value = grandTotals.opening_sqm;
    totalRow.getCell(8).value = grandTotals.issued_for_pressing;
    totalRow.getCell(9).value = grandTotals.pressing_received;
    totalRow.getCell(10).value = grandTotals.pressing_waste;
    totalRow.getCell(11).value = grandTotals.closing_sqm;
    totalRow.eachCell((cell) => {
      Object.assign(cell, totalRowStyle);
      if (cell.col >= NUMERIC_START_COL) cell.numFmt = '0.00';
    });

    worksheet.columns = [
      { width: 24 },
      { width: 16 },
      { width: 13 },
      { width: 16 },
      { width: 12 },
      { width: 16 },
      { width: 15 },
      { width: 24 },
      { width: 22 },
      { width: 20 },
      { width: 15 },
    ];

    const timeStamp = new Date().getTime();
    const fileName = `Pressing-Stock-Register-Group-Wise-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    return `${process.env.APP_URL}${filePath}`;
  } catch (error) {
    console.error('Error creating pressing stock register report 2 Excel:', error);
    throw new ApiError(500, error.message, error);
  }
};
