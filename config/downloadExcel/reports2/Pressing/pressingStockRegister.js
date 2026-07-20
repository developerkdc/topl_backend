import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Format date to DD/MM/YYYY
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (err) {
    return 'N/A';
  }
};

const headerStyle = {
  font: { bold: true },
  alignment: { horizontal: 'center', vertical: 'middle' },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  },
  border: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  },
};

const totalRowStyle = {
  font: { bold: true },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  },
};

/**
 * Generate Pressing Item Stock Register Excel
 * Title: Pressing Item Stock Register between DD/MM/YYYY and DD/MM/YYYY
 * Columns: Category, Item Group, Item Name, OPBL SqMtr, Received SqMtr, Pur Sq Mtr,
 * Issue SqMtr, Process Waste SqMtr, New Sqmtr, Closing SqMtr.
 * Item Group subtotal rows and grand total row at end. Merged cells for Category and Item Group.
 *
 * @param {Array} aggregatedData - Aggregated stock data per (category, item_group_name, item_name)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const GeneratePressingStockRegisterExcel = async (
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
    const worksheet = workbook.addWorksheet('Pressing Item Stock Register');

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    const title = `Pressing Item Stock Register between ${formattedStart} and ${formattedEnd}`;

    const numCols = 10;
    const headers = [
      'Category',
      'Item Group',
      'Item Name',
      'OPBL SqMtr',
      ...(includeCostAndExpense ? ['OPBL Amount'] : []),
      'Received SqMtr',
      ...(includeCostAndExpense ? ['Received Amount'] : []),
      'Pur Sq Mtr',
      ...(includeCostAndExpense ? ['Pur Amount'] : []),
      'Issue SqMtr',
      ...(includeCostAndExpense ? ['Issue Amount'] : []),
      'Process Waste SqMtr',
      ...(includeCostAndExpense ? ['Process Waste Amount'] : []),
      'New Sqmtr',
      ...(includeCostAndExpense ? ['New Amount'] : []),
      'Closing SqMtr',
      ...(includeCostAndExpense ? ['Closing Amount'] : []),
    ];

    let currentRow = 1;

    worksheet.mergeCells(currentRow, 1, currentRow, numCols);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 20;
    currentRow += 2;

    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      Object.assign(cell, headerStyle);
    });
    currentRow++;

    const sortedData = [...aggregatedData].sort((a, b) => {
      const cA = a.category || '';
      const cB = b.category || '';
      if (cA !== cB) return cA.localeCompare(cB);
      const gA = a.item_group_name || '';
      const gB = b.item_group_name || '';
      if (gA !== gB) return gA.localeCompare(gB);
      return (a.item_name || '').localeCompare(b.item_name || '');
    });

    const grandTotals = {
      opening_balance: 0,
      received: 0,
      purchase: 0,
      issue: 0,
      process_waste: 0,
      new_sqmtr: 0,
      closing_balance: 0,
      ...(includeCostAndExpense ? {
        opening_amount: 0,
        received_amount: 0,
        purchase_amount: 0,
        issue_amount: 0,
        process_waste_amount: 0,
        new_sqmtr_amount: 0,
        closing_amount: 0,
      } : {}),
    };

    let prevCategory = null;
    let prevItemGroup = null;
    let groupTotals = null;
    let groupStartRow = null;

    const mergeRanges = { category: [], itemGroup: [] };
    let categoryStartRow = null;
    let itemGroupStartRow = null;

    for (let i = 0; i < sortedData.length; i++) {
      const row = sortedData[i];
      const category = row.category ?? '';
      const itemGroup = row.item_group_name ?? '';
      const itemName = row.item_name ?? '';

      if (prevItemGroup !== null && (prevCategory !== category || prevItemGroup !== itemGroup)) {
        if (groupTotals !== null && groupStartRow !== null) {
          const tr = worksheet.getRow(currentRow);
          tr.getCell(1).value = '';
          tr.getCell(2).value = '';
          tr.getCell(3).value = 'Total';
          tr.getCell(4).value = groupTotals.opening_balance;
          if (includeCostAndExpense) {
            tr.getCell(5).value = groupTotals.opening_amount;
          }
          tr.getCell(5).value = groupTotals.received;
          if (includeCostAndExpense) {
            tr.getCell(6).value = groupTotals.received_amount;
          }
          tr.getCell(6).value = groupTotals.purchase;
          if (includeCostAndExpense) {
            tr.getCell(7).value = groupTotals.purchase_amount;
          }
          tr.getCell(7).value = groupTotals.issue;
          if (includeCostAndExpense) {
            tr.getCell(8).value = groupTotals.issue_amount;
          }
          tr.getCell(8).value = groupTotals.process_waste;
          if (includeCostAndExpense) {
            tr.getCell(9).value = groupTotals.process_waste_amount;
          }
          tr.getCell(9).value = groupTotals.new_sqmtr;
          if (includeCostAndExpense) {
            tr.getCell(10).value = groupTotals.new_sqmtr_amount;
          }
          tr.getCell(10).value = groupTotals.closing_balance;
          if (includeCostAndExpense) {
            tr.getCell(11).value = groupTotals.closing_amount;
          }
          for (let col = 4; col <= 10; col++) tr.getCell(col).numFmt = '0.00';
          tr.eachCell((cell) => {
            Object.assign(cell, totalRowStyle);
          });
          mergeRanges.itemGroup.push({ start: itemGroupStartRow, end: currentRow - 1 });
          currentRow++;
        }
        groupTotals = null;
        groupStartRow = null;
      }

      if (prevCategory !== category) {
        if (categoryStartRow !== null) mergeRanges.category.push({ start: categoryStartRow, end: currentRow - 1 });
        categoryStartRow = currentRow;
      }
      if (prevItemGroup !== itemGroup || prevCategory !== category) {
        itemGroupStartRow = currentRow;
      }

      if (groupTotals === null) {
        groupTotals = {
          opening_balance: 0,
          received: 0,
          purchase: 0,
          issue: 0,
          process_waste: 0,
          new_sqmtr: 0,
          closing_balance: 0,
          ...(includeCostAndExpense ? {
            opening_amount: 0,
            received_amount: 0,
            purchase_amount: 0,
            issue_amount: 0,
            process_waste_amount: 0,
            new_sqmtr_amount: 0,
            closing_amount: 0,
          } : {}),
        };
        groupStartRow = currentRow;
      }

      const ob = Number(row.opening_balance) ?? 0;
      const re = Number(row.received) ?? 0;
      const pu = Number(row.purchase) ?? 0;
      const isq = Number(row.issue) ?? 0;
      const pw = Number(row.process_waste) ?? 0;
      const nw = Number(row.new_sqmtr) ?? 0;
      const cb = Number(row.closing_balance) ?? 0;
      const oa = Number(row.opening_amount) ?? 0;
      const ra = Number(row.received_amount) ?? 0;
      const pa = Number(row.purchase_amount) ?? 0;
      const isa = Number(row.issue_amount) ?? 0;
      const pwa = Number(row.process_waste_amount) ?? 0;
      const nwa = Number(row.new_sqmtr_amount) ?? 0;
      const cba = Number(row.closing_amount) ?? 0;

      const r = worksheet.getRow(currentRow);
      r.getCell(1).value = category;
      r.getCell(2).value = itemGroup;
      r.getCell(3).value = itemName;
      r.getCell(4).value = ob;
      r.getCell(5).value = re;
      r.getCell(6).value = pu;
      r.getCell(7).value = isq;
      r.getCell(8).value = pw;
      r.getCell(9).value = nw;
      r.getCell(10).value = cb;
      if (includeCostAndExpense) {
        r.getCell(5).value = oa;
        r.getCell(6).value = ra;
        r.getCell(7).value = pa;
        r.getCell(8).value = isa;
        r.getCell(9).value = pwa;
        r.getCell(10).value = nwa;
        r.getCell(11).value = cba;
      }
      for (let col = 4; col <= 10; col++) r.getCell(col).numFmt = '0.00';

      groupTotals.opening_balance += ob;
      groupTotals.received += re;
      groupTotals.purchase += pu;
      groupTotals.issue += isq;
      groupTotals.process_waste += pw;
      groupTotals.new_sqmtr += nw;
      groupTotals.closing_balance += cb;
      if (includeCostAndExpense) {
        groupTotals.opening_amount += oa;
        groupTotals.received_amount += ra;
        groupTotals.purchase_amount += pa;
        groupTotals.issue_amount += isa;
        groupTotals.process_waste_amount += pwa;
        groupTotals.new_sqmtr_amount += nwa;
        groupTotals.closing_amount += cba;
      }

      grandTotals.opening_balance += ob;
      grandTotals.received += re;
      grandTotals.purchase += pu;
      grandTotals.issue += isq;
      grandTotals.process_waste += pw;
      grandTotals.new_sqmtr += nw;
      grandTotals.closing_balance += cb;
      if (includeCostAndExpense) {
        grandTotals.opening_amount += oa;
        grandTotals.received_amount += ra;
        grandTotals.purchase_amount += pa;
        grandTotals.issue_amount += isa;
        grandTotals.process_waste_amount += pwa;
        grandTotals.new_sqmtr_amount += nwa;
        grandTotals.closing_amount += cba;
      }

      prevCategory = category;
      prevItemGroup = itemGroup;
      currentRow++;
    }

    if (groupTotals !== null && groupStartRow !== null) {
      const tr = worksheet.getRow(currentRow);
      tr.getCell(1).value = '';
      tr.getCell(2).value = '';
      tr.getCell(3).value = 'Total';
      tr.getCell(4).value = groupTotals.opening_balance;
      if (includeCostAndExpense) {
        tr.getCell(5).value = groupTotals.opening_amount;
      }
      tr.getCell(5).value = groupTotals.received;
      if (includeCostAndExpense) {
        tr.getCell(6).value = groupTotals.received_amount;
      }
      tr.getCell(6).value = groupTotals.purchase;
      if (includeCostAndExpense) {
        tr.getCell(7).value = groupTotals.purchase_amount;
      }
      tr.getCell(7).value = groupTotals.issue;
      if (includeCostAndExpense) {
        tr.getCell(8).value = groupTotals.issue_amount;
      }
      tr.getCell(8).value = groupTotals.process_waste;
      if (includeCostAndExpense) {
        tr.getCell(9).value = groupTotals.process_waste_amount;
      }
      tr.getCell(9).value = groupTotals.new_sqmtr;
      if (includeCostAndExpense) {
        tr.getCell(10).value = groupTotals.new_sqmtr_amount;
      }
      tr.getCell(10).value = groupTotals.closing_balance;
      if (includeCostAndExpense) {
        tr.getCell(11).value = groupTotals.closing_amount;
      }
      for (let col = 4; col <= 10; col++) tr.getCell(col).numFmt = '0.00';
      tr.eachCell((cell) => Object.assign(cell, totalRowStyle));
      mergeRanges.itemGroup.push({ start: itemGroupStartRow, end: currentRow - 1 });
      currentRow++;
    }
    if (categoryStartRow !== null) mergeRanges.category.push({ start: categoryStartRow, end: currentRow - 1 });

    mergeRanges.category.forEach(({ start, end }) => {
      if (end > start) worksheet.mergeCells(start, 1, end, 1);
    });
    mergeRanges.itemGroup.forEach(({ start, end }) => {
      if (end > start) worksheet.mergeCells(start, 2, end, 2);
    });

    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = '';
    totalRow.getCell(4).value = grandTotals.opening_balance;
    if (includeCostAndExpense) {
      totalRow.getCell(5).value = grandTotals.opening_amount;
    }
    totalRow.getCell(5).value = grandTotals.received;
    if (includeCostAndExpense) {
      totalRow.getCell(6).value = grandTotals.received_amount;
    }
    totalRow.getCell(6).value = grandTotals.purchase;
    if (includeCostAndExpense) {
      totalRow.getCell(7).value = grandTotals.purchase_amount;
    }
    totalRow.getCell(7).value = grandTotals.issue;
    if (includeCostAndExpense) {
      totalRow.getCell(8).value = grandTotals.issue_amount;
    }
    totalRow.getCell(8).value = grandTotals.process_waste;
    if (includeCostAndExpense) {
      totalRow.getCell(9).value = grandTotals.process_waste_amount;
    }
    totalRow.getCell(9).value = grandTotals.new_sqmtr;
    if (includeCostAndExpense) {
      totalRow.getCell(10).value = grandTotals.new_sqmtr_amount;
    }
    totalRow.getCell(10).value = grandTotals.closing_balance;
    if (includeCostAndExpense) {
      totalRow.getCell(11).value = grandTotals.closing_amount;
    }
    totalRow.eachCell((cell) => {
      Object.assign(cell, totalRowStyle);
      if (cell.column >= 4) cell.numFmt = '0.00';
    });

    worksheet.columns = [
      { width: 20 },
      { width: 22 },
      { width: 28 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 18 },
      { width: 12 },
      { width: 14 },
    ];

    const timeStamp = new Date().getTime();
    const fileName = `Pressing-Stock-Register-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    return downloadLink;
  } catch (error) {
    console.error('Error creating pressing stock register Excel:', error);
    throw new ApiError(500, error.message, error);
  }
};
