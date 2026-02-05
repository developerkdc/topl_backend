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
 * Collect unique session metadata (for Dyeing Id table at end). One entry per process_done_id.
 */
const collectSessionsMeta = (rows) => {
  const seen = new Set();
  const sessions = [];
  rows.forEach((r) => {
    const id = r.process_done_id?.toString?.() ?? r.process_done_id;
    if (id && !seen.has(id)) {
      seen.add(id);
      sessions.push({
        process_done_id: r.process_done_id,
        shift: r.shift,
        no_of_working_hours: r.no_of_working_hours,
        worker: (r.worker || '').trim(),
      });
    }
  });
  return sessions;
};

/**
 * Generate Smoking&Dying (Dyeing) Daily Report:
 * - Title: Dyeing Details Report Date: DD/MM/YYYY
 * - Left block (merged per LogX): Item Name | New Item Name | LogX
 * - Right block (per bundle): Bundle No | Sq Mtr | Colour Code | Remarks
 * - Total row: total bundle count and total Sq Mtr
 * - Session table at end: Dyeing Id | Shift | Work Hours | Worker | Machine Id
 */
const GenerateSmokingDyingDailyReport = async (rows, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dyeing Details Report');

  const formattedDate = formatDate(reportDate);
  const sessionsMeta = collectSessionsMeta(rows);

  const leftHeaders = ['Item Name', 'New Item Name', 'LogX'];
  const rightHeaders = ['Bundle No', 'Sq Mtr', 'Colour Code', 'Remarks'];
  const detailsHeaders = [...leftHeaders, ...rightHeaders];
  const numDetailCols = detailsHeaders.length;

  let currentRow = 1;

  // Title
  worksheet.mergeCells(currentRow, 1, currentRow, numDetailCols);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Dyeing Details Report Date: ${formattedDate}`;
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

  let totalSqm = 0;
  const mergeRanges = []; // { col, firstRow, lastRow } for columns 1, 2, 3

  let blockStartRow = currentRow;
  let prevLogKey = null;

  rows.forEach((r) => {
    const logKey = `${r.process_done_id?.toString?.() ?? ''}_${r.log_no_code ?? ''}`;
    if (prevLogKey !== null && prevLogKey !== logKey) {
      mergeRanges.push(
        { col: 1, firstRow: blockStartRow, lastRow: currentRow - 1 },
        { col: 2, firstRow: blockStartRow, lastRow: currentRow - 1 },
        { col: 3, firstRow: blockStartRow, lastRow: currentRow - 1 }
      );
      blockStartRow = currentRow;
    }
    prevLogKey = logKey;

    const dataRow = worksheet.getRow(currentRow);
    dataRow.getCell(1).value = r.item_name ?? '';
    dataRow.getCell(2).value = r.item_sub_category_name ?? '';
    dataRow.getCell(3).value = r.log_no_code ?? '';
    dataRow.getCell(4).value = r.bundle_number ?? '';
    dataRow.getCell(5).value = r.sqm ?? '';
    dataRow.getCell(6).value = r.color_name ?? '';
    dataRow.getCell(7).value = r.remark ?? '';

    if (typeof dataRow.getCell(5).value === 'number') {
      dataRow.getCell(5).numFmt = '0.00';
    }
    totalSqm += Number(r.sqm) || 0;
    currentRow++;
  });

  if (rows.length > 0) {
    mergeRanges.push(
      { col: 1, firstRow: blockStartRow, lastRow: currentRow - 1 },
      { col: 2, firstRow: blockStartRow, lastRow: currentRow - 1 },
      { col: 3, firstRow: blockStartRow, lastRow: currentRow - 1 }
    );
  }

  mergeRanges.forEach(({ col, firstRow, lastRow }) => {
    if (lastRow > firstRow) {
      worksheet.mergeCells(firstRow, col, lastRow, col);
    }
  });

  // Total row
  const totalRow = worksheet.getRow(currentRow);
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(4).value = rows.length;
  totalRow.getCell(4).font = { bold: true };
  totalRow.getCell(5).value = totalSqm;
  totalRow.getCell(5).font = { bold: true };
  totalRow.getCell(5).numFmt = '0.00';
  for (let col = 1; col <= numDetailCols; col++) {
    setCellStyle(totalRow.getCell(col), col === 1 || col === 4 || col === 5);
  }
  currentRow += 2;

  // Session table: Dyeing Id | Shift | Work Hours | Worker | Machine Id
  const metaLabels = ['Dyeing Id', 'Shift', 'Work Hours', 'Worker', 'Machine Id'];
  const metaHeaderRow = worksheet.getRow(currentRow);
  metaLabels.forEach((label, i) => {
    const cell = metaHeaderRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.fill = grayFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setCellStyle(cell);
  });
  currentRow++;

  sessionsMeta.forEach((session) => {
    const metaValueRow = worksheet.getRow(currentRow);
    const metaValues = [
      session.process_done_id?.toString?.() ?? session.process_done_id ?? '',
      session.shift ?? '',
      session.no_of_working_hours ?? '',
      session.worker ?? '',
      '',
    ];
    metaValues.forEach((val, i) => {
      const cell = metaValueRow.getCell(i + 1);
      cell.value = val;
      setCellStyle(cell);
    });
    currentRow++;
  });

  worksheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
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
