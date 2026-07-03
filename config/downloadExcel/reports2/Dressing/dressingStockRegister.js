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

/**
 * Generate Dressing Stock Register Excel
 * Title: Dressing Stock Register - DD/MM/YYYY-DD/MM/YYYY
 * Columns: Item Group Name, Item Name, Opening Balance, Purchase, Receipt, Issue Sq Mtr,
 * Clipping, Dyeing, Mixmatch, Edgebanding, Lipping, Redressing, Sale, Closing Balance
 * Total row at bottom.
 *
 * @param {Array} aggregatedData - Aggregated stock data per (item_group_name, item_name)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const GenerateDressingStockRegisterExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {},
  includeCostAndExpense
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Dressing';
    await fs.mkdir(folderPath, { recursive: true });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Dressing Stock Register');

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    const title = `Dressing Stock Register - ${formattedStart}-${formattedEnd}`;

    const headers = [
      'Item Group Name',
      'Item Name',
      'Opening Balance',
      ...(includeCostAndExpense ? ['Opening Balance Amount', 'Opening Balance Expense Amount'] : []),
      'Purchase',
      'Receipt',
      'Issue Sq Mtr',
      ...(includeCostAndExpense ? ['Issue Sq Mtr Amount', 'Issue Sq Mtr Expense Amount'] : []),
      'Clipping',
      ...(includeCostAndExpense ? ['Clipping Amount', 'Clipping Expense Amount'] : []),
      'Dyeing',
      ...(includeCostAndExpense ? ['Dyeing Amount', 'Dyeing Expense Amount'] : []),
      'Mixmatch',
      ...(includeCostAndExpense ? ['Mixmatch Amount', 'Mixmatch Expense Amount'] : []),
      'Edgebanding',
      ...(includeCostAndExpense ? ['Edgebanding Amount', 'Edgebanding Expense Amount'] : []),
      'Lipping',
      ...(includeCostAndExpense ? ['Lipping Amount', 'Lipping Expense Amount'] : []),
      'Redressing',
      ...(includeCostAndExpense ? ['Redressing Amount', 'Redressing Expense Amount'] : []),
      'Sale',
      ...(includeCostAndExpense ? ['Sale Amount', 'Sale Expense Amount'] : []),
      'Closing Balance',
      ...(includeCostAndExpense ? ['Closing Balance Amount', 'Closing Balance Expense Amount'] : []),
    ];
    const numCols = headers.length;

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
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    currentRow++;

    const grandTotals = {
      opening_balance: 0,
      purchase: 0,
      receipt: 0,
      issue_sq_mtr: 0,
      clipping: 0,
      dyeing: 0,
      mixmatch: 0,
      edgebanding: 0,
      lipping: 0,
      redressing: 0,
      sale: 0,
      closing_balance: 0,
      ...(includeCostAndExpense ? {
        opening_balance_amount: 0,
        opening_balance_expense_amount: 0,
        receipt_amount: 0,
        receipt_expense_amount: 0,
        issue_sq_mtr_amount: 0,
        issue_sq_mtr_expense_amount: 0,
        clipping_amount: 0,
        clipping_expense_amount: 0,
        dyeing_amount: 0,
        dyeing_expense_amount: 0,
        mixmatch_amount: 0,
        mixmatch_expense_amount: 0,
        edgebanding_amount: 0,
        edgebanding_expense_amount: 0,
        lipping_amount: 0,
        lipping_expense_amount: 0,
        redressing_amount: 0,
        redressing_expense_amount: 0,
        sale_amount: 0,
        sale_expense_amount: 0,
        closing_balance_amount: 0,
        closing_balance_expense_amount: 0,
      } : {}),
    };

    const sortedData = [...aggregatedData].sort((a, b) => {
      const gA = a.item_group_name || '';
      const gB = b.item_group_name || '';
      if (gA !== gB) return gA.localeCompare(gB);
      return (a.item_name || '').localeCompare(b.item_name || '');
    });

    sortedData.forEach((row) => {
      const r = worksheet.getRow(currentRow);
      const ob = Number(row.opening_balance) || 0;
      const obAmt = Number(row.opening_balance_amount) || 0;
      const obExp = Number(row.opening_balance_expense_amount) || 0;
      const pu = Number(row.purchase) || 0;
      const re = Number(row.receipt) || 0;
      const reAmt = Number(row.receipt_amount) || 0;
      const reExp = Number(row.receipt_expense_amount) || 0;
      const isq = Number(row.issue_sq_mtr) || 0;
      const isqAmt = Number(row.issue_sq_mtr_amount) || 0;
      const isqExp = Number(row.issue_sq_mtr_expense_amount) || 0;
      const cl = Number(row.clipping) || 0;
      const clAmt = Number(row.clipping_amount) || 0;
      const clExp = Number(row.clipping_expense_amount) || 0;
      const dy = Number(row.dyeing) || 0;
      const dyAmt = Number(row.dyeing_amount) || 0;
      const dyExp = Number(row.dyeing_expense_amount) || 0;
      const mx = Number(row.mixmatch) || 0;
      const mxAmt = Number(row.mixmatch_amount) || 0;
      const mxExp = Number(row.mixmatch_expense_amount) || 0;
      const ed = Number(row.edgebanding) || 0;
      const edAmt = Number(row.edgebanding_amount) || 0;
      const edExp = Number(row.edgebanding_expense_amount) || 0;
      const li = Number(row.lipping) || 0;
      const liAmt = Number(row.lipping_amount) || 0;
      const liExp = Number(row.lipping_expense_amount) || 0;
      const rd = Number(row.redressing) || 0;
      const rdAmt = Number(row.redressing_amount) || 0;
      const rdExp = Number(row.redressing_expense_amount) || 0;
      const sa = Number(row.sale) || 0;
      const saAmt = Number(row.sale_amount) || 0;
      const saExp = Number(row.sale_expense_amount) || 0;
      const cb = Number(row.closing_balance) || 0;
      const cbAmt = Number(row.closing_balance_amount) || 0;
      const cbExp = Number(row.closing_balance_expense_amount) || 0;

      const rowValues = [
        row.item_group_name ?? '',
        row.item_name ?? '',
        ob,
        ...(includeCostAndExpense ? [obAmt, obExp] : []),
        pu,
        re,
        isq,
        ...(includeCostAndExpense ? [isqAmt, isqExp] : []),
        cl,
        ...(includeCostAndExpense ? [clAmt, clExp] : []),
        dy,
        ...(includeCostAndExpense ? [dyAmt, dyExp] : []),
        mx,
        ...(includeCostAndExpense ? [mxAmt, mxExp] : []),
        ed,
        ...(includeCostAndExpense ? [edAmt, edExp] : []),
        li,
        ...(includeCostAndExpense ? [liAmt, liExp] : []),
        rd,
        ...(includeCostAndExpense ? [rdAmt, rdExp] : []),
        sa,
        ...(includeCostAndExpense ? [saAmt, saExp] : []),
        cb,
        ...(includeCostAndExpense ? [cbAmt, cbExp] : []),
      ];

      rowValues.forEach((val, i) => {
        r.getCell(i + 1).value = val;
      });

      for (let col = 3; col <= numCols; col++) r.getCell(col).numFmt = '0.00';

      grandTotals.opening_balance += ob;
      grandTotals.purchase += pu;
      grandTotals.receipt += re;
      grandTotals.issue_sq_mtr += isq;
      grandTotals.clipping += cl;
      grandTotals.dyeing += dy;
      grandTotals.mixmatch += mx;
      grandTotals.edgebanding += ed;
      grandTotals.lipping += li;
      grandTotals.redressing += rd;
      grandTotals.sale += sa;
      grandTotals.closing_balance += cb;
      if (includeCostAndExpense) {
        grandTotals.opening_balance_amount += obAmt;
        grandTotals.opening_balance_expense_amount += obExp;
        grandTotals.receipt_amount += reAmt;
        grandTotals.receipt_expense_amount += reExp;
        grandTotals.issue_sq_mtr_amount += isqAmt;
        grandTotals.issue_sq_mtr_expense_amount += isqExp;
        grandTotals.clipping_amount += clAmt;
        grandTotals.clipping_expense_amount += clExp;
        grandTotals.dyeing_amount += dyAmt;
        grandTotals.dyeing_expense_amount += dyExp;
        grandTotals.mixmatch_amount += mxAmt;
        grandTotals.mixmatch_expense_amount += mxExp;
        grandTotals.edgebanding_amount += edAmt;
        grandTotals.edgebanding_expense_amount += edExp;
        grandTotals.lipping_amount += liAmt;
        grandTotals.lipping_expense_amount += liExp;
        grandTotals.redressing_amount += rdAmt;
        grandTotals.redressing_expense_amount += rdExp;
        grandTotals.sale_amount += saAmt;
        grandTotals.sale_expense_amount += saExp;
        grandTotals.closing_balance_amount += cbAmt;
        grandTotals.closing_balance_expense_amount += cbExp;
      }
      currentRow++;
    });

    const totalRowValues = [
      'Total',
      '',
      grandTotals.opening_balance,
      ...(includeCostAndExpense ? [grandTotals.opening_balance_amount, grandTotals.opening_balance_expense_amount] : []),
      grandTotals.purchase,
      grandTotals.receipt,
      grandTotals.issue_sq_mtr,
      ...(includeCostAndExpense ? [grandTotals.issue_sq_mtr_amount, grandTotals.issue_sq_mtr_expense_amount] : []),
      grandTotals.clipping,
      ...(includeCostAndExpense ? [grandTotals.clipping_amount, grandTotals.clipping_expense_amount] : []),
      grandTotals.dyeing,
      ...(includeCostAndExpense ? [grandTotals.dyeing_amount, grandTotals.dyeing_expense_amount] : []),
      grandTotals.mixmatch,
      ...(includeCostAndExpense ? [grandTotals.mixmatch_amount, grandTotals.mixmatch_expense_amount] : []),
      grandTotals.edgebanding,
      ...(includeCostAndExpense ? [grandTotals.edgebanding_amount, grandTotals.edgebanding_expense_amount] : []),
      grandTotals.lipping,
      ...(includeCostAndExpense ? [grandTotals.lipping_amount, grandTotals.lipping_expense_amount] : []),
      grandTotals.redressing,
      ...(includeCostAndExpense ? [grandTotals.redressing_amount, grandTotals.redressing_expense_amount] : []),
      grandTotals.sale,
      ...(includeCostAndExpense ? [grandTotals.sale_amount, grandTotals.sale_expense_amount] : []),
      grandTotals.closing_balance,
      ...(includeCostAndExpense ? [grandTotals.closing_balance_amount, grandTotals.closing_balance_expense_amount] : []),
    ];

    const totalRow = worksheet.getRow(currentRow);
    totalRowValues.forEach((val, i) => {
      totalRow.getCell(i + 1).value = val;
    });

    worksheet.columns = headers.map((_, i) => ({
      width: i < 2 ? 22 : 14,
    }));

    const timeStamp = new Date().getTime();
    const fileName = `Dressing-Stock-Register-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    return downloadLink;
  } catch (error) {
    console.error('Error creating dressing stock register Excel:', error);
    throw new ApiError(500, error.message, error);
  }
};
