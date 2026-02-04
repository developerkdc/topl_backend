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

/**
 * Generate Grouping/Splicing Stock Register Excel
 * Title: Splicing Item Stock Register - DD/MM/YYYY and DD/MM/YYYY
 * Columns: Item Group Name, Item Name, Opening Balance, Purchase Sq. Mtr,
 * Received SqMtr (Hand Splice, Machine Splice), Issue Sqmtr (Pressing, Demage, Sale, Issue For Cal Ply Pressing Sq Mtr),
 * Process Waste, Closing Balance. Total row at bottom.
 *
 * @param {Array} aggregatedData - Aggregated stock data per (item_group_name, item_name)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const GenerateGroupingSplicingStockRegisterExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Grouping_Splicing';
    await fs.mkdir(folderPath, { recursive: true });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Splicing Item Stock Register');

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    const title = `Splicing Item Stock Register - ${formattedStart} and ${formattedEnd}`;

    const numCols = 12;

    let currentRow = 1;

    worksheet.mergeCells(currentRow, 1, currentRow, numCols);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 20;
    currentRow += 2;

    // Header row 1: main headers with merged Received SqMtr (5-6) and Issue Sqmtr (7-10)
    const headerRow1 = worksheet.getRow(currentRow);
    const mainHeaders = [
      'Item Group Name',
      'Item Name',
      'Opening Balance',
      'Purchase Sq. Mtr',
      'Received SqMtr',
      '', // merged with 5
      'Issue Sqmtr',
      '', // merged with 7
      '', // merged with 7
      '', // merged with 7
      'Process Waste',
      'Closing Balance',
    ];
    mainHeaders.forEach((h, i) => {
      const cell = headerRow1.getCell(i + 1);
      cell.value = h;
      Object.assign(cell, headerStyle);
    });
    worksheet.mergeCells(currentRow, 5, currentRow, 6);
    worksheet.mergeCells(currentRow, 7, currentRow, 10);
    currentRow++;

    // Header row 2: sub-headers for Received (5-6) and Issue (7-10)
    const headerRow2 = worksheet.getRow(currentRow);
    const subHeaders = [
      '',
      '',
      '',
      '',
      'Hand Splice',
      'Machine Splice',
      'Pressing',
      'Demage',
      'Sale',
      'Issue For Cal Ply Pressing Sq Mtr',
      '',
      '',
    ];
    subHeaders.forEach((h, i) => {
      const cell = headerRow2.getCell(i + 1);
      cell.value = h;
      Object.assign(cell, headerStyle);
    });
    currentRow++;

    const grandTotals = {
      opening_balance: 0,
      purchase: 0,
      hand_splice: 0,
      machine_splice: 0,
      pressing: 0,
      demage: 0,
      sale: 0,
      issue_for_cal_ply_pressing: 0,
      process_waste: 0,
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
      const ob = Number(row.opening_balance) ?? 0;
      const pu = Number(row.purchase) ?? 0;
      const hs = Number(row.hand_splice) ?? 0;
      const ms = Number(row.machine_splice) ?? 0;
      const pr = Number(row.pressing) ?? 0;
      const dm = Number(row.demage) ?? 0;
      const sa = Number(row.sale) ?? 0;
      const cal = Number(row.issue_for_cal_ply_pressing) ?? 0;
      const pw = Number(row.process_waste) ?? 0;
      const cb = Number(row.closing_balance) ?? 0;

      r.getCell(1).value = row.item_group_name ?? '';
      r.getCell(2).value = row.item_name ?? '';
      r.getCell(3).value = ob;
      r.getCell(4).value = pu;
      r.getCell(5).value = hs;
      r.getCell(6).value = ms;
      r.getCell(7).value = pr;
      r.getCell(8).value = dm;
      r.getCell(9).value = sa;
      r.getCell(10).value = cal;
      r.getCell(11).value = pw;
      r.getCell(12).value = cb;

      for (let col = 3; col <= 12; col++) r.getCell(col).numFmt = '0.00';

      grandTotals.opening_balance += ob;
      grandTotals.purchase += pu;
      grandTotals.hand_splice += hs;
      grandTotals.machine_splice += ms;
      grandTotals.pressing += pr;
      grandTotals.demage += dm;
      grandTotals.sale += sa;
      grandTotals.issue_for_cal_ply_pressing += cal;
      grandTotals.process_waste += pw;
      grandTotals.closing_balance += cb;
      currentRow++;
    });

    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = grandTotals.opening_balance;
    totalRow.getCell(4).value = grandTotals.purchase;
    totalRow.getCell(5).value = grandTotals.hand_splice;
    totalRow.getCell(6).value = grandTotals.machine_splice;
    totalRow.getCell(7).value = grandTotals.pressing;
    totalRow.getCell(8).value = grandTotals.demage;
    totalRow.getCell(9).value = grandTotals.sale;
    totalRow.getCell(10).value = grandTotals.issue_for_cal_ply_pressing;
    totalRow.getCell(11).value = grandTotals.process_waste;
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
      { width: 14 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 28 },
      { width: 14 },
      { width: 15 },
    ];

    const timeStamp = new Date().getTime();
    const fileName = `Grouping-Splicing-Stock-Register-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    return downloadLink;
  } catch (error) {
    console.error(
      'Error creating grouping/splicing stock register Excel:',
      error
    );
    throw new ApiError(500, error.message, error);
  }
};
