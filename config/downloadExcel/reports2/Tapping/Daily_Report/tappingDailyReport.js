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
 *  - Summary table: SummaryMap (item_name|thickness|length|width → {issue, production})
 */
const groupData = (data) => {
  const byItem = {};
  const SummaryMap = {};

  data.forEach((record) => {
    const item = record.items;
    const itemName = item?.item_name || 'UNKNOWN';
    const thickness = Number(item?.thickness) || 0;
    const length = Number(item?.length) || 0;
    const width = Number(item?.width) || 0;
    const sheets = Number(item?.no_of_sheets) || 0;
    const sqm = Number(item?.sqm) || 0;
    const amount = Number(item?.amount) || 0;
    const expense_amount = Number(item?.expense_amount) || 0;
    const splicingType = (record.splicing_type || '').toUpperCase();

    if (!byItem[itemName]) byItem[itemName] = [];

    byItem[itemName].push({
      log_no_code: item?.log_no_code ?? '',
      thickness,
      length,
      width,
      no_of_sheets: sheets,
      sqm,
      amount,
      expense_amount,
      splicing_type: splicingType,
      character_name: item?.character_name ?? '',
      pattern_name: item?.pattern_name ?? '',
      series_name: item?.series_name ?? '',
      remark: item?.remark ?? '',
    });

    // Summary grouping key
    const SummaryKey = `${itemName}||${thickness}||${length}||${width}`;
    if (!SummaryMap[SummaryKey]) {
      SummaryMap[SummaryKey] = {
        item_name: itemName,
        thickness,
        length,
        width,
        issue_sheets: 0,
        issue_sqm: 0,
        issue_amount: 0,
        issue_expense_amount: 0,
        production_sheets: 0,
        production_sqm: 0,
        production_amount: 0,
        production_expense_amount: 0,
      };
    }

    // Issue from issueSource (issue_for_tapping)
    const issueSource = record.issueSource?.[0];
    SummaryMap[SummaryKey].issue_sheets += Number(issueSource?.no_of_sheets) || 0;
    SummaryMap[SummaryKey].issue_sqm += Number(issueSource?.sqm) || 0;
    SummaryMap[SummaryKey].issue_amount += Number(issueSource?.amount) || 0;
    SummaryMap[SummaryKey].issue_expense_amount += Number(issueSource?.expense_amount) || 0;

    // Production from tapping_done_items_details
    SummaryMap[SummaryKey].production_sheets += sheets;
    SummaryMap[SummaryKey].production_sqm += sqm;
    SummaryMap[SummaryKey].production_amount += amount;
    SummaryMap[SummaryKey].production_expense_amount += expense_amount;
  });

  return { byItem, SummaryRows: Object.values(SummaryMap) };
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
 * Main table: 3-row header
 *   Col 1:  Item Name
 *   Col 2:  Thickness
 *   Col 3:  LogX
 *   Col 4:  Length
 *   Col 5:  Width
 *   Col 6:  Sheets
 *   Tapping received (In Sq. Mtr.) block:
 *     Machine Splicing → Sheets | SQ Mtr [ | Amount | Expense Amount ]
 *     Hand Splicing    → Sheets | SQ Mtr [ | Amount | Expense Amount ]
 *   Then: Character | Pattern | Series | Remarks
 *
 * Summary table: 2-row header
 *   Item Name | Thickness | Length | Width
 *   Issue      → Sheets | SQ Mtr [ | Amount | Expense Amount ]
 *   Production → Sheets | SQ Mtr [ | Amount | Expense Amount ]
 */
const GenerateTappingDailyReportExcel = async (details, reportDate, includeCostAndExpense) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Splicing Report');

  const formattedDate = formatDate(reportDate);
  const numFmt = '0.00';

  // ── Layout math (main table) ──────────────────────────────────────────────
  const colsPerSub = includeCostAndExpense ? 4 : 2; // Sheets, SQM, [Amount, Expense Amount]
  const subLabels = includeCostAndExpense
    ? ['Sheets', 'SQ Mtr', 'Amount', 'Expense Amount']
    : ['Sheets', 'SQ Mtr'];

  const KEY_COLS = 6; // Item Name, Thickness, LogX, Length, Width, Sheets
  const machineStart = KEY_COLS + 1;
  const handStart = machineStart + colsPerSub;
  const rightStart = handStart + colsPerSub; // Character
  const TOTAL_COLS = rightStart + 3; // Character, Pattern, Series, Remarks

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

  // Right cols: merge vertically across all 3 header rows
  const rightCols = [
    { col: rightStart, label: 'Character' },
    { col: rightStart + 1, label: 'Pattern' },
    { col: rightStart + 2, label: 'Series' },
    { col: rightStart + 3, label: 'Remarks' },
  ];
  rightCols.forEach(({ col, label }) => {
    ws.mergeCells(hRow1, col, hRow3, col);
    const cell = ws.getCell(hRow1, col);
    cell.value = label;
    styleHeaderCell(cell);
  });

  // Row 1: "Tapping received (In Sq. Mtr.)" merged across the whole block
  ws.mergeCells(hRow1, machineStart, hRow1, handStart + colsPerSub - 1);
  const tappingReceivedCell = ws.getCell(hRow1, machineStart);
  tappingReceivedCell.value = 'Tapping received (In Sq. Mtr.)';
  styleHeaderCell(tappingReceivedCell, { wrapText: true });

  // Row 2: "Machine Splicing" / "Hand Splicing"
  ws.mergeCells(hRow2, machineStart, hRow2, machineStart + colsPerSub - 1);
  const machineCell = ws.getCell(hRow2, machineStart);
  machineCell.value = 'Machine Splicing';
  styleHeaderCell(machineCell);

  ws.mergeCells(hRow2, handStart, hRow2, handStart + colsPerSub - 1);
  const handCell = ws.getCell(hRow2, handStart);
  handCell.value = 'Hand Splicing';
  styleHeaderCell(handCell);

  // Row 3: sub-labels for both blocks
  subLabels.forEach((label, i) => {
    const machineCellSub = ws.getCell(hRow3, machineStart + i);
    machineCellSub.value = label;
    styleHeaderCell(machineCellSub);

    const handCellSub = ws.getCell(hRow3, handStart + i);
    handCellSub.value = label;
    styleHeaderCell(handCellSub);
  });

  [hRow1, hRow2, hRow3].forEach((rowNum) => {
    ws.getRow(rowNum).height = 18;
  });

  r += 3;

  // ─── Main Table Data ──────────────────────────────────────────────────────
  const { byItem, SummaryRows } = groupData(details);

  let grandSheets = 0;
  let grandMachineSheets = 0;
  let grandMachineSqm = 0;
  let grandMachineAmount = 0;
  let grandMachineExpense = 0;
  let grandHandSheets = 0;
  let grandHandSqm = 0;
  let grandHandAmount = 0;
  let grandHandExpense = 0;

  Object.keys(byItem)
    .sort()
    .forEach((itemName) => {
      const rows = byItem[itemName];
      let itemSheets = 0;
      let itemMachineSheets = 0;
      let itemMachineSqm = 0;
      let itemMachineAmount = 0;
      let itemMachineExpense = 0;
      let itemHandSheets = 0;
      let itemHandSqm = 0;
      let itemHandAmount = 0;
      let itemHandExpense = 0;

      rows.forEach((row, idx) => {
        const dataRow = ws.getRow(r);
        // Accept both 'MACHINE'/'MACHINE SPLICING' and 'HAND'/'HAND SPLICING' (DB may store either)
        const isMachine =
          row.splicing_type === 'MACHINE' || row.splicing_type === 'MACHINE SPLICING';
        const isHand =
          row.splicing_type === 'HAND' || row.splicing_type === 'HAND SPLICING';

        // Col 1: Item Name (only on first row of group)
        if (idx === 0) {
          dataRow.getCell(1).value = itemName;
        }
        dataRow.getCell(2).value = row.thickness;
        dataRow.getCell(3).value = row.log_no_code;
        dataRow.getCell(4).value = row.length;
        dataRow.getCell(5).value = row.width;
        dataRow.getCell(6).value = row.no_of_sheets;

        // Machine Splicing block
        dataRow.getCell(machineStart).value = isMachine ? row.no_of_sheets : 0;
        dataRow.getCell(machineStart + 1).value = isMachine ? row.sqm : 0;
        if (includeCostAndExpense) {
          dataRow.getCell(machineStart + 2).value = isMachine ? row.amount : 0;
          dataRow.getCell(machineStart + 3).value = isMachine ? row.expense_amount : 0;
        }

        // Hand Splicing block
        dataRow.getCell(handStart).value = isHand ? row.no_of_sheets : 0;
        dataRow.getCell(handStart + 1).value = isHand ? row.sqm : 0;
        if (includeCostAndExpense) {
          dataRow.getCell(handStart + 2).value = isHand ? row.amount : 0;
          dataRow.getCell(handStart + 3).value = isHand ? row.expense_amount : 0;
        }

        // Right cols
        dataRow.getCell(rightStart).value = row.character_name;
        dataRow.getCell(rightStart + 1).value = row.pattern_name;
        dataRow.getCell(rightStart + 2).value = row.series_name;
        dataRow.getCell(rightStart + 3).value = row.remark;

        // Number formatting
        const numericCols = [2, 4, 5, 6];
        for (let c = machineStart; c < machineStart + colsPerSub; c++) numericCols.push(c);
        for (let c = handStart; c < handStart + colsPerSub; c++) numericCols.push(c);
        numericCols.forEach((col) => {
          const cell = dataRow.getCell(col);
          if (typeof cell.value === 'number') cell.numFmt = numFmt;
        });

        for (let col = 1; col <= TOTAL_COLS; col++) styleDataCell(dataRow.getCell(col));

        itemSheets += row.no_of_sheets;
        if (isMachine) {
          itemMachineSheets += row.no_of_sheets;
          itemMachineSqm += row.sqm;
          itemMachineAmount += row.amount;
          itemMachineExpense += row.expense_amount;
        }
        if (isHand) {
          itemHandSheets += row.no_of_sheets;
          itemHandSqm += row.sqm;
          itemHandAmount += row.amount;
          itemHandExpense += row.expense_amount;
        }

        r++;
      });

      // Per-item Total row
      const totalRow = ws.getRow(r);
      totalRow.getCell(3).value = 'Total';
      totalRow.getCell(3).font = { bold: true };
      totalRow.getCell(6).value = itemSheets;
      totalRow.getCell(machineStart).value = itemMachineSheets;
      totalRow.getCell(machineStart + 1).value = itemMachineSqm;
      totalRow.getCell(handStart).value = itemHandSheets;
      totalRow.getCell(handStart + 1).value = itemHandSqm;
      const totalNumericCols = [6, machineStart, machineStart + 1, handStart, handStart + 1];
      if (includeCostAndExpense) {
        totalRow.getCell(machineStart + 2).value = itemMachineAmount;
        totalRow.getCell(machineStart + 3).value = itemMachineExpense;
        totalRow.getCell(handStart + 2).value = itemHandAmount;
        totalRow.getCell(handStart + 3).value = itemHandExpense;
        totalNumericCols.push(machineStart + 2, machineStart + 3, handStart + 2, handStart + 3);
      }
      totalNumericCols.forEach((col) => {
        totalRow.getCell(col).font = { bold: true };
        totalRow.getCell(col).numFmt = numFmt;
      });
      for (let col = 1; col <= TOTAL_COLS; col++) styleDataCell(totalRow.getCell(col));
      r++;

      grandSheets += itemSheets;
      grandMachineSheets += itemMachineSheets;
      grandMachineSqm += itemMachineSqm;
      grandMachineAmount += itemMachineAmount;
      grandMachineExpense += itemMachineExpense;
      grandHandSheets += itemHandSheets;
      grandHandSqm += itemHandSqm;
      grandHandAmount += itemHandAmount;
      grandHandExpense += itemHandExpense;
    });

  // Grand Total row
  const grandRow = ws.getRow(r);
  grandRow.getCell(1).value = 'Total';
  grandRow.getCell(3).value = '-';
  grandRow.getCell(6).value = grandSheets;
  grandRow.getCell(machineStart).value = grandMachineSheets;
  grandRow.getCell(machineStart + 1).value = grandMachineSqm;
  grandRow.getCell(handStart).value = grandHandSheets;
  grandRow.getCell(handStart + 1).value = grandHandSqm;
  const grandNumericCols = [6, machineStart, machineStart + 1, handStart, handStart + 1];
  if (includeCostAndExpense) {
    grandRow.getCell(machineStart + 2).value = grandMachineAmount;
    grandRow.getCell(machineStart + 3).value = grandMachineExpense;
    grandRow.getCell(handStart + 2).value = grandHandAmount;
    grandRow.getCell(handStart + 3).value = grandHandExpense;
    grandNumericCols.push(machineStart + 2, machineStart + 3, handStart + 2, handStart + 3);
  }
  [1, 3].forEach((col) => (grandRow.getCell(col).font = { bold: true }));
  grandNumericCols.forEach((col) => {
    grandRow.getCell(col).font = { bold: true };
    grandRow.getCell(col).numFmt = numFmt;
  });
  for (let col = 1; col <= TOTAL_COLS; col++) styleDataCell(grandRow.getCell(col));
  r += 2;

  // ─── Summary Section ──────────────────────────────────────────────────────
  const sColsPerSub = includeCostAndExpense ? 4 : 2;
  const sKeyCols = 4; // Item Name, Thickness, Length, Width
  const issueStart = sKeyCols + 1;
  const productionStart = issueStart + sColsPerSub;
  const SUMMARY_TOTAL_COLS = productionStart + sColsPerSub - 1;

  // "Summary" label
  ws.mergeCells(r, 1, r, SUMMARY_TOTAL_COLS);
  const SummaryLabel = ws.getCell(r, 1);
  SummaryLabel.value = 'Summary';
  SummaryLabel.font = { bold: true };
  SummaryLabel.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(r).height = 18;
  r++;

  const sHRow1 = r;
  const sHRow2 = r + 1;

  // Cols 1–4: merged vertically (Item Name, Thickness, Length, Width)
  const SummarySingleCols = [
    { col: 1, label: 'Item Name' },
    { col: 2, label: 'Thickness' },
    { col: 3, label: 'Length' },
    { col: 4, label: 'Width' },
  ];
  SummarySingleCols.forEach(({ col, label }) => {
    ws.mergeCells(sHRow1, col, sHRow2, col);
    const cell = ws.getCell(sHRow1, col);
    cell.value = label;
    styleHeaderCell(cell);
  });

  // Issue merged block
  ws.mergeCells(sHRow1, issueStart, sHRow1, issueStart + sColsPerSub - 1);
  const issueCell = ws.getCell(sHRow1, issueStart);
  issueCell.value = 'Issue';
  styleHeaderCell(issueCell);

  // Production merged block
  ws.mergeCells(sHRow1, productionStart, sHRow1, productionStart + sColsPerSub - 1);
  const productionCell = ws.getCell(sHRow1, productionStart);
  productionCell.value = 'Production';
  styleHeaderCell(productionCell);

  // Sub-labels row 2
  subLabels.forEach((label, i) => {
    const issueSubCell = ws.getCell(sHRow2, issueStart + i);
    issueSubCell.value = label;
    styleHeaderCell(issueSubCell);

    const prodSubCell = ws.getCell(sHRow2, productionStart + i);
    prodSubCell.value = label;
    styleHeaderCell(prodSubCell);
  });

  [sHRow1, sHRow2].forEach((rowNum) => { ws.getRow(rowNum).height = 18; });
  r += 2;

  // Summary data rows
  let sumIssueSheets = 0;
  let sumIssueSqm = 0;
  let sumIssueAmount = 0;
  let sumIssueExpense = 0;
  let sumProdSheets = 0;
  let sumProdSqm = 0;
  let sumProdAmount = 0;
  let sumProdExpense = 0;

  SummaryRows
    .sort((a, b) => a.item_name.localeCompare(b.item_name) || a.length - b.length || a.width - b.width)
    .forEach((s) => {
      const row = ws.getRow(r);
      row.getCell(1).value = s.item_name;
      row.getCell(2).value = s.thickness;
      row.getCell(3).value = s.length;
      row.getCell(4).value = s.width;
      row.getCell(issueStart).value = s.issue_sheets;
      row.getCell(issueStart + 1).value = s.issue_sqm;
      row.getCell(productionStart).value = s.production_sheets;
      row.getCell(productionStart + 1).value = s.production_sqm;

      const sNumericCols = [2, 3, 4, issueStart, issueStart + 1, productionStart, productionStart + 1];
      if (includeCostAndExpense) {
        row.getCell(issueStart + 2).value = s.issue_amount;
        row.getCell(issueStart + 3).value = s.issue_expense_amount;
        row.getCell(productionStart + 2).value = s.production_amount;
        row.getCell(productionStart + 3).value = s.production_expense_amount;
        sNumericCols.push(issueStart + 2, issueStart + 3, productionStart + 2, productionStart + 3);
      }
      sNumericCols.forEach((col) => {
        const cell = row.getCell(col);
        if (typeof cell.value === 'number') cell.numFmt = numFmt;
      });
      for (let col = 1; col <= SUMMARY_TOTAL_COLS; col++) styleDataCell(row.getCell(col));

      sumIssueSheets += s.issue_sheets;
      sumIssueSqm += s.issue_sqm;
      sumIssueAmount += s.issue_amount;
      sumIssueExpense += s.issue_expense_amount;
      sumProdSheets += s.production_sheets;
      sumProdSqm += s.production_sqm;
      sumProdAmount += s.production_amount;
      sumProdExpense += s.production_expense_amount;

      r++;
    });

  // Summary Total row
  const sTotalRow = ws.getRow(r);
  sTotalRow.getCell(1).value = 'Total';
  sTotalRow.getCell(issueStart).value = sumIssueSheets;
  sTotalRow.getCell(issueStart + 1).value = sumIssueSqm;
  sTotalRow.getCell(productionStart).value = sumProdSheets;
  sTotalRow.getCell(productionStart + 1).value = sumProdSqm;
  const sTotalNumericCols = [issueStart, issueStart + 1, productionStart, productionStart + 1];
  if (includeCostAndExpense) {
    sTotalRow.getCell(issueStart + 2).value = sumIssueAmount;
    sTotalRow.getCell(issueStart + 3).value = sumIssueExpense;
    sTotalRow.getCell(productionStart + 2).value = sumProdAmount;
    sTotalRow.getCell(productionStart + 3).value = sumProdExpense;
    sTotalNumericCols.push(issueStart + 2, issueStart + 3, productionStart + 2, productionStart + 3);
  }
  sTotalRow.getCell(1).font = { bold: true };
  sTotalNumericCols.forEach((col) => {
    sTotalRow.getCell(col).font = { bold: true };
    sTotalRow.getCell(col).numFmt = numFmt;
  });
  for (let col = 1; col <= SUMMARY_TOTAL_COLS; col++) styleDataCell(sTotalRow.getCell(col));

  // ─── Column Widths ────────────────────────────────────────────────────────
  const subWidths = includeCostAndExpense ? [12, 12, 12, 16] : [12, 12]; // Sheets, SQM, [Amount, Expense Amount]
  const columns = [
    { width: 30 }, // Item Name
    { width: 12 }, // Thickness
    { width: 14 }, // LogX
    { width: 10 }, // Length
    { width: 10 }, // Width
    { width: 10 }, // Sheets
    ...subWidths,  // Machine block
    ...subWidths,  // Hand block
    { width: 14 }, // Character
    { width: 14 }, // Pattern
    { width: 12 }, // Series
    { width: 16 }, // Remarks
  ];
  ws.columns = columns;

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