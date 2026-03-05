import ExcelJS from 'exceljs';
import fs from 'fs/promises';

/**
 * Format date to DD/MM/YYYY
 */
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'N/A';
  }
};

const setCellStyle = (cell, bold = false) => {
  if (bold) cell.font = { bold: true };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
};

const grayFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD3D3D3' },
};

/**
 * Compute Veneer Summary: group by item_name, sum leaves and sqm.
 */
const computeVeneerSummary = (rows) => {
  const byItem = {};
  rows.forEach((r) => {
    const key = r.item_name ?? 'UNKNOWN';
    if (!byItem[key]) {
      byItem[key] = { item_name: key, leaves: 0, sqm: 0 };
    }
    byItem[key].leaves += Number(r.no_of_leaves) || 0;
    byItem[key].sqm += Number(r.sqm) || 0;
  });
  return Object.values(byItem).sort((a, b) =>
    (a.item_name || '').localeCompare(b.item_name || '')
  );
};

/**
 * Compute Log Summary: group by (log_no_code, item_name), sum volume (CMT), leaves, sqm.
 */
const computeLogSummary = (rows) => {
  const byLog = {};
  rows.forEach((r) => {
    const logKey = r.log_no_code ?? '';
    const itemKey = r.item_name ?? 'UNKNOWN';
    const key = `${logKey}|${itemKey}`;
    if (!byLog[key]) {
      byLog[key] = {
        log_no_code: logKey,
        item_name: itemKey,
        cmt: 0,
        leaves: 0,
        sqm: 0,
      };
    }
    byLog[key].cmt += Number(r.volume) || 0;
    byLog[key].leaves += Number(r.no_of_leaves) || 0;
    byLog[key].sqm += Number(r.sqm) || 0;
  });
  return Object.values(byLog).sort((a, b) => {
    const c = (a.log_no_code || '').localeCompare(b.log_no_code || '');
    return c !== 0 ? c : (a.item_name || '').localeCompare(b.item_name || '');
  });
};

/**
 * Generate Dressing Daily Report:
 * - Title: Dressing Details Report Date: DD/MM/YYYY
 * - Single table: one header row, all columns in one line (Item Name, LogX, Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, Character, Pattern, Series, Remarks)
 * - All data rows in one continuous table, then one Total row (Leaves, Sq Mtr)
 * - Veneer Summary: ITEM NAME, LEAVE, SQ. MTR (grouped by item) + Total
 * - Log Summary: LOG NO, ITEM NAME, CMT, LEAVES, SQ. MTR (grouped by log+item) + Total
 */
const GenerateDressingDailyReport = async (rows, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dressing Details Report');

  const formattedDate = formatDate(reportDate);
  const veneerSummary = computeVeneerSummary(rows);
  const logSummary = computeLogSummary(rows);

  const detailsHeaders = [
    'Item Name',
    'LogX',
    'Bundle No',
    'ThickneSS',
    'Length',
    'Width',
    'Leaves',
    'Sq Mtr',
    'Character',
    'Pattern',
    'Series',
    'Remarks',
  ];
  const numDetailCols = detailsHeaders.length;

  let currentRow = 1;

  // Title
  worksheet.mergeCells(currentRow, 1, currentRow, numDetailCols);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Dressing Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow += 2;

  // Single header row – all columns in one line
  const headerRow = worksheet.getRow(currentRow);
  detailsHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = grayFill;
    setCellStyle(cell);
  });
  currentRow++;

  let totalLeaves = 0;
  let totalSqm = 0;

  // All data rows (no per-session blocks, no duplicate columns)
  rows.forEach((r) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = r.item_name ?? '';
    row.getCell(2).value = r.log_no_code ?? '';
    row.getCell(3).value = r.bundle_number ?? '';
    row.getCell(4).value = r.thickness ?? '';
    row.getCell(5).value = r.length ?? '';
    row.getCell(6).value = r.width ?? '';
    row.getCell(7).value = r.no_of_leaves ?? '';
    row.getCell(8).value = r.sqm ?? '';
    row.getCell(9).value = r.character_name ?? '';
    row.getCell(10).value = r.pattern_name ?? '';
    row.getCell(11).value = r.series_name ?? '';
    row.getCell(12).value = r.remark ?? '';

    [4, 5, 6, 8].forEach((col) => {
      const c = row.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.00';
    });

    totalLeaves += Number(r.no_of_leaves) || 0;
    totalSqm += Number(r.sqm) || 0;
    currentRow++;
  });

  // One Total row at bottom of data
  const totalRow = worksheet.getRow(currentRow);
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(7).value = totalLeaves;
  totalRow.getCell(7).font = { bold: true };
  totalRow.getCell(8).value = totalSqm;
  totalRow.getCell(8).font = { bold: true };
  totalRow.getCell(8).numFmt = '0.00';
  setCellStyle(totalRow.getCell(1), true);
  for (let col = 2; col <= numDetailCols; col++) {
    setCellStyle(totalRow.getCell(col), col === 7 || col === 8);
  }
  currentRow += 2;

  // Veneer Summary section
  const veneerHeaders = ['ITEM NAME', 'LEAVE', 'SQ. MTR'];
  const veneerTitleCell = worksheet.getCell(currentRow, 1);
  veneerTitleCell.value = 'VENEER SUMMARY';
  veneerTitleCell.font = { bold: true, size: 11 };
  currentRow++;

  const veneerHeaderRow = worksheet.getRow(currentRow);
  veneerHeaders.forEach((h, i) => {
    const cell = veneerHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = grayFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setCellStyle(cell);
  });
  currentRow++;

  let veneerTotalLeaves = 0;
  let veneerTotalSqm = 0;
  veneerSummary.forEach((v) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = v.item_name ?? '';
    row.getCell(2).value = v.leaves;
    row.getCell(3).value = v.sqm;
    row.getCell(3).numFmt = '0.00';
    [1, 2, 3].forEach((col) => setCellStyle(row.getCell(col)));
    veneerTotalLeaves += v.leaves;
    veneerTotalSqm += v.sqm;
    currentRow++;
  });

  const veneerTotalRow = worksheet.getRow(currentRow);
  veneerTotalRow.getCell(1).value = 'TOTAL';
  veneerTotalRow.getCell(1).font = { bold: true };
  veneerTotalRow.getCell(2).value = veneerTotalLeaves;
  veneerTotalRow.getCell(2).font = { bold: true };
  veneerTotalRow.getCell(3).value = veneerTotalSqm;
  veneerTotalRow.getCell(3).font = { bold: true };
  veneerTotalRow.getCell(3).numFmt = '0.00';
  [1, 2, 3].forEach((col) => setCellStyle(veneerTotalRow.getCell(col), col > 1));
  currentRow += 2;

  // Log Summary section
  const logHeaders = ['LOG NO', 'ITEM NAME', 'CMT', 'LEAVES', 'SQ. MTR'];
  const logTitleCell = worksheet.getCell(currentRow, 1);
  logTitleCell.value = 'LOG SUMMARY';
  logTitleCell.font = { bold: true, size: 11 };
  currentRow++;

  const logHeaderRow = worksheet.getRow(currentRow);
  logHeaders.forEach((h, i) => {
    const cell = logHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = grayFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setCellStyle(cell);
  });
  currentRow++;

  let logTotalCmt = 0;
  let logTotalLeaves = 0;
  let logTotalSqm = 0;
  logSummary.forEach((l) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = l.log_no_code ?? '';
    row.getCell(2).value = l.item_name ?? '';
    row.getCell(3).value = l.cmt;
    row.getCell(3).numFmt = '0.00';
    row.getCell(4).value = l.leaves;
    row.getCell(5).value = l.sqm;
    row.getCell(5).numFmt = '0.00';
    [1, 2, 3, 4, 5].forEach((col) => setCellStyle(row.getCell(col)));
    logTotalCmt += l.cmt;
    logTotalLeaves += l.leaves;
    logTotalSqm += l.sqm;
    currentRow++;
  });

  const logTotalRow = worksheet.getRow(currentRow);
  logTotalRow.getCell(1).value = 'TOTAL';
  logTotalRow.getCell(1).font = { bold: true };
  logTotalRow.getCell(2).value = '';
  logTotalRow.getCell(3).value = logTotalCmt;
  logTotalRow.getCell(3).font = { bold: true };
  logTotalRow.getCell(3).numFmt = '0.00';
  logTotalRow.getCell(4).value = logTotalLeaves;
  logTotalRow.getCell(4).font = { bold: true };
  logTotalRow.getCell(5).value = logTotalSqm;
  logTotalRow.getCell(5).font = { bold: true };
  logTotalRow.getCell(5).numFmt = '0.00';
  [1, 2, 3, 4, 5].forEach((col) => setCellStyle(logTotalRow.getCell(col), col > 2));
  currentRow++;

  worksheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
  ];

  const timestamp = new Date().getTime();
  const fileName = `dressing_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Dressing';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;
  return downloadLink;
};

export { GenerateDressingDailyReport };
