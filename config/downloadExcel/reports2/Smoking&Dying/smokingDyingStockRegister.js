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
 * Generate Smoking&Dying Stock Register Excel
 * Title: Smoking&Dying Stock Register - DD/MM/YYYY-DD/MM/YYYY
 * Columns: Item Group Name, Item Name, Opening Balance, Direct Dye, DR Dyed,
 * Issue Sq Mtr, Clipping, Mixmatch, Edgebanding, Lipping, Sale, Closing Balance
 * Total row at bottom.
 *
 * @param {Array} aggregatedData - Aggregated stock data per (item_group_name, item_name)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const GenerateSmokingDyingStockRegisterExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Smoking&Dying';
    await fs.mkdir(folderPath, { recursive: true });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Smoking&Dying Stock Register');

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    const title = `Smoking&Dying Stock Register - ${formattedStart}-${formattedEnd}`;

    const headers = [
      'Item Group Name',
      'Item Name',
      'Opening Balance',
      'Direct Dye',
      'DR Dyed',
      'Issue Sq Mtr',
      'Clipping',
      'Mixmatch',
      'Edgebanding',
      'Lipping',
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
      direct_dye: 0,
      dr_dyed: 0,
      issue_sq_mtr: 0,
      clipping: 0,
      mixmatch: 0,
      edgebanding: 0,
      lipping: 0,
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
      const dd = Number(row.direct_dye) || 0;
      const dr = Number(row.dr_dyed) || 0;
      const isq = Number(row.issue_sq_mtr) || 0;
      const cl = Number(row.clipping) || 0;
      const mx = Number(row.mixmatch) || 0;
      const ed = Number(row.edgebanding) || 0;
      const li = Number(row.lipping) || 0;
      const sa = Number(row.sale) || 0;
      const cb = Number(row.closing_balance) || 0;

      r.getCell(1).value = row.item_group_name ?? '';
      r.getCell(2).value = row.item_name ?? '';
      r.getCell(3).value = ob;
      r.getCell(4).value = dd;
      r.getCell(5).value = dr;
      r.getCell(6).value = isq;
      r.getCell(7).value = cl;
      r.getCell(8).value = mx;
      r.getCell(9).value = ed;
      r.getCell(10).value = li;
      r.getCell(11).value = sa;
      r.getCell(12).value = cb;

      for (let col = 3; col <= 12; col++) r.getCell(col).numFmt = '0.00';

      grandTotals.opening_balance += ob;
      grandTotals.direct_dye += dd;
      grandTotals.dr_dyed += dr;
      grandTotals.issue_sq_mtr += isq;
      grandTotals.clipping += cl;
      grandTotals.mixmatch += mx;
      grandTotals.edgebanding += ed;
      grandTotals.lipping += li;
      grandTotals.sale += sa;
      grandTotals.closing_balance += cb;
      currentRow++;
    });

    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = grandTotals.opening_balance;
    totalRow.getCell(4).value = grandTotals.direct_dye;
    totalRow.getCell(5).value = grandTotals.dr_dyed;
    totalRow.getCell(6).value = grandTotals.issue_sq_mtr;
    totalRow.getCell(7).value = grandTotals.clipping;
    totalRow.getCell(8).value = grandTotals.mixmatch;
    totalRow.getCell(9).value = grandTotals.edgebanding;
    totalRow.getCell(10).value = grandTotals.lipping;
    totalRow.getCell(11).value = grandTotals.sale;
    totalRow.getCell(12).value = grandTotals.closing_balance;
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
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
    ];

    const timeStamp = new Date().getTime();
    const fileName = `Smoking-Dying-Stock-Register-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    return downloadLink;
  } catch (error) {
    console.error('Error creating smoking & dying stock register Excel:', error);
    throw new ApiError(500, error.message, error);
  }
};
