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
  filter = {}
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
      'Purchase',
      'Receipt',
      'Issue Sq Mtr',
      'Clipping',
      'Dyeing',
      'Mixmatch',
      'Edgebanding',
      'Lipping',
      'Redressing',
      'Sale',
      'Closing Balance',
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
      const pu = Number(row.purchase) || 0;
      const re = Number(row.receipt) || 0;
      const isq = Number(row.issue_sq_mtr) || 0;
      const cl = Number(row.clipping) || 0;
      const dy = Number(row.dyeing) || 0;
      const mx = Number(row.mixmatch) || 0;
      const ed = Number(row.edgebanding) || 0;
      const li = Number(row.lipping) || 0;
      const rd = Number(row.redressing) || 0;
      const sa = Number(row.sale) || 0;
      const cb = Number(row.closing_balance) || 0;

      r.getCell(1).value = row.item_group_name ?? '';
      r.getCell(2).value = row.item_name ?? '';
      r.getCell(3).value = ob;
      r.getCell(4).value = pu;
      r.getCell(5).value = re;
      r.getCell(6).value = isq;
      r.getCell(7).value = cl;
      r.getCell(8).value = dy;
      r.getCell(9).value = mx;
      r.getCell(10).value = ed;
      r.getCell(11).value = li;
      r.getCell(12).value = rd;
      r.getCell(13).value = sa;
      r.getCell(14).value = cb;

      for (let col = 3; col <= 14; col++) r.getCell(col).numFmt = '0.00';

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
      currentRow++;
    });

    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = grandTotals.opening_balance;
    totalRow.getCell(4).value = grandTotals.purchase;
    totalRow.getCell(5).value = grandTotals.receipt;
    totalRow.getCell(6).value = grandTotals.issue_sq_mtr;
    totalRow.getCell(7).value = grandTotals.clipping;
    totalRow.getCell(8).value = grandTotals.dyeing;
    totalRow.getCell(9).value = grandTotals.mixmatch;
    totalRow.getCell(10).value = grandTotals.edgebanding;
    totalRow.getCell(11).value = grandTotals.lipping;
    totalRow.getCell(12).value = grandTotals.redressing;
    totalRow.getCell(13).value = grandTotals.sale;
    totalRow.getCell(14).value = grandTotals.closing_balance;
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      if (cell.column >= 3) cell.numFmt = '0.00';
    });

    worksheet.columns = [
      { width: 22 },
      { width: 22 },
      { width: 15 },
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
    ];

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
