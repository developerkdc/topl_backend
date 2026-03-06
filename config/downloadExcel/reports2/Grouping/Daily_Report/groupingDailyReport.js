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
 * Build Issue/Production summary:
 * Group by (item_name, length, width, thickness), summing:
 *   issue_sheets, issue_sqm, no_of_sheets (group_sheets), sqm (group_sqm), damaged_sheets, damaged_sqm.
 */
const buildIssueProdSummary = (rows) => {
  const map = new Map();
  const totals = {
    issue_sheets: 0,
    issue_sqm: 0,
    group_sheets: 0,
    group_sqm: 0,
    damaged_sheets: 0,
    damaged_sqm: 0,
  };

  rows.forEach((r) => {
    const key = `${r.item_name ?? ''}__${r.length ?? 0}__${r.width ?? 0}__${r.thickness ?? 0}`;
    const issueSheets = Number(r.issue_sheets) || 0;
    const issueSqm = Number(r.issue_sqm) || 0;
    const groupSheets = Number(r.no_of_sheets) || 0;
    const groupSqm = Number(r.sqm) || 0;
    const damagedSheets = Number(r.damaged_sheets) || 0;
    const damagedSqm = Number(r.damaged_sqm) || 0;

    if (!map.has(key)) {
      map.set(key, {
        item_name: r.item_name ?? '',
        length: r.length ?? 0,
        width: r.width ?? 0,
        thickness: r.thickness ?? 0,
        issue_sheets: 0,
        issue_sqm: 0,
        group_sheets: 0,
        group_sqm: 0,
        damaged_sheets: 0,
        damaged_sqm: 0,
      });
    }

    const entry = map.get(key);
    entry.issue_sheets += issueSheets;
    entry.issue_sqm += issueSqm;
    entry.group_sheets += groupSheets;
    entry.group_sqm += groupSqm;
    entry.damaged_sheets += damagedSheets;
    entry.damaged_sqm += damagedSqm;

    totals.issue_sheets += issueSheets;
    totals.issue_sqm += issueSqm;
    totals.group_sheets += groupSheets;
    totals.group_sqm += groupSqm;
    totals.damaged_sheets += damagedSheets;
    totals.damaged_sqm += damagedSqm;
  });

  const summaryRows = Array.from(map.values()).sort((a, b) => {
    if (a.item_name < b.item_name) return -1;
    if (a.item_name > b.item_name) return 1;
    return (a.length || 0) - (b.length || 0) || (a.width || 0) - (b.width || 0) || (a.thickness || 0) - (b.thickness || 0);
  });

  return { summaryRows, totals };
};

/**
 * Generate Grouping Daily Report:
 *
 * Section 1 — Main table (13 cols):
 *   Item Name | LogX | Photo No | Length | Width | Thickness | Sheets | Damaged Sheets | Sq Mtr | Character | Pattern | Series | Remarks
 *   Total row after each Item Name group (Sheets col 7, Sq Mtr col 9). Grand Total row at end.
 *
 * Section 2 — Issue/Production summary (10 cols, two-level header):
 *   Super-headers: Issue (cols 5–6), Production (cols 7–10)
 *   Sub-headers: Item Name | Length | Width | Thickness | Sheets | SQ Mtr | Group Sheets | Group Sq. Mtr. | Damaged Sheets | Damaged Sq. Mtr.
 *   Rows grouped by (item_name, length, width, thickness). Total row at bottom.
 */
const GenerateGroupingDailyReport = async (rows, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Grouping Details Report');

  const formattedDate = formatDate(reportDate);
  const { summaryRows, totals } = buildIssueProdSummary(rows);

  // Section 1 headers — 13 columns
  const mainHeaders = [
    'Item Name',    // col 1
    'LogX',         // col 2
    'Photo No',     // col 3
    'Length',       // col 4
    'Width',        // col 5
    'Thickness',    // col 6
    'Sheets',       // col 7
    'Damaged Sheets', // col 8
    'Sq Mtr',       // col 9
    'Character',    // col 10
    'Pattern',      // col 11
    'Series',       // col 12
    'Remarks',      // col 13
  ];
  const numMainCols = mainHeaders.length; // 13

  let currentRow = 1;

  // Title row
  worksheet.mergeCells(currentRow, 1, currentRow, numMainCols);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Grouping Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow += 2;

  // Section 1 — header row
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
      // Total row for previous Item Name group
      const totalRow = worksheet.getRow(currentRow);
      totalRow.getCell(1).value = 'Total';
      totalRow.getCell(1).font = { bold: true };
      totalRow.getCell(7).value = groupSheets;
      totalRow.getCell(7).font = { bold: true };
      totalRow.getCell(9).value = groupSqm;
      totalRow.getCell(9).font = { bold: true };
      totalRow.getCell(9).numFmt = '0.00';
      for (let col = 1; col <= numMainCols; col++) {
        setCellStyle(totalRow.getCell(col), col === 1 || col === 7 || col === 9);
      }
      currentRow++;
      groupSheets = 0;
      groupSqm = 0;
    }
    lastItemName = itemName;

    // Data row
    const dataRow = worksheet.getRow(currentRow);
    dataRow.getCell(1).value = r.item_name ?? '';
    dataRow.getCell(2).value = r.log_no_code ?? '';
    dataRow.getCell(3).value = r.photo_no ?? '';
    dataRow.getCell(4).value = r.length ?? '';
    dataRow.getCell(5).value = r.width ?? '';
    dataRow.getCell(6).value = r.thickness ?? '';
    dataRow.getCell(7).value = r.no_of_sheets ?? '';
    dataRow.getCell(8).value = r.damaged_sheets ?? 0;
    dataRow.getCell(9).value = r.sqm ?? '';
    dataRow.getCell(10).value = r.character_name ?? '';
    dataRow.getCell(11).value = r.pattern_name ?? '';
    dataRow.getCell(12).value = r.series_name ?? '';
    dataRow.getCell(13).value = r.remark ?? '';

    [4, 5, 6, 9].forEach((col) => {
      const c = dataRow.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.00';
    });

    for (let col = 1; col <= numMainCols; col++) setCellStyle(dataRow.getCell(col));

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
    totalRow.getCell(7).value = groupSheets;
    totalRow.getCell(7).font = { bold: true };
    totalRow.getCell(9).value = groupSqm;
    totalRow.getCell(9).font = { bold: true };
    totalRow.getCell(9).numFmt = '0.00';
    for (let col = 1; col <= numMainCols; col++) {
      setCellStyle(totalRow.getCell(col), col === 1 || col === 7 || col === 9);
    }
    currentRow++;
  }

  // Grand Total row
  const grandTotalRow = worksheet.getRow(currentRow);
  grandTotalRow.getCell(1).value = 'Total';
  grandTotalRow.getCell(1).font = { bold: true };
  grandTotalRow.getCell(7).value = grandTotalSheets;
  grandTotalRow.getCell(7).font = { bold: true };
  grandTotalRow.getCell(9).value = grandTotalSqm;
  grandTotalRow.getCell(9).font = { bold: true };
  grandTotalRow.getCell(9).numFmt = '0.00';
  for (let col = 1; col <= numMainCols; col++) {
    setCellStyle(grandTotalRow.getCell(col), col === 1 || col === 7 || col === 9);
  }
  currentRow += 2;

  // ── Section 2 — Issue/Production summary ──────────────────────────────────
  // 10 columns: Item Name | Length | Width | Thickness | Sheets | SQ Mtr | Group Sheets | Group Sq. Mtr. | Damaged Sheets | Damaged Sq. Mtr.
  const numSummaryCols = 10;

  // Super-header row: "Issue" over cols 5–6, "Production" over cols 7–10; cols 1–4 are empty but bordered
  const superHeaderRow = worksheet.getRow(currentRow);
  for (let col = 1; col <= 4; col++) {
    const cell = superHeaderRow.getCell(col);
    cell.value = '';
    cell.fill = grayFill;
    setCellStyle(cell);
  }

  worksheet.mergeCells(currentRow, 5, currentRow, 6);
  const issueCell = superHeaderRow.getCell(5);
  issueCell.value = 'Issue';
  issueCell.font = { bold: true };
  issueCell.alignment = { horizontal: 'center', vertical: 'middle' };
  issueCell.fill = grayFill;
  setCellStyle(issueCell);
  setCellStyle(superHeaderRow.getCell(6));

  worksheet.mergeCells(currentRow, 7, currentRow, 10);
  const prodCell = superHeaderRow.getCell(7);
  prodCell.value = 'Production';
  prodCell.font = { bold: true };
  prodCell.alignment = { horizontal: 'center', vertical: 'middle' };
  prodCell.fill = grayFill;
  setCellStyle(prodCell);
  for (let col = 8; col <= 10; col++) setCellStyle(superHeaderRow.getCell(col));

  currentRow++;

  // Sub-header row
  const subHeaders = [
    'Item Name',
    'Length',
    'Width',
    'Thickness',
    'Sheets',
    'SQ Mtr',
    'Group Sheets',
    'Group Sq. Mtr.',
    'Damaged Sheets',
    'Damaged Sq. Mtr.',
  ];
  const subHeaderRow = worksheet.getRow(currentRow);
  subHeaders.forEach((h, i) => {
    const cell = subHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = grayFill;
    setCellStyle(cell);
  });
  currentRow++;

  // Summary data rows
  summaryRows.forEach((s) => {
    const sumRow = worksheet.getRow(currentRow);
    sumRow.getCell(1).value = s.item_name;
    sumRow.getCell(2).value = s.length ?? 0;
    sumRow.getCell(3).value = s.width ?? 0;
    sumRow.getCell(4).value = s.thickness ?? 0;
    sumRow.getCell(5).value = s.issue_sheets ?? 0;
    sumRow.getCell(6).value = s.issue_sqm ?? 0;
    sumRow.getCell(7).value = s.group_sheets ?? 0;
    sumRow.getCell(8).value = s.group_sqm ?? 0;
    sumRow.getCell(9).value = s.damaged_sheets ?? 0;
    sumRow.getCell(10).value = s.damaged_sqm ?? 0;

    [2, 3, 4, 6, 8, 10].forEach((col) => {
      const c = sumRow.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.00';
    });

    for (let col = 1; col <= numSummaryCols; col++) setCellStyle(sumRow.getCell(col));
    currentRow++;
  });

  // Summary Total row
  const sumTotalRow = worksheet.getRow(currentRow);
  sumTotalRow.getCell(1).value = 'Total';
  sumTotalRow.getCell(1).font = { bold: true };
  sumTotalRow.getCell(5).value = totals.issue_sheets;
  sumTotalRow.getCell(5).font = { bold: true };
  sumTotalRow.getCell(6).value = totals.issue_sqm;
  sumTotalRow.getCell(6).font = { bold: true };
  sumTotalRow.getCell(6).numFmt = '0.00';
  sumTotalRow.getCell(7).value = totals.group_sheets;
  sumTotalRow.getCell(7).font = { bold: true };
  sumTotalRow.getCell(8).value = totals.group_sqm;
  sumTotalRow.getCell(8).font = { bold: true };
  sumTotalRow.getCell(8).numFmt = '0.00';
  sumTotalRow.getCell(9).value = totals.damaged_sheets;
  sumTotalRow.getCell(9).font = { bold: true };
  sumTotalRow.getCell(10).value = totals.damaged_sqm;
  sumTotalRow.getCell(10).font = { bold: true };
  sumTotalRow.getCell(10).numFmt = '0.00';
  for (let col = 1; col <= numSummaryCols; col++) {
    setCellStyle(
      sumTotalRow.getCell(col),
      col === 1 || col === 5 || col === 6 || col === 7 || col === 8 || col === 9 || col === 10
    );
  }

  // Column widths
  worksheet.columns = [
    { width: 22 }, // Item Name
    { width: 14 }, // LogX
    { width: 12 }, // Photo No
    { width: 10 }, // Length
    { width: 10 }, // Width
    { width: 12 }, // Thickness
    { width: 10 }, // Sheets
    { width: 16 }, // Damaged Sheets
    { width: 12 }, // Sq Mtr
    { width: 14 }, // Character
    { width: 12 }, // Pattern
    { width: 12 }, // Series
    { width: 16 }, // Remarks
  ];

  const timestamp = new Date().getTime();
  const fileName = `grouping_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Grouping';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;
  return downloadLink;
};

export { GenerateGroupingDailyReport };
