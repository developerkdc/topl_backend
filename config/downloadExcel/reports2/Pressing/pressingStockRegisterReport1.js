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

const subHeaderStyle = {
  font: { bold: true, size: 9 },
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
 * Generate Pressing Stock Register Report 1 (Sales name - Thickness - Other Process Wise) Excel
 *
 * Title: Pressing Item Stock Register sales name - thickness - other process wise between DD/MM/YYYY and DD/MM/YYYY
 *
 * Layout (two header rows):
 *   Row A (span headers):
 *     Cols 1-4: Item Name, Sales item Name, Thickness, Size (span 2 rows each)
 *     Col 5:    Opening SqMtr (span 2 rows)
 *     Col 6:    Pressing SqMtr (span 2 rows)
 *     Cols 7-8: "Alls Sell (Direct Pressing+Cnc+Colour+Polish)" (merged)
 *     Col 9:    "All Damage(Pressing+Cnc+Colour+Polish)" (span 2 rows)
 *     Col 10:   Process Waste (span 2 rows)
 *     Col 11:   Closing SqMtr (span 2 rows)
 *   Row B (sub-headers):
 *     Col 7: Sales
 *     Col 8: Issue for Challan
 *
 * Grouping: Item Name; subtotal per Item Name; grand total row.
 *
 * @param {Array}  aggregatedData - Stock rows
 * @param {string} startDate      - YYYY-MM-DD
 * @param {string} endDate        - YYYY-MM-DD
 * @param {object} filter         - Optional filters
 * @returns {string} Download URL
 */
export const GeneratePressingStockRegisterReport1Excel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {},
  includeCostAndExpense
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Pressing';
    await fs.mkdir(folderPath, { recursive: true });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Stock Register Sales Thickness Process');

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    const title = `Pressing Item Stock Register sales name - thickness - other process wise between ${formattedStart} and ${formattedEnd}`;

    const NUM_COLS = includeCostAndExpense ? 16 : 11;

    // ── Title row ────────────────────────────────────────────────────────────
    let currentRow = 1;
    worksheet.mergeCells(currentRow, 1, currentRow, NUM_COLS);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 20;
    currentRow += 2;

    // ── Two-row header ────────────────────────────────────────────────────────
    // Row A: span headers
    const headerRowA = currentRow;
    const headerRowB = currentRow + 1;

    // Cols 1-6 and 9-11 span both header rows
    let col = 1;

    const spanCols = [
      { col: col++, label: 'Item Name' },
      { col: col++, label: 'Sales item Name' },
      { col: col++, label: 'Thickness' },
      { col: col++, label: 'Size' },

      { col: col++, label: 'Opening SqMtr' },
      ...(includeCostAndExpense
        ? [{ col: col++, label: 'Opening Amount' }]
        : []),

      { col: col++, label: 'Pressing SqMtr' },
      ...(includeCostAndExpense
        ? [{ col: col++, label: 'Pressing Amount' }]
        : []),
    ];

    const salesStartCol = col;

    const salesCol = col++;
    const challanCol = col++;

    const damageCol = col++;
    const damageAmountCol = includeCostAndExpense ? col++ : null;

    const wasteCol = col++;
    const wasteAmountCol = includeCostAndExpense ? col++ : null;

    const closingCol = col++;
    const closingAmountCol = includeCostAndExpense ? col++ : null;

    spanCols.push(
      { col: damageCol, label: 'All Damage\n(Pressing+Cnc+Colour+Polish)' },
      { col: wasteCol, label: 'Process Waste' },
      { col: closingCol, label: 'Closing SqMtr' }
    );

    if (includeCostAndExpense) {
      spanCols.push(
        { col: damageAmountCol, label: 'Damage Amount' },
        { col: wasteAmountCol, label: 'Process Waste Amount' },
        { col: closingAmountCol, label: 'Closing Amount' }
      );
    }

    for (const { col, label } of spanCols) {
      worksheet.mergeCells(headerRowA, col, headerRowB, col);
      const cell = worksheet.getCell(headerRowA, col);
      cell.value = label;
      Object.assign(cell, headerStyle);
    }

    // "Alls Sell" group header spans cols 7-8
    worksheet.mergeCells(headerRowA, salesStartCol, headerRowA, salesStartCol + 1);
    const allSellCell = worksheet.getCell(headerRowA, salesStartCol);
    allSellCell.value = 'Alls Sell\n(Direct Pressing+Cnc+Colour+Polish)';
    Object.assign(allSellCell, headerStyle);

    // Sub-headers in row B for cols 7-8
    const subHeaders = [
      { col: salesCol, label: 'Sales' },
      { col: challanCol, label: 'Issue for Challan' },
    ];
    for (const { col, label } of subHeaders) {
      const cell = worksheet.getCell(headerRowB, col);
      cell.value = label;
      Object.assign(cell, subHeaderStyle);
    }

    worksheet.getRow(headerRowA).height = 28;
    worksheet.getRow(headerRowB).height = 20;
    currentRow += 2;

    // ── Sort: item_name → sales_item_name → thickness → size ─────────────────
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
      pressing_sqm: 0,
      sales: 0,
      issue_for_challan: 0,
      damage: 0,
      process_waste: 0,
      closing_sqm: 0,
      ...(includeCostAndExpense ? {
        opening_amount: 0,
        pressing_amount: 0,
        sales_amount: 0,
        issue_for_challan_amount: 0,
        damage_amount: 0,
        process_waste_amount: 0,
        closing_amount: 0,
      } : {}),
    };

    let prevItemName = null;
    let itemTotals = null;
    let itemStartRow = null;
    const itemMergeRanges = [];

    const writeItemTotal = (name, totals, rowNum) => {
      const tr = worksheet.getRow(rowNum);
      tr.getCell(1).value = 'Total';
      tr.getCell(2).value = '';
      tr.getCell(3).value = '';
      tr.getCell(4).value = '';
      tr.getCell(5).value = totals.opening_sqm;
      tr.getCell(6).value = totals.pressing_sqm;
      tr.getCell(7).value = totals.sales;
      tr.getCell(8).value = totals.issue_for_challan;
      tr.getCell(9).value = totals.damage;
      tr.getCell(10).value = totals.process_waste;
      tr.getCell(11).value = totals.closing_sqm;
      if (includeCostAndExpense) {
        tr.getCell(6).value = totals.opening_amount;
        tr.getCell(8).value = totals.pressing_amount;
        tr.getCell(7).value = totals.sales_amount;
        tr.getCell(9).value = totals.issue_for_challan_amount;
        tr.getCell(10).value = totals.damage_amount;
        tr.getCell(11).value = totals.process_waste_amount;
        tr.getCell(12).value = totals.closing_amount;
      }
      for (let c = 5; c <= NUM_COLS; c++) tr.getCell(c).numFmt = '0.00';
      tr.eachCell((cell) => Object.assign(cell, totalRowStyle));
    };

    for (let i = 0; i < sortedData.length; i++) {
      const row = sortedData[i];
      const itemName = row.item_name ?? '';

      if (prevItemName !== null && prevItemName !== itemName) {
        writeItemTotal(prevItemName, itemTotals, currentRow);
        itemMergeRanges.push({ start: itemStartRow, end: currentRow - 2 });
        currentRow++;
        itemTotals = null;
        itemStartRow = null;
      }

      if (prevItemName !== itemName) {
        itemStartRow = currentRow;
        itemTotals = {
          opening_sqm: 0,
          pressing_sqm: 0,
          sales: 0,
          issue_for_challan: 0,
          damage: 0,
          process_waste: 0,
          closing_sqm: 0,
          ...(includeCostAndExpense ? {
            opening_amount: 0,
            pressing_amount: 0,
            sales_amount: 0,
            issue_for_challan_amount: 0,
            damage_amount: 0,
            process_waste_amount: 0,
            closing_amount: 0,
          } : {}),
        };
      }

      const ob = Number(row.opening_sqm) || 0;
      const pressing = Number(row.pressing_sqm) || 0;
      const sales = Number(row.sales) || 0;
      const challan = Number(row.issue_for_challan) || 0;
      const damage = Number(row.damage) || 0;
      const waste = Number(row.process_waste) || 0;
      const closing = Number(row.closing_sqm) || 0;
      const ob_amount = Number(row.opening_amount) || 0;
      const pressing_amount = Number(row.pressing_amount) || 0;
      const sales_amount = Number(row.sales_amount) || 0;
      const challan_amount = Number(row.issue_for_challan_amount) || 0;
      const damage_amount = Number(row.damage_amount) || 0;
      const waste_amount = Number(row.process_waste_amount) || 0;
      const closing_amount = Number(row.closing_amount) || 0;

      const r = worksheet.getRow(currentRow);
      r.getCell(1).value = itemName;
      r.getCell(2).value = row.sales_item_name ?? '';
      r.getCell(3).value = row.thickness ?? 0;
      r.getCell(4).value = row.size ?? '';
      r.getCell(5).value = ob;
      r.getCell(6).value = pressing;
      r.getCell(7).value = sales;
      r.getCell(8).value = challan;
      r.getCell(9).value = damage;
      r.getCell(10).value = waste;
      r.getCell(11).value = closing;
      if (includeCostAndExpense) {
        r.getCell(6).value = ob_amount;
        r.getCell(8).value = pressing_amount;
        r.getCell(7).value = sales_amount;
        r.getCell(9).value = challan_amount;
        r.getCell(10).value = damage_amount;
        r.getCell(11).value = waste_amount;
        r.getCell(12).value = closing_amount;
      }
      r.getCell(3).numFmt = '0.00';
      for (let c = 5; c <= NUM_COLS; c++) r.getCell(c).numFmt = '0.00';

      itemTotals.opening_sqm += ob;
      itemTotals.pressing_sqm += pressing;
      itemTotals.sales += sales;
      itemTotals.issue_for_challan += challan;
      itemTotals.damage += damage;
      itemTotals.process_waste += waste;
      itemTotals.closing_sqm += closing;
      if (includeCostAndExpense) {
        itemTotals.opening_amount += ob_amount;
        itemTotals.pressing_amount += pressing_amount;
        itemTotals.sales_amount += sales_amount;
        itemTotals.issue_for_challan_amount += challan_amount;
        itemTotals.damage_amount += damage_amount;
        itemTotals.process_waste_amount += waste_amount;
        itemTotals.closing_amount += closing_amount;
      }

      grandTotals.opening_sqm += ob;
      grandTotals.pressing_sqm += pressing;
      grandTotals.sales += sales;
      grandTotals.issue_for_challan += challan;
      grandTotals.damage += damage;
      grandTotals.process_waste += waste;
      grandTotals.closing_sqm += closing;
      if (includeCostAndExpense) {
        grandTotals.opening_amount += ob_amount;
        grandTotals.pressing_amount += pressing_amount;
        grandTotals.sales_amount += sales_amount;
        grandTotals.issue_for_challan_amount += challan_amount;
        grandTotals.damage_amount += damage_amount;
        grandTotals.process_waste_amount += waste_amount;
        grandTotals.closing_amount += closing_amount;
      }

      prevItemName = itemName;
      currentRow++;
    }

    // Last item subtotal
    if (itemTotals !== null && itemStartRow !== null) {
      writeItemTotal(prevItemName, itemTotals, currentRow);
      itemMergeRanges.push({ start: itemStartRow, end: currentRow - 2 });
      currentRow++;
    }

    // Merge Item Name column across its group rows + subtotal row
    itemMergeRanges.forEach(({ start, end }) => {
      if (end <= start) return;

      const alreadyMerged = worksheet._merges &&
        Object.values(worksheet._merges).some((m) => {
          return !(
            end < m.top ||
            start > m.bottom ||
            1 < m.left ||
            1 > m.right
          );
        });

      if (!alreadyMerged) {
        worksheet.mergeCells(start, 1, end, 1);
      }
    });

    // Grand total row
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    for (let c = 2; c <= 4; c++) totalRow.getCell(c).value = '';
    totalRow.getCell(5).value = grandTotals.opening_sqm;
    totalRow.getCell(6).value = grandTotals.pressing_sqm;
    totalRow.getCell(7).value = grandTotals.sales;
    totalRow.getCell(8).value = grandTotals.issue_for_challan;
    totalRow.getCell(9).value = grandTotals.damage;
    totalRow.getCell(10).value = grandTotals.process_waste;
    totalRow.getCell(11).value = grandTotals.closing_sqm;
    if (includeCostAndExpense) {
      totalRow.getCell(6).value = grandTotals.opening_amount;
      totalRow.getCell(8).value = grandTotals.pressing_amount;
      totalRow.getCell(7).value = grandTotals.sales_amount;
      totalRow.getCell(9).value = grandTotals.issue_for_challan_amount;
      totalRow.getCell(10).value = grandTotals.damage_amount;
      totalRow.getCell(11).value = grandTotals.process_waste_amount;
      totalRow.getCell(12).value = grandTotals.closing_amount;
    }
    totalRow.eachCell((cell) => {
      Object.assign(cell, totalRowStyle);
      if (cell.col >= 5) cell.numFmt = '0.00';
    });

    worksheet.columns = [
      { width: 24 },
      { width: 24 },
      { width: 12 },
      { width: 16 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 18 },
      { width: 28 },
      { width: 15 },
      { width: 15 },
    ];

    const timeStamp = new Date().getTime();
    const fileName = `Pressing-Stock-Register-Sales-Thickness-Process-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    return `${process.env.APP_URL}${filePath}`;
  } catch (error) {
    console.error('Error creating pressing stock register report 1 Excel:', error);
    throw new ApiError(500, error.message, error);
  }
};
