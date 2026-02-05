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
 * Generate Tapping OR Clipping Stock Register Excel
 * Title: Clipping Item Stock Register between DD/MM/YYYY and DD/MM/YYYY
 * Columns: Item Group Name, Item Name, Opening Balance, Received Sq. Mtr., Issue Sq. Mtr.,
 * Issue For (Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production), Closing Balance.
 * Total row at bottom. Negative values shown in parentheses.
 *
 * @param {Array} aggregatedData - Aggregated stock data per (item_group_name, item_name)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const GenerateTappingORClippingStockRegisterExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/TappingORClipping';
    await fs.mkdir(folderPath, { recursive: true });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Clipping Item Stock Register');

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    const title = `Clipping Item Stock Register between ${formattedStart} and ${formattedEnd}`;

    const numCols = 11;

    let currentRow = 1;

    worksheet.mergeCells(currentRow, 1, currentRow, numCols);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 20;
    currentRow += 2;

    // Header row 1: main headers; cols 6-10 merged as "Issue For (in Sq. Mtr.)"
    const headerRow1 = worksheet.getRow(currentRow);
    const mainHeaders = [
      'Item Group Name',
      'Item Name',
      'Opening',
      'Received',
      'Issue',
      'Issue For (in Sq. Mtr.)',
      '',
      '',
      '',
      '',
      'Closing',
    ];
    mainHeaders.forEach((h, i) => {
      const cell = headerRow1.getCell(i + 1);
      cell.value = h;
      Object.assign(cell, headerStyle);
    });
    worksheet.mergeCells(currentRow, 6, currentRow, 10);
    currentRow++;

    // Header row 2: sub-headers for Opening (Balance), Received (Sq. Mtr.), Issue (Sq. Mtr.), then Issue For sub-cols, Closing (Balance)
    const headerRow2 = worksheet.getRow(currentRow);
    const subHeaders = [
      '',
      '',
      'Balance',
      'Sq. Mtr.',
      'Sq. Mtr.',
      'Hand Splicing',
      'Splicing',
      'Clipped Packing',
      'Damaged',
      'Cal Ply Production',
      'Balance',
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
      issue_total: 0,
      hand_splicing: 0,
      splicing: 0,
      clipped_packing: 0,
      damaged: 0,
      cal_ply_production: 0,
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
      const re = Number(row.received) ?? 0;
      const issue = Number(row.issue_total) ?? 0;
      const hs = Number(row.hand_splicing) ?? 0;
      const sp = Number(row.splicing) ?? 0;
      const cp = Number(row.clipped_packing) ?? 0;
      const dm = Number(row.damaged) ?? 0;
      const cal = Number(row.cal_ply_production) ?? 0;
      const cb = Number(row.closing_balance) ?? 0;

      r.getCell(1).value = row.item_group_name ?? '';
      r.getCell(2).value = row.item_name ?? '';
      r.getCell(3).value = ob;
      r.getCell(4).value = re;
      r.getCell(5).value = issue;
      r.getCell(6).value = hs;
      r.getCell(7).value = sp;
      r.getCell(8).value = cp;
      r.getCell(9).value = dm;
      r.getCell(10).value = cal;
      r.getCell(11).value = cb;

      for (let col = 3; col <= 11; col++) {
        r.getCell(col).numFmt = '0.00;(0.00)';
      }

      grandTotals.opening_balance += ob;
      grandTotals.received += re;
      grandTotals.issue_total += issue;
      grandTotals.hand_splicing += hs;
      grandTotals.splicing += sp;
      grandTotals.clipped_packing += cp;
      grandTotals.damaged += dm;
      grandTotals.cal_ply_production += cal;
      grandTotals.closing_balance += cb;
      currentRow++;
    });

    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = grandTotals.opening_balance;
    totalRow.getCell(4).value = grandTotals.received;
    totalRow.getCell(5).value = grandTotals.issue_total;
    totalRow.getCell(6).value = grandTotals.hand_splicing;
    totalRow.getCell(7).value = grandTotals.splicing;
    totalRow.getCell(8).value = grandTotals.clipped_packing;
    totalRow.getCell(9).value = grandTotals.damaged;
    totalRow.getCell(10).value = grandTotals.cal_ply_production;
    totalRow.getCell(11).value = grandTotals.closing_balance;
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      if (cell.column >= 3) cell.numFmt = '0.00;(0.00)';
    });

    worksheet.columns = [
      { width: 22 },
      { width: 28 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 18 },
      { width: 14 },
    ];

    const timeStamp = new Date().getTime();
    const fileName = `Clipping-Stock-Register-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    return downloadLink;
  } catch (error) {
    console.error(
      'Error creating tapping/clipping stock register Excel:',
      error
    );
    throw new ApiError(500, error.message, error);
  }
};
