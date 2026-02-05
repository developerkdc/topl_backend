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
 * Collect unique session metadata (for worker details at end). One entry per dressing_id.
 */
const collectSessionsMeta = (rows) => {
  const seen = new Set();
  const sessions = [];
  rows.forEach((r) => {
    const id = r.dressing_id?.toString?.() ?? r.dressing_id;
    if (id && !seen.has(id)) {
      seen.add(id);
      sessions.push({
        dressing_id: r.dressing_id,
        shift: r.shift,
        no_of_working_hours: r.no_of_working_hours,
        worker: (r.worker || '').trim(),
      });
    }
  });
  return sessions;
};

/**
 * Generate Dressing Daily Report:
 * - Title: Dressing Details Report Date: DD/MM/YYYY
 * - Single table: one header row, all columns in one line (Item Name, LogX, Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, Character, Pattern, Series, Remarks)
 * - All data rows in one continuous table, then one Total row (Leaves, Sq Mtr)
 * - Worker details at the very end: Dressing Id, Shift, Work Hours, Worker, Machine Id (one row per session)
 */
const GenerateDressingDailyReport = async (rows, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dressing Details Report');

  const formattedDate = formatDate(reportDate);
  const sessionsMeta = collectSessionsMeta(rows);

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

  // Worker details at the end of the report (once)
  const metaLabels = ['Dressing Id', 'Shift', 'Work Hours', 'Worker', 'Machine Id'];
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
      session.dressing_id?.toString?.() ?? session.dressing_id ?? '',
      session.shift ?? '',
      session.no_of_working_hours ?? '',
      session.worker ?? '',
      '', // Machine Id not in schema
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
