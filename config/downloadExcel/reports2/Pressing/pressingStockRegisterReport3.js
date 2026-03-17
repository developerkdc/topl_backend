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
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
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
    const title = `Pressing Item Stock Register sales name - thickness between ${formattedStart} and ${formattedEnd}`;

    const headers = [
      'Item Name',
      'Sales Item Name',
      'Thickness',
      'Size',
      'Opening SqMtr',
      'Issued for pressing SqMtr',
      'Pressing received Sqmtr',
      'Pressing Waste SqMtr',
      'Sales',
      'All Damage',
      'Closing SqMtr',
    ];
    const NUM_COLS = headers.length;
    const NUMERIC_START_COL = 5;

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
    worksheet.getRow(currentRow).height = 25;
    currentRow++;

    const sortedData = [...aggregatedData].sort((a, b) => {
      const c1 = (a.item_name || '').localeCompare(b.item_name || '');
      if (c1 !== 0) return c1;
      const c2 = (a.sales_item_name || '').localeCompare(b.sales_item_name || '');
      if (c2 !== 0) return c2;
      return (a.thickness ?? 0) - (b.thickness ?? 0);
    });

    const grandTotals = {
      opening_sqm: 0,
      issued_for_pressing: 0,
      pressing_received: 0,
      pressing_waste: 0,
      sales: 0,
      all_damage: 0,
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
      tr.getCell(9).value = totals.sales;
      tr.getCell(10).value = totals.all_damage;
      tr.getCell(11).value = totals.closing_sqm;
      for (let c = NUMERIC_START_COL; c <= NUM_COLS; c++) tr.getCell(c).numFmt = '0.00';
      tr.eachCell((cell) => Object.assign(cell, totalRowStyle));
    };

    for (const row of sortedData) {
      const itemName = row.item_name ?? '';

      if (prevItemName !== null && prevItemName !== itemName) {
        writeItemTotal(prevItemName, itemTotals, currentRow);
        itemMergeRanges.push({ start: itemStartRow, end: currentRow });
        currentRow++;
        itemTotals = null;
      }

      if (itemTotals === null) {
        itemStartRow = currentRow;
        itemTotals = {
          opening_sqm: 0,
          issued_for_pressing: 0,
          pressing_received: 0,
          pressing_waste: 0,
          sales: 0,
          all_damage: 0,
          closing_sqm: 0,
        };
      }

      const r = worksheet.getRow(currentRow);
      r.getCell(1).value = itemName;
      r.getCell(2).value = row.sales_item_name ?? '';
      r.getCell(3).value = row.thickness ?? 0;
      r.getCell(4).value = row.size ?? '';
      r.getCell(5).value = row.opening_sqm;
      r.getCell(6).value = row.issued_for_pressing;
      r.getCell(7).value = row.pressing_received;
      r.getCell(8).value = row.pressing_waste;
      r.getCell(9).value = row.sales;
      r.getCell(10).value = row.all_damage;
      r.getCell(11).value = row.closing_sqm;

      r.getCell(3).numFmt = '0.00';
      for (let c = NUMERIC_START_COL; c <= NUM_COLS; c++) r.getCell(c).numFmt = '0.00';

      itemTotals.opening_sqm += row.opening_sqm;
      itemTotals.issued_for_pressing += row.issued_for_pressing;
      itemTotals.pressing_received += row.pressing_received;
      itemTotals.pressing_waste += row.pressing_waste;
      itemTotals.sales += row.sales;
      itemTotals.all_damage += row.all_damage;
      itemTotals.closing_sqm += row.closing_sqm;

      grandTotals.opening_sqm += row.opening_sqm;
      grandTotals.issued_for_pressing += row.issued_for_pressing;
      grandTotals.pressing_received += row.pressing_received;
      grandTotals.pressing_waste += row.pressing_waste;
      grandTotals.sales += row.sales;
      grandTotals.all_damage += row.all_damage;
      grandTotals.closing_sqm += row.closing_sqm;

      prevItemName = itemName;
      currentRow++;
    }

    if (itemTotals !== null) {
      writeItemTotal(prevItemName, itemTotals, currentRow);
      itemMergeRanges.push({ start: itemStartRow, end: currentRow });
      currentRow++;
    }

    itemMergeRanges.forEach(({ start, end }) => {
      if (end > start) worksheet.mergeCells(start, 1, end, 1);
    });

    const gr = worksheet.getRow(currentRow);
    gr.getCell(1).value = 'Total';
    for (let c = 2; c <= 4; c++) gr.getCell(c).value = '';
    gr.getCell(5).value = grandTotals.opening_sqm;
    gr.getCell(6).value = grandTotals.issued_for_pressing;
    gr.getCell(7).value = grandTotals.pressing_received;
    gr.getCell(8).value = grandTotals.pressing_waste;
    gr.getCell(9).value = grandTotals.sales;
    gr.getCell(10).value = grandTotals.all_damage;
    gr.getCell(11).value = grandTotals.closing_sqm;
    gr.eachCell((cell) => {
      Object.assign(cell, totalRowStyle);
      if (cell.col >= NUMERIC_START_COL) cell.numFmt = '0.00';
    });

    worksheet.columns = [
      { width: 24 }, { width: 24 }, { width: 12 }, { width: 16 }, { width: 15 },
      { width: 22 }, { width: 20 }, { width: 18 }, { width: 12 }, { width: 15 }, { width: 15 }
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
