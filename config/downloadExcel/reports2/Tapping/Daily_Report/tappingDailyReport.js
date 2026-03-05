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
  } catch {
    return 'N/A';
  }
};

/**
 * Group aggregated data for:
 *  - Main table: byItem (item_name → rows)
 *  - Summery table: summeryMap (item_name|thickness|length|width → {issue, production})
 */
const groupData = (data) => {
  const byItem = {};
  const summeryMap = {};

  data.forEach((record) => {
    const item = record.items;
    const itemName = item?.item_name || 'UNKNOWN';
    const thickness = Number(item?.thickness) || 0;
    const length = Number(item?.length) || 0;
    const width = Number(item?.width) || 0;
    const sheets = Number(item?.no_of_sheets) || 0;
    const sqm = Number(item?.sqm) || 0;
    const splicingType = (record.splicing_type || '').toUpperCase();

    if (!byItem[itemName]) byItem[itemName] = [];

    byItem[itemName].push({
      log_no_code: item?.log_no_code ?? '',
      thickness,
      length,
      width,
      no_of_sheets: sheets,
      sqm,
      splicing_type: splicingType,
      character_name: item?.character_name ?? '',
      pattern_name: item?.pattern_name ?? '',
      series_name: item?.series_name ?? '',
      remark: item?.remark ?? '',
    });

    // Summery grouping key
    const summeryKey = `${itemName}||${thickness}||${length}||${width}`;
    if (!summeryMap[summeryKey]) {
      summeryMap[summeryKey] = {
        item_name: itemName,
        thickness,
        length,
        width,
        issue_sheets: 0,
        issue_sqm: 0,
        production_sheets: 0,
        production_sqm: 0,
      };
    }

    // Issue from issueSource (issue_for_tapping)
    const issueSource = record.issueSource?.[0];
    summeryMap[summeryKey].issue_sheets += Number(issueSource?.no_of_sheets) || 0;
    summeryMap[summeryKey].issue_sqm += Number(issueSource?.sqm) || 0;

    // Production from tapping_done_items_details
    summeryMap[summeryKey].production_sheets += sheets;
    summeryMap[summeryKey].production_sqm += sqm;
  });

  return { byItem, summeryRows: Object.values(summeryMap) };
};

/**
 * Apply header cell styling (gray background, bold, centered, bordered)
 */
const styleHeaderCell = (cell, { bold = true, bgColor = 'FFD3D3D3', wrapText = false } = {}) => {
  cell.font = { bold };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
};

/**
 * Apply data cell border
 */
const styleDataCell = (cell) => {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
};

/**
 * Generate Splicing Details Daily Report Excel.
 *
 * Main table: 14 columns, 3-row header
 *   Col 1:  Item Name
 *   Col 2:  Thickness
 *   Col 3:  LogX
 *   Col 4:  Length
 *   Col 5:  Width
 *   Col 6:  Sheets
 *   Cols 7–10: Tapping received (In Sq. Mtr.)
 *     Cols 7–8:  Machine Splicing → Sheets | SQ Mtr
 *     Cols 9–10: Hand Splicing    → Sheets | SQ Mtr
 *   Col 11: Character
 *   Col 12: Pattern
 *   Col 13: Series
 *   Col 14: Remarks
 *
 * Summery table: 8 columns, 2-row header
 *   Cols 1–4: Item Name | Tickness | Length | Width
 *   Cols 5–6: Issue → Sheets | SQ Mtr
 *   Cols 7–8: Production → Sheets | SQ Mtr
 */
const GenerateTappingDailyReportExcel = async (details, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Splicing Report');

  const formattedDate = formatDate(reportDate);
  const numFmt = '0.00';
  const TOTAL_COLS = 14;

  let r = 1; // current row tracker

  // ─── Title Row ────────────────────────────────────────────────────────────
  ws.mergeCells(r, 1, r, TOTAL_COLS);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = `Splicing Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(r).height = 22;
  r += 2;

  // ─── Main Table 3-Row Header ──────────────────────────────────────────────
  const hRow1 = r;
  const hRow2 = r + 1;
  const hRow3 = r + 2;

  // Cols 1–6: merge vertically across all 3 header rows
  const singleCols = [
    { col: 1, label: 'Item Name' },
    { col: 2, label: 'Thickness' },
    { col: 3, label: 'LogX' },
    { col: 4, label: 'Length' },
    { col: 5, label: 'Width' },
    { col: 6, label: 'Sheets' },
  ];
  singleCols.forEach(({ col, label }) => {
    ws.mergeCells(hRow1, col, hRow3, col);
    const cell = ws.getCell(hRow1, col);
    cell.value = label;
    styleHeaderCell(cell);
  });

  // Cols 11–14: merge vertically across all 3 header rows
  const rightCols = [
    { col: 11, label: 'Character' },
    { col: 12, label: 'Pattern' },
    { col: 13, label: 'Series' },
    { col: 14, label: 'Remarks' },
  ];
  rightCols.forEach(({ col, label }) => {
    ws.mergeCells(hRow1, col, hRow3, col);
    const cell = ws.getCell(hRow1, col);
    cell.value = label;
    styleHeaderCell(cell);
  });

  // Row 1: "Tapping received (In Sq. Mtr.)" merged across cols 7–10
  ws.mergeCells(hRow1, 7, hRow1, 10);
  const tappingReceivedCell = ws.getCell(hRow1, 7);
  tappingReceivedCell.value = 'Tapping received (In Sq. Mtr.)';
  styleHeaderCell(tappingReceivedCell, { wrapText: true });

  // Row 2: "Machine Splicing" (7–8), "Hand Splicing" (9–10)
  ws.mergeCells(hRow2, 7, hRow2, 8);
  const machineCell = ws.getCell(hRow2, 7);
  machineCell.value = 'Machine Splicing';
  styleHeaderCell(machineCell);

  ws.mergeCells(hRow2, 9, hRow2, 10);
  const handCell = ws.getCell(hRow2, 9);
  handCell.value = 'Hand Splicing';
  styleHeaderCell(handCell);

  // Row 3: Sheets | SQ Mtr | Sheets | SQ Mtr (cols 7–10)
  const subLabels = ['Sheets', 'SQ Mtr', 'Sheets', 'SQ Mtr'];
  subLabels.forEach((label, i) => {
    const cell = ws.getCell(hRow3, 7 + i);
    cell.value = label;
    styleHeaderCell(cell);
  });

  [hRow1, hRow2, hRow3].forEach((rowNum) => {
    ws.getRow(rowNum).height = 18;
  });

  r += 3;

  // ─── Main Table Data ──────────────────────────────────────────────────────
  const { byItem, summeryRows } = groupData(details);

  let grandSheets = 0;
  let grandMachineSheets = 0;
  let grandMachineSqm = 0;
  let grandHandSheets = 0;
  let grandHandSqm = 0;

  Object.keys(byItem)
    .sort()
    .forEach((itemName) => {
      const rows = byItem[itemName];
      let itemSheets = 0;
      let itemMachineSheets = 0;
      let itemMachineSqm = 0;
      let itemHandSheets = 0;
      let itemHandSqm = 0;

      rows.forEach((row, idx) => {
        const dataRow = ws.getRow(r);
        const isMachine = row.splicing_type === 'MACHINE';
        const isHand = row.splicing_type === 'HAND';

        // Col 1: Item Name (only on first row of group)
        if (idx === 0) {
          dataRow.getCell(1).value = itemName;
        }
        dataRow.getCell(2).value = row.thickness;
        dataRow.getCell(3).value = row.log_no_code;
        dataRow.getCell(4).value = row.length;
        dataRow.getCell(5).value = row.width;
        dataRow.getCell(6).value = row.no_of_sheets;
        // Machine Splicing (cols 7–8)
        dataRow.getCell(7).value = isMachine ? row.no_of_sheets : 0;
        dataRow.getCell(8).value = isMachine ? row.sqm : 0;
        // Hand Splicing (cols 9–10)
        dataRow.getCell(9).value = isHand ? row.no_of_sheets : 0;
        dataRow.getCell(10).value = isHand ? row.sqm : 0;
        // Right cols
        dataRow.getCell(11).value = row.character_name;
        dataRow.getCell(12).value = row.pattern_name;
        dataRow.getCell(13).value = row.series_name;
        dataRow.getCell(14).value = row.remark;

        // Number formatting
        [2, 4, 5, 6, 7, 8, 9, 10].forEach((col) => {
          const cell = dataRow.getCell(col);
          if (typeof cell.value === 'number') cell.numFmt = numFmt;
        });

        for (let col = 1; col <= TOTAL_COLS; col++) styleDataCell(dataRow.getCell(col));

        itemSheets += row.no_of_sheets;
        if (isMachine) { itemMachineSheets += row.no_of_sheets; itemMachineSqm += row.sqm; }
        if (isHand)    { itemHandSheets += row.no_of_sheets;    itemHandSqm += row.sqm;    }

        r++;
      });

      // Per-item Total row
      const totalRow = ws.getRow(r);
      totalRow.getCell(3).value = 'Total';
      totalRow.getCell(3).font = { bold: true };
      totalRow.getCell(6).value = itemSheets;
      totalRow.getCell(7).value = itemMachineSheets;
      totalRow.getCell(8).value = itemMachineSqm;
      totalRow.getCell(9).value = itemHandSheets;
      totalRow.getCell(10).value = itemHandSqm;
      [6, 7, 8, 9, 10].forEach((col) => {
        totalRow.getCell(col).font = { bold: true };
        totalRow.getCell(col).numFmt = numFmt;
      });
      for (let col = 1; col <= TOTAL_COLS; col++) styleDataCell(totalRow.getCell(col));
      r++;

      grandSheets += itemSheets;
      grandMachineSheets += itemMachineSheets;
      grandMachineSqm += itemMachineSqm;
      grandHandSheets += itemHandSheets;
      grandHandSqm += itemHandSqm;
    });

  // Grand Total row
  const grandRow = ws.getRow(r);
  grandRow.getCell(1).value = 'Total';
  grandRow.getCell(3).value = '-';
  grandRow.getCell(6).value = grandSheets;
  grandRow.getCell(7).value = grandMachineSheets;
  grandRow.getCell(8).value = grandMachineSqm;
  grandRow.getCell(9).value = grandHandSheets;
  grandRow.getCell(10).value = grandHandSqm;
  [1, 3].forEach((col) => (grandRow.getCell(col).font = { bold: true }));
  [6, 7, 8, 9, 10].forEach((col) => {
    grandRow.getCell(col).font = { bold: true };
    grandRow.getCell(col).numFmt = numFmt;
  });
  for (let col = 1; col <= TOTAL_COLS; col++) styleDataCell(grandRow.getCell(col));
  r += 2;

  // ─── Summery Section ──────────────────────────────────────────────────────
  // "Summery" label
  ws.mergeCells(r, 1, r, 8);
  const summeryLabel = ws.getCell(r, 1);
  summeryLabel.value = 'Summery';
  summeryLabel.font = { bold: true };
  summeryLabel.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(r).height = 18;
  r++;

  const sHRow1 = r;
  const sHRow2 = r + 1;

  // Cols 1–4: merged vertically (Item Name, Tickness, Length, Width)
  const summerySingleCols = [
    { col: 1, label: 'Item Name' },
    { col: 2, label: 'Tickness' },
    { col: 3, label: 'Length' },
    { col: 4, label: 'Width' },
  ];
  summerySingleCols.forEach(({ col, label }) => {
    ws.mergeCells(sHRow1, col, sHRow2, col);
    const cell = ws.getCell(sHRow1, col);
    cell.value = label;
    styleHeaderCell(cell);
  });

  // Issue merged (cols 5–6)
  ws.mergeCells(sHRow1, 5, sHRow1, 6);
  const issueCell = ws.getCell(sHRow1, 5);
  issueCell.value = 'Issue';
  styleHeaderCell(issueCell);

  // Production merged (cols 7–8)
  ws.mergeCells(sHRow1, 7, sHRow1, 8);
  const productionCell = ws.getCell(sHRow1, 7);
  productionCell.value = 'Production';
  styleHeaderCell(productionCell);

  // Sub-labels row 2
  ['Sheets', 'SQ Mtr', 'Sheets', 'SQ Mtr'].forEach((label, i) => {
    const cell = ws.getCell(sHRow2, 5 + i);
    cell.value = label;
    styleHeaderCell(cell);
  });

  [sHRow1, sHRow2].forEach((rowNum) => { ws.getRow(rowNum).height = 18; });
  r += 2;

  // Summery data rows
  let sumIssueSheets = 0;
  let sumIssueSqm = 0;
  let sumProdSheets = 0;
  let sumProdSqm = 0;

  summeryRows
    .sort((a, b) => a.item_name.localeCompare(b.item_name) || a.length - b.length || a.width - b.width)
    .forEach((s) => {
      const row = ws.getRow(r);
      row.getCell(1).value = s.item_name;
      row.getCell(2).value = s.thickness;
      row.getCell(3).value = s.length;
      row.getCell(4).value = s.width;
      row.getCell(5).value = s.issue_sheets;
      row.getCell(6).value = s.issue_sqm;
      row.getCell(7).value = s.production_sheets;
      row.getCell(8).value = s.production_sqm;

      [2, 3, 4, 5, 6, 7, 8].forEach((col) => {
        const cell = row.getCell(col);
        if (typeof cell.value === 'number') cell.numFmt = numFmt;
      });
      for (let col = 1; col <= 8; col++) styleDataCell(row.getCell(col));

      sumIssueSheets += s.issue_sheets;
      sumIssueSqm += s.issue_sqm;
      sumProdSheets += s.production_sheets;
      sumProdSqm += s.production_sqm;

      r++;
    });

  // Summery Total row
  const sTotalRow = ws.getRow(r);
  sTotalRow.getCell(1).value = 'Total';
  sTotalRow.getCell(5).value = sumIssueSheets;
  sTotalRow.getCell(6).value = sumIssueSqm;
  sTotalRow.getCell(7).value = sumProdSheets;
  sTotalRow.getCell(8).value = sumProdSqm;
  sTotalRow.getCell(1).font = { bold: true };
  [5, 6, 7, 8].forEach((col) => {
    sTotalRow.getCell(col).font = { bold: true };
    sTotalRow.getCell(col).numFmt = numFmt;
  });
  for (let col = 1; col <= 8; col++) styleDataCell(sTotalRow.getCell(col));

  // ─── Column Widths ────────────────────────────────────────────────────────
  ws.columns = [
    { width: 30 }, // Item Name
    { width: 12 }, // Thickness
    { width: 14 }, // LogX
    { width: 10 }, // Length
    { width: 10 }, // Width
    { width: 10 }, // Sheets
    { width: 12 }, // Machine Sheets
    { width: 12 }, // Machine SQ Mtr
    { width: 12 }, // Hand Sheets
    { width: 12 }, // Hand SQ Mtr
    { width: 14 }, // Character
    { width: 14 }, // Pattern
    { width: 12 }, // Series
    { width: 16 }, // Remarks
  ];

  // ─── Save File ────────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const fileName = `tapping_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Tapping';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  return `${process.env.APP_URL}${filePath}`;
};

export { GenerateTappingDailyReportExcel };
