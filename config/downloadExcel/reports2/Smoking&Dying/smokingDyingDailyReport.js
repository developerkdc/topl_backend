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
 * Compute item summary: group by item_name, sum no_of_leaves and sqm; include process_name (first).
 */
const computeItemSummary = (rows) => {
  const byItem = {};
  rows.forEach((r) => {
    const key = r.item_name ?? 'UNKNOWN';
    if (!byItem[key]) {
      byItem[key] = { item_name: key, process_name: r.process_name ?? '', leaves: 0, sqm: 0 };
    }
    byItem[key].leaves += Number(r.no_of_leaves) || 0;
    byItem[key].sqm += Number(r.sqm) || 0;
  });
  return Object.values(byItem).sort((a, b) =>
    (a.item_name || '').localeCompare(b.item_name || '')
  );
};

/**
 * Generate Smoking Daily Report:
 * - Title: Smoking Details Report Date: DD/MM/YYYY
 * - Main table: Item Name | LogX | Bundle No | ThickneSS | Length | Width | Leaves | Sq Mtr | PROCESS | Process color | Character | Pattern | Series | Remarks
 * - Item Name and LogX merge vertically per log group
 * - Subtotal row per item (label "TOTAL" only)
 * - Grand Total row
 * - Summary section: ITEM NAME | RECEIVED MTR. | PROCESS NAME | LEAVE | PRODUCTION SQ. MTR
 */
const GenerateSmokingDyingDailyReport = async (rows, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Smoking Details Report');

  const formattedDate = formatDate(reportDate);
  const itemSummary = computeItemSummary(rows);

  const detailsHeaders = [
    'Item Name',
    'LogX',
    'Bundle No',
    'ThickneSS',
    'Length',
    'Width',
    'Leaves',
    'Sq Mtr',
    'PROCESS',
    'Process color',
    'Character',
    'Pattern',
    'Series',
    'Remarks',
  ];
  const numDetailCols = detailsHeaders.length;

  // Column indices: Leaves=7, Sq Mtr=8
  const LEAVES_COL = 7;
  const SQM_COL = 8;

  let currentRow = 1;

  // Title
  worksheet.mergeCells(currentRow, 1, currentRow, numDetailCols);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Smoking Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow += 2;

  // Header row
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

  const mergeRanges = []; // { col, firstRow, lastRow } for columns 1 (Item Name), 2 (LogX)
  let blockStartRow = currentRow;
  let prevLogKey = null;
  let prevItemName = null;
  let itemLeaves = 0;
  let itemSqm = 0;
  let totalLeaves = 0;
  let totalSqm = 0;

  rows.forEach((r) => {
    const logKey = `${r.process_done_id?.toString?.() ?? ''}_${r.log_no_code ?? ''}`;
    const itemName = r.item_name ?? '';

    // Subtotal row when item group changes (and we had previous rows)
    if (prevItemName !== null && prevItemName !== itemName) {
      // Push merge for last log group before writing subtotal (so subtotal is not merged)
      mergeRanges.push(
        { col: 1, firstRow: blockStartRow, lastRow: currentRow - 1 },
        { col: 2, firstRow: blockStartRow, lastRow: currentRow - 1 }
      );
      const subtotalRow = worksheet.getRow(currentRow);
      subtotalRow.getCell(1).value = 'TOTAL';
      subtotalRow.getCell(1).font = { bold: true };
      subtotalRow.getCell(LEAVES_COL).value = itemLeaves;
      subtotalRow.getCell(LEAVES_COL).font = { bold: true };
      subtotalRow.getCell(SQM_COL).value = itemSqm;
      subtotalRow.getCell(SQM_COL).font = { bold: true };
      subtotalRow.getCell(SQM_COL).numFmt = '0.00';
      for (let col = 1; col <= numDetailCols; col++) {
        setCellStyle(subtotalRow.getCell(col), col === 1 || col === LEAVES_COL || col === SQM_COL);
      }
      currentRow++;
      blockStartRow = currentRow;
      itemLeaves = 0;
      itemSqm = 0;
    }

    // Merge ranges when log group changes (within same item)
    if (prevLogKey !== null && prevLogKey !== logKey) {
      mergeRanges.push(
        { col: 1, firstRow: blockStartRow, lastRow: currentRow - 1 },
        { col: 2, firstRow: blockStartRow, lastRow: currentRow - 1 }
      );
      blockStartRow = currentRow;
    }
    prevLogKey = logKey;
    prevItemName = itemName;

    const dataRow = worksheet.getRow(currentRow);
    dataRow.getCell(1).value = r.item_name ?? '';
    dataRow.getCell(2).value = r.log_no_code ?? '';
    dataRow.getCell(3).value = r.bundle_number ?? '';
    dataRow.getCell(4).value = r.thickness ?? '';
    dataRow.getCell(5).value = r.length ?? '';
    dataRow.getCell(6).value = r.width ?? '';
    dataRow.getCell(7).value = r.no_of_leaves ?? '';
    dataRow.getCell(8).value = r.sqm ?? '';
    dataRow.getCell(9).value = r.process_name ?? '';
    dataRow.getCell(10).value = r.color_name ?? '';
    dataRow.getCell(11).value = r.character_name ?? '';
    dataRow.getCell(12).value = r.pattern_name ?? '';
    dataRow.getCell(13).value = r.series_name ?? '';
    dataRow.getCell(14).value = r.remark ?? '';

    if (typeof dataRow.getCell(4).value === 'number') dataRow.getCell(4).numFmt = '0.00';
    if (typeof dataRow.getCell(5).value === 'number') dataRow.getCell(5).numFmt = '0.00';
    if (typeof dataRow.getCell(6).value === 'number') dataRow.getCell(6).numFmt = '0.00';
    if (typeof dataRow.getCell(8).value === 'number') dataRow.getCell(8).numFmt = '0.00';

    itemLeaves += Number(r.no_of_leaves) || 0;
    itemSqm += Number(r.sqm) || 0;
    totalLeaves += Number(r.no_of_leaves) || 0;
    totalSqm += Number(r.sqm) || 0;
    currentRow++;
  });

  // Final subtotal for last item group
  if (rows.length > 0) {
    // Push merge for last log group before writing final subtotal
    mergeRanges.push(
      { col: 1, firstRow: blockStartRow, lastRow: currentRow - 1 },
      { col: 2, firstRow: blockStartRow, lastRow: currentRow - 1 }
    );
    const subtotalRow = worksheet.getRow(currentRow);
    subtotalRow.getCell(1).value = 'TOTAL';
    subtotalRow.getCell(1).font = { bold: true };
    subtotalRow.getCell(LEAVES_COL).value = itemLeaves;
    subtotalRow.getCell(LEAVES_COL).font = { bold: true };
    subtotalRow.getCell(SQM_COL).value = itemSqm;
    subtotalRow.getCell(SQM_COL).font = { bold: true };
    subtotalRow.getCell(SQM_COL).numFmt = '0.00';
    for (let col = 1; col <= numDetailCols; col++) {
      setCellStyle(subtotalRow.getCell(col), col === 1 || col === LEAVES_COL || col === SQM_COL);
    }
    currentRow++;
  }

  mergeRanges.forEach(({ col, firstRow, lastRow }) => {
    if (lastRow > firstRow) {
      worksheet.mergeCells(firstRow, col, lastRow, col);
    }
  });

  // Grand Total row
  const grandTotalRow = worksheet.getRow(currentRow);
  grandTotalRow.getCell(1).value = 'TOTAL';
  grandTotalRow.getCell(1).font = { bold: true };
  grandTotalRow.getCell(LEAVES_COL).value = totalLeaves;
  grandTotalRow.getCell(LEAVES_COL).font = { bold: true };
  grandTotalRow.getCell(SQM_COL).value = totalSqm;
  grandTotalRow.getCell(SQM_COL).font = { bold: true };
  grandTotalRow.getCell(SQM_COL).numFmt = '0.00';
  for (let col = 1; col <= numDetailCols; col++) {
    setCellStyle(grandTotalRow.getCell(col), col === 1 || col === LEAVES_COL || col === SQM_COL);
  }
  currentRow += 2;

  // Summary section: SUMMERY
  const summaryHeaders = ['ITEM NAME', 'RECEIVED MTR.', 'PROCESS NAME', 'LEAVE', 'PRODUCTION SQ. MTR'];
  const summaryHeaderRow = worksheet.getRow(currentRow);
  summaryHeaders.forEach((h, i) => {
    const cell = summaryHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = grayFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setCellStyle(cell);
  });
  currentRow++;

  let summaryTotalLeaves = 0;
  let summaryTotalSqm = 0;
  itemSummary.forEach((item) => {
    const summaryRow = worksheet.getRow(currentRow);
    summaryRow.getCell(1).value = item.item_name ?? '';
    summaryRow.getCell(2).value = ''; // RECEIVED MTR. - blank
    summaryRow.getCell(3).value = item.process_name ?? '';
    summaryRow.getCell(4).value = item.leaves ?? 0;
    summaryRow.getCell(5).value = item.sqm ?? 0;
    summaryRow.getCell(5).numFmt = '0.00';
    for (let col = 1; col <= 5; col++) {
      setCellStyle(summaryRow.getCell(col));
    }
    summaryTotalLeaves += item.leaves ?? 0;
    summaryTotalSqm += item.sqm ?? 0;
    currentRow++;
  });

  // Summary TOTAL row
  const summaryTotalRow = worksheet.getRow(currentRow);
  summaryTotalRow.getCell(1).value = 'TOTAL';
  summaryTotalRow.getCell(1).font = { bold: true };
  summaryTotalRow.getCell(2).value = '';
  summaryTotalRow.getCell(3).value = '';
  summaryTotalRow.getCell(4).value = summaryTotalLeaves;
  summaryTotalRow.getCell(4).font = { bold: true };
  summaryTotalRow.getCell(5).value = summaryTotalSqm;
  summaryTotalRow.getCell(5).font = { bold: true };
  summaryTotalRow.getCell(5).numFmt = '0.00';
  for (let col = 1; col <= 5; col++) {
    setCellStyle(summaryTotalRow.getCell(col), col === 1 || col === 4 || col === 5);
  }

  worksheet.columns = [
    { width: 14 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 8 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 16 },
  ];

  const timestamp = new Date().getTime();
  const fileName = `smoking_dying_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/SmokingDying';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;
  return downloadLink;
};

export { GenerateSmokingDyingDailyReport };
