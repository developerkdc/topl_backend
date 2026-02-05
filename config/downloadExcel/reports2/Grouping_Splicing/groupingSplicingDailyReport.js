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
 * Collect unique session metadata (Grouping Id, Shift, Work Hours, Worker, Machine Id). One entry per grouping_id.
 */
const collectSessionsMeta = (rows) => {
  const seen = new Set();
  const sessions = [];
  rows.forEach((r) => {
    const id = r.grouping_id?.toString?.() ?? r.grouping_id;
    if (id && !seen.has(id)) {
      seen.add(id);
      sessions.push({
        grouping_id: r.grouping_id,
        shift: r.shift,
        no_of_working_hours: r.no_of_working_hours,
        worker: (r.worker || '').trim(),
        machine_id: '', // not in grouping_done_details schema
      });
    }
  });
  return sessions;
};

/**
 * Build dimension summary: group by (length, width), sum sheets, damaged_sheets and sqm. Returns array of { length, width, sheets, damaged_sheets, sqm } plus totals.
 */
const buildDimensionSummary = (rows) => {
  const map = new Map();
  let totalSheets = 0;
  let totalSqm = 0;
  let totalDamagedSheets = 0;
  rows.forEach((r) => {
    const key = `${r.length ?? 0}_${r.width ?? 0}`;
    const sheets = Number(r.no_of_sheets) || 0;
    const sqm = Number(r.sqm) || 0;
    const damaged = Number(r.damaged_sheets) || 0;
    if (!map.has(key)) {
      map.set(key, { length: r.length, width: r.width, sheets: 0, damaged_sheets: 0, sqm: 0 });
    }
    const entry = map.get(key);
    entry.sheets += sheets;
    entry.sqm += sqm;
    entry.damaged_sheets += damaged;
    totalSheets += sheets;
    totalSqm += sqm;
    totalDamagedSheets += damaged;
  });
  const summary = Array.from(map.values()).sort(
    (a, b) => (a.length || 0) - (b.length || 0) || (a.width || 0) - (b.width || 0)
  );
  return { rows: summary, totalSheets, totalSqm, totalDamagedSheets };
};

/**
 * Generate Grouping/Splicing Daily Report (grouping data):
 * - Title: Grouping Details Report Date: DD/MM/YYYY
 * - Section 1: Main table (Item Name, LogX, Length, Width, Sheets, Damaged Sheets, Sq Mtr, Customer Name, Character, Pattern, Series, Remarks)
 *   with Total row after each Item Name group and Grand Total at end.
 * - Section 2: Dimension summary (Length, Width, Sheets, Damaged Sheets, SQ Mtr) with Total row.
 * - Section 3: Grouping operations (Grouping Id, Shift, Work Hours, Worker, Machine Id) one row per session.
 */
const GenerateGroupingSplicingDailyReport = async (rows, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Grouping Details Report');

  const formattedDate = formatDate(reportDate);
  const sessionsMeta = collectSessionsMeta(rows);
  const { rows: dimensionRows, totalSheets, totalSqm, totalDamagedSheets } = buildDimensionSummary(rows);

  const mainHeaders = [
    'Item Name',
    'LogX',
    'Length',
    'Width',
    'Sheets',
    'Damaged Sheets',
    'Sq Mtr',
    'Customer Name',
    'Character',
    'Pattern',
    'Series',
    'Remarks',
  ];
  const numMainCols = mainHeaders.length;

  let currentRow = 1;

  // Title
  worksheet.mergeCells(currentRow, 1, currentRow, numMainCols);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Grouping Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow += 2;

  // Section 1 — Main table header
  const mainHeaderRow = worksheet.getRow(currentRow);
  mainHeaders.forEach((h, i) => {
    const cell = mainHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = grayFill;
    setCellStyle(cell);
  });
  currentRow++;

  let grandTotalSheets = 0;
  let grandTotalSqm = 0;
  let lastItemName = null;
  let groupSheets = 0;
  let groupSqm = 0;

  rows.forEach((r) => {
    const itemName = r.item_name ?? '';
    if (lastItemName !== null && lastItemName !== itemName) {
      // Insert Total row for previous Item Name group
      const totalRow = worksheet.getRow(currentRow);
      totalRow.getCell(1).value = 'Total';
      totalRow.getCell(1).font = { bold: true };
      totalRow.getCell(5).value = groupSheets;
      totalRow.getCell(5).font = { bold: true };
      totalRow.getCell(7).value = groupSqm;
      totalRow.getCell(7).font = { bold: true };
      totalRow.getCell(7).numFmt = '0.00';
      for (let col = 1; col <= numMainCols; col++) {
        setCellStyle(totalRow.getCell(col), col === 1 || col === 5 || col === 7);
      }
      currentRow++;
      groupSheets = 0;
      groupSqm = 0;
    }
    lastItemName = itemName;

    const dataRow = worksheet.getRow(currentRow);
    dataRow.getCell(1).value = r.item_name ?? '';
    dataRow.getCell(2).value = r.log_no_code ?? '';
    dataRow.getCell(3).value = r.length ?? '';
    dataRow.getCell(4).value = r.width ?? '';
    dataRow.getCell(5).value = r.no_of_sheets ?? '';
    dataRow.getCell(6).value = r.damaged_sheets ?? 0;
    dataRow.getCell(7).value = r.sqm ?? '';
    dataRow.getCell(8).value = r.customer_name ?? '';
    dataRow.getCell(9).value = r.character_name ?? '';
    dataRow.getCell(10).value = r.pattern_name ?? '';
    dataRow.getCell(11).value = r.series_name ?? '';
    dataRow.getCell(12).value = r.remark ?? '';

    [3, 4, 7].forEach((col) => {
      const c = dataRow.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.00';
    });

    const sheets = Number(r.no_of_sheets) || 0;
    const sqm = Number(r.sqm) || 0;
    groupSheets += sheets;
    groupSqm += sqm;
    grandTotalSheets += sheets;
    grandTotalSqm += sqm;
    currentRow++;
  });

  // Total row for last Item Name group
  if (lastItemName !== null) {
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(5).value = groupSheets;
    totalRow.getCell(5).font = { bold: true };
    totalRow.getCell(7).value = groupSqm;
    totalRow.getCell(7).font = { bold: true };
    totalRow.getCell(7).numFmt = '0.00';
    for (let col = 1; col <= numMainCols; col++) {
      setCellStyle(totalRow.getCell(col), col === 1 || col === 5 || col === 7);
    }
    currentRow++;
  }

  // Grand Total row
  const grandTotalRow = worksheet.getRow(currentRow);
  grandTotalRow.getCell(1).value = 'Total';
  grandTotalRow.getCell(1).font = { bold: true };
  grandTotalRow.getCell(5).value = grandTotalSheets;
  grandTotalRow.getCell(5).font = { bold: true };
  grandTotalRow.getCell(7).value = grandTotalSqm;
  grandTotalRow.getCell(7).font = { bold: true };
  grandTotalRow.getCell(7).numFmt = '0.00';
  for (let col = 1; col <= numMainCols; col++) {
    setCellStyle(grandTotalRow.getCell(col), col === 1 || col === 5 || col === 7);
  }
  currentRow += 2;

  // Section 2 — Dimension summary header
  const dimHeaders = ['Length', 'Width', 'Sheets', 'Damaged Sheets', 'SQ Mtr'];
  const dimHeaderRow = worksheet.getRow(currentRow);
  dimHeaders.forEach((h, i) => {
    const cell = dimHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = grayFill;
    setCellStyle(cell);
  });
  currentRow++;

  dimensionRows.forEach((d) => {
    const dimRow = worksheet.getRow(currentRow);
    dimRow.getCell(1).value = d.length ?? '';
    dimRow.getCell(2).value = d.width ?? '';
    dimRow.getCell(3).value = d.sheets ?? 0;
    dimRow.getCell(4).value = d.damaged_sheets ?? 0;
    dimRow.getCell(5).value = d.sqm ?? 0;
    [1, 2, 5].forEach((col) => {
      const c = dimRow.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.00';
    });
    for (let col = 1; col <= 5; col++) setCellStyle(dimRow.getCell(col));
    currentRow++;
  });

  const dimTotalRow = worksheet.getRow(currentRow);
  dimTotalRow.getCell(1).value = 'Total';
  dimTotalRow.getCell(1).font = { bold: true };
  dimTotalRow.getCell(3).value = totalSheets;
  dimTotalRow.getCell(3).font = { bold: true };
  dimTotalRow.getCell(4).value = totalDamagedSheets;
  dimTotalRow.getCell(4).font = { bold: true };
  dimTotalRow.getCell(5).value = totalSqm;
  dimTotalRow.getCell(5).font = { bold: true };
  dimTotalRow.getCell(5).numFmt = '0.00';
  for (let col = 1; col <= 5; col++) {
    setCellStyle(dimTotalRow.getCell(col), col === 1 || col === 3 || col === 4 || col === 5);
  }
  currentRow += 2;

  // Section 3 — Grouping operations header
  const metaLabels = ['Grouping Id', 'Shift', 'Work Hours', 'Worker', 'Machine Id'];
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
      session.grouping_id?.toString?.() ?? session.grouping_id ?? '',
      session.shift ?? '',
      session.no_of_working_hours ?? '',
      session.worker ?? '',
      session.machine_id ?? '',
    ];
    metaValues.forEach((val, i) => {
      const cell = metaValueRow.getCell(i + 1);
      cell.value = val;
      setCellStyle(cell);
    });
    currentRow++;
  });

  worksheet.columns = [
    { width: 18 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 12 },
    { width: 16 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
  ];

  const timestamp = new Date().getTime();
  const fileName = `grouping_splicing_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Grouping_Splicing';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;
  return downloadLink;
};

export { GenerateGroupingSplicingDailyReport };
