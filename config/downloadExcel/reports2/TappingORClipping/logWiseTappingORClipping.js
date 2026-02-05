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

const cellBorder = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

/**
 * Create Log Wise TappingORClipping (Clipping Item Stock Register) Excel
 * Title: Clipping Item Stock Register between DD/MM/YYYY and DD/MM/YYYY
 * Columns: Item Group Name, Item Name, Clipping Date, Log X, Opening Balance,
 * Received (Sq. Mtr.), Issue (Sq. Mtr.), Issue For (Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production), Closing Balance.
 * Totals row at end.
 *
 * @param {Array} reportRows - Array of row data
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createLogWiseTappingORClippingReportExcel = async (
  reportRows,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/TappingORClipping';

    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Clipping Item Stock Register');

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    const title = `Clipping Item Stock Register between ${formattedStart} and ${formattedEnd}`;

    const numCols = 14; // Item Group, Item Name, Clipping Date, Log X, Opening, Received, Issue, Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply, Closing

    let currentRow = 1;

    worksheet.mergeCells(currentRow, 1, currentRow, numCols);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 20;
    currentRow += 2;

    // Header row 1: main headers; "Issue For (in Sq. Mtr.)" merged over cols 9-13
    const headerRow1 = worksheet.getRow(currentRow);
    const mainHeaders = [
      'Item Group Name',
      'Item Name',
      'Clipping Date',
      'Log X',
      'Opening Balance',
      'Received (Sq. Mtr.)',
      'Issue (Sq. Mtr.)',
      'Issue For (in Sq. Mtr.)',
      '', // 9 - Hand Splicing (sub)
      '', // 10 - Splicing
      '', // 11 - Clipped Packing
      '', // 12 - Damaged
      '', // 13 - Cal Ply Production
      'Closing Balance',
    ];
    mainHeaders.forEach((h, i) => {
      const cell = headerRow1.getCell(i + 1);
      cell.value = h;
      Object.assign(cell, headerStyle);
    });
    worksheet.mergeCells(currentRow, 9, currentRow, 13);
    currentRow++;

    // Header row 2: sub-headers for Issue For (cols 9-13)
    const headerRow2 = worksheet.getRow(currentRow);
    const subHeaders = [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Hand Splicing',
      'Splicing',
      'Clipped Packing',
      'Damaged',
      'Cal Ply Production',
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
      received: 0,
      issue: 0,
      hand_splicing: 0,
      splicing: 0,
      clipped_packing: 0,
      damaged: 0,
      cal_ply_production: 0,
      closing_balance: 0,
    };

    reportRows.forEach((row) => {
      const r = worksheet.getRow(currentRow);
      const ob = Number(row.opening_balance) ?? 0;
      const rec = Number(row.received) ?? 0;
      const iss = Number(row.issue) ?? 0;
      const hs = Number(row.hand_splicing) ?? 0;
      const sp = Number(row.splicing) ?? 0;
      const cp = Number(row.clipped_packing) ?? 0;
      const dm = Number(row.damaged) ?? 0;
      const cal = Number(row.cal_ply_production) ?? 0;
      const cb = Number(row.closing_balance) ?? 0;

      r.getCell(1).value = row.item_group_name ?? '';
      r.getCell(2).value = row.item_name ?? '';
      r.getCell(3).value = formatDate(row.clipping_date);
      r.getCell(4).value = row.log_x ?? '';
      r.getCell(5).value = ob;
      r.getCell(6).value = rec;
      r.getCell(7).value = iss;
      r.getCell(8).value = '';
      r.getCell(9).value = hs;
      r.getCell(10).value = sp;
      r.getCell(11).value = cp;
      r.getCell(12).value = dm;
      r.getCell(13).value = cal;
      r.getCell(14).value = cb;

      for (let col = 5; col <= 14; col++) r.getCell(col).numFmt = '0.00';
      r.eachCell((cell) => {
        cell.border = cellBorder;
      });

      grandTotals.opening_balance += ob;
      grandTotals.received += rec;
      grandTotals.issue += iss;
      grandTotals.hand_splicing += hs;
      grandTotals.splicing += sp;
      grandTotals.clipped_packing += cp;
      grandTotals.damaged += dm;
      grandTotals.cal_ply_production += cal;
      grandTotals.closing_balance += cb;
      currentRow++;
    });

    // Totals row
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = '';
    totalRow.getCell(4).value = '';
    totalRow.getCell(5).value = grandTotals.opening_balance;
    totalRow.getCell(6).value = grandTotals.received;
    totalRow.getCell(7).value = grandTotals.issue;
    totalRow.getCell(8).value = '';
    totalRow.getCell(9).value = grandTotals.hand_splicing;
    totalRow.getCell(10).value = grandTotals.splicing;
    totalRow.getCell(11).value = grandTotals.clipped_packing;
    totalRow.getCell(12).value = grandTotals.damaged;
    totalRow.getCell(13).value = grandTotals.cal_ply_production;
    totalRow.getCell(14).value = grandTotals.closing_balance;
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFCC00' },
      };
      cell.border = cellBorder;
      if (cell.column >= 5) cell.numFmt = '0.00';
    });

    worksheet.columns = [
      { width: 22 },
      { width: 22 },
      { width: 14 },
      { width: 18 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 18 },
      { width: 14 },
    ];

    const timeStamp = new Date().getTime();
    const fileName = `LogWiseTappingORClipping_${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}/${filePath}`;
    console.log('Log wise tapping/clipping report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error(
      'Error creating log wise tapping/clipping report Excel:',
      error
    );
    throw new ApiError(error.message || 'Failed to create report Excel', 500);
  }
};
