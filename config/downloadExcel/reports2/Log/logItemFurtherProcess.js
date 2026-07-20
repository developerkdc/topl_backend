import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Inward Log Item Further Process Report Excel
 */
export const createLogItemFurtherProcessReportExcel = async (
  logData,
  startDate,
  endDate,
  filter = {},
  includeCostAndExpense = false
) => {
  try {
    const showCost = includeCostAndExpense === true || includeCostAndExpense === 'true' || filter?.includeCostAndExpense === true || filter?.includeCostAndExpense === 'true';
    const folderPath = 'public/upload/reports/reports2/Log';
    try {
      await fs.access(folderPath);
    } catch {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const ws = workbook.addWorksheet('Log Further Process', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }],
    });

    // ── Column definitions (Dynamic based on showCost) ─────────────────────
    const activeCols = [
      { key: 'item_name', width: 22, colHdr: 'Item Name', groupHdr: '', mergeGroup: 'item' },  // 1
      { key: 'log_no', width: 13, colHdr: 'LogNo', groupHdr: 'Inward in(CMT)', mergeGroup: 'log' },  // 2
      { key: 'indian_cmt', width: 11, colHdr: 'Indian CMT', groupHdr: 'Inward in(CMT)', mergeGroup: 'log', isNumeric: true },  // 3
      { key: 'rece_cmt', width: 10, colHdr: 'RECE CMT', groupHdr: 'Inward in(CMT)', mergeGroup: 'log', isNumeric: true },  // 4
      { key: 'inward_issue_for', width: 14, colHdr: 'Issue For Cross cut/Flitch/Peeling/Sales', groupHdr: 'Inward in(CMT)', mergeGroup: 'log', isNumeric: true },  // 5
      { key: 'inward_issue_status', width: 12, colHdr: 'Issue Status', groupHdr: 'Inward in(CMT)', mergeGroup: 'log' },  // 6
      { key: 'cc_log_no', width: 14, colHdr: 'Cross Cut Log No', groupHdr: 'Cross Cut Issue in(CMT)', mergeGroup: 'cc' },  // 7
      { key: 'cc_rec', width: 10, colHdr: 'CC REC', groupHdr: 'Cross Cut Issue in(CMT)', mergeGroup: 'cc', isNumeric: true },  // 8
      { key: 'cc_issue_for', width: 14, colHdr: 'Issue For Flitch/Peeling', groupHdr: 'Cross Cut Issue in(CMT)', mergeGroup: 'cc', isNumeric: true },  // 9
      { key: 'cc_status', width: 11, colHdr: 'Status', groupHdr: 'Cross Cut Issue in(CMT)', mergeGroup: 'cc' },  // 10
      ...(showCost ? [
        { key: 'cc_amount', width: 12, colHdr: 'Amount', groupHdr: 'Cross Cut Issue in(CMT)', isNumeric: true },  // 11
        { key: 'cc_expense_amount', width: 12, colHdr: 'Expense', groupHdr: 'Cross Cut Issue in(CMT)', isNumeric: true },  // 12
      ] : []),
      { key: 'flitch_no', width: 13, colHdr: 'Log No code', groupHdr: 'Flitch Issue in(CMT)', mergeGroup: 'flitch' },  // 11
      { key: 'flitch_rec', width: 10, colHdr: 'REC', groupHdr: 'Flitch Issue in(CMT)', mergeGroup: 'flitch', isNumeric: true },  // 12
      { key: 'flitch_issue_for', width: 14, colHdr: 'Issue For Slicing/Peeling', groupHdr: 'Flitch Issue in(CMT)', mergeGroup: 'flitch', isNumeric: true },  // 13
      { key: 'flitch_status', width: 11, colHdr: 'Status', groupHdr: 'Flitch Issue in(CMT)', mergeGroup: 'flitch' },  // 14
      ...(showCost ? [
        { key: 'fitch_amount', width: 12, colHdr: 'Amount', groupHdr: 'Flitch Issue in(CMT)', isNumeric: true },  // 15
        { key: 'fitch_expense_amount', width: 12, colHdr: 'Expense Amount', groupHdr: 'Flitch Issue in(CMT)', isNumeric: true },  // 16
      ] : []),
      { key: 'slicing_side', width: 13, colHdr: 'Side', groupHdr: 'Slicing Issue in(CMT)', mergeGroup: 'side' },  // 17
      { key: 'slicing_process_cmt', width: 12, colHdr: 'Process Cmt', groupHdr: 'Slicing Issue in(CMT)', mergeGroup: 'side' },  // 18
      { key: 'slicing_balance_cmt', width: 12, colHdr: 'Balance Cmt', groupHdr: 'Slicing Issue in(CMT)', mergeGroup: 'side' },  // 19
      { key: 'slicing_rec_leaf', width: 12, colHdr: 'REC (Leaf)', groupHdr: 'Slicing Issue in(CMT)', mergeGroup: 'side', isNumeric: true },  // 20
      ...(showCost ? [
        { key: 'slicing_amount', width: 12, colHdr: 'Slicing Cost', groupHdr: 'Slicing Issue in(CMT)', isNumeric: true },  // 21
        { key: 'slicing_expense_amount', width: 12, colHdr: 'Slicing Expense', groupHdr: 'Slicing Issue in(CMT)', isNumeric: true },  // 22
      ] : []),
      { key: 'peeling_process', width: 12, colHdr: 'Process', groupHdr: 'Peeling' },  // 23
      { key: 'peeling_balance_rostroller', width: 14, colHdr: 'Balance Rostroller', groupHdr: 'Peeling' }, // 24
      { key: 'peeling_output', width: 12, colHdr: 'Output', groupHdr: 'Peeling' },  // 25
      { key: 'peeling_rec_leaf', width: 12, colHdr: 'Rec (Leaf)', groupHdr: 'Peeling', isNumeric: true },  // 26
      ...(showCost ? [
        { key: 'peeling_amount', width: 12, colHdr: 'Peeling Cost', groupHdr: 'Peeling', isNumeric: true },  // 27
        { key: 'peeling_expense_amount', width: 12, colHdr: 'Peeling Expense', groupHdr: 'Peeling', isNumeric: true },  // 28
      ] : []),
      { key: 'dress_rec_sqm', width: 12, colHdr: 'Rec Sq. Mtr.', groupHdr: 'Dressing', mergeGroup: 'side', isNumeric: true },  // 29
      { key: 'dress_issue_sqm', width: 12, colHdr: 'Issue (Sq.Mtr.)', groupHdr: 'Dressing', mergeGroup: 'side', isNumeric: true },  // 30
      { key: 'dress_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Dressing', mergeGroup: 'side' },  // 31
      ...(showCost ? [
        { key: 'dress_amount', width: 12, colHdr: 'Dressing Cost', groupHdr: 'Dressing', isNumeric: true },  // 32
        { key: 'dress_expense_amount', width: 12, colHdr: 'Dressing Expense', groupHdr: 'Dressing', isNumeric: true },  // 33
      ] : []),
      { key: 'smoking_process', width: 12, colHdr: 'Process', groupHdr: 'Smoking/Dying', mergeGroup: 'side' },  // 34
      { key: 'smoking_issue_sqm', width: 12, colHdr: 'Issue (Sq.Mtr.)', groupHdr: 'Smoking/Dying', mergeGroup: 'side', isNumeric: true },  // 35
      { key: 'smoking_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Smoking/Dying', mergeGroup: 'side' },  // 36
      ...(showCost ? [
        { key: 'smoking_amount', width: 12, colHdr: 'Smoking Cost', groupHdr: 'Smoking/Dying', isNumeric: true },  // 37
        { key: 'smoking_expense_amount', width: 12, colHdr: 'Smoking Expense', groupHdr: 'Smoking/Dying', isNumeric: true },  // 38
      ] : []),
      { key: 'grouping_new_group_no', width: 16, colHdr: 'New Group Number', groupHdr: 'Clipping/Grouping' },  // 39
      { key: 'grouping_rec_sheets', width: 12, colHdr: 'Rec Sheets', groupHdr: 'Clipping/Grouping', isNumeric: true },  // 40
      { key: 'grouping_rec_sqm', width: 12, colHdr: 'Rec Sq.Mtr.', groupHdr: 'Clipping/Grouping', isNumeric: true },  // 41
      { key: 'grouping_issue_sheets', width: 12, colHdr: 'Issue (Sheets)', groupHdr: 'Clipping/Grouping', isNumeric: true },  // 42
      { key: 'grouping_issue_sqm', width: 12, colHdr: 'Issue (Sq.Mtr.)', groupHdr: 'Clipping/Grouping', isNumeric: true },  // 43
      { key: 'grouping_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Clipping/Grouping' },  // 44
      { key: 'grouping_balance_sheets', width: 14, colHdr: 'Balance (Sheets)', groupHdr: 'Clipping/Grouping', isNumeric: true },  // 45
      { key: 'grouping_balance_sqm', width: 14, colHdr: 'Balance Sq. Mtr.', groupHdr: 'Clipping/Grouping', isNumeric: true },  // 46
      ...(showCost ? [
        { key: 'grouping_amount', width: 12, colHdr: 'Grouping Cost', groupHdr: 'Clipping/Grouping', isNumeric: true },  // 47
        { key: 'grouping_expense_amount', width: 12, colHdr: 'Grouping Expense', groupHdr: 'Clipping/Grouping', isNumeric: true },  // 48
      ] : []),
      { key: 'splicing_rec_machine_sqm', width: 16, colHdr: 'Rec Machine (Sq.mtr.)', groupHdr: 'Splicing', isNumeric: true },  // 49
      { key: 'splicing_rec_hand_sqm', width: 16, colHdr: 'Rec Hand (Sq.Mtr.)', groupHdr: 'Splicing', isNumeric: true },  // 50
      { key: 'splicing_sheets', width: 14, colHdr: 'Splicing Sheets', groupHdr: 'Splicing', isNumeric: true },  // 51
      { key: 'splicing_issue_sheets', width: 14, colHdr: 'Issue (Sheets)', groupHdr: 'Splicing', isNumeric: true },  // 52
      { key: 'splicing_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Splicing' },  // 53
      { key: 'splicing_balance_sheets', width: 15, colHdr: 'Balance (Sheets)', groupHdr: 'Splicing', isNumeric: true },  // 54
      { key: 'splicing_balance_sqm', width: 15, colHdr: 'Balance (Sq. Mtr.)', groupHdr: 'Splicing', isNumeric: true },  // 55
      ...(showCost ? [
        { key: 'splicing_amount', width: 12, colHdr: 'Splicing Cost', groupHdr: 'Splicing', isNumeric: true },  // 56
        { key: 'splicing_expense_amount', width: 12, colHdr: 'Splicing Expense', groupHdr: 'Splicing', isNumeric: true },  // 57
      ] : []),
      { key: 'pressing_sheets', width: 14, colHdr: 'Pressing (Sheets)', groupHdr: 'Pressing', isNumeric: true },  // 58
      { key: 'pressing_sqm', width: 13, colHdr: 'Pressing (Sq.mtr.)', groupHdr: 'Pressing', isNumeric: true },  // 59
      { key: 'pressing_issue_sheets', width: 14, colHdr: 'Issue (Sheets)', groupHdr: 'Pressing', isNumeric: true },  // 60
      { key: 'pressing_issue_sqm', width: 14, colHdr: 'Issue (Sq. Mtr.)', groupHdr: 'Pressing', isNumeric: true },  // 61
      { key: 'pressing_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Pressing' },  // 62
      { key: 'pressing_balance_sheets', width: 15, colHdr: 'Balance (Sheets)', groupHdr: 'Pressing', isNumeric: true },  // 63
      { key: 'pressing_balance_sqm', width: 15, colHdr: 'Balance (Sq. Mtr.)', groupHdr: 'Pressing', isNumeric: true },  // 64
      ...(showCost ? [
        { key: 'pressing_amount', width: 12, colHdr: 'Pressing Cost', groupHdr: 'Pressing', isNumeric: true },  // 65
        { key: 'pressing_expense_amount', width: 12, colHdr: 'Pressing Expense', groupHdr: 'Pressing', isNumeric: true },  // 66
      ] : []),
      { key: 'cnc_type', width: 13, colHdr: 'Cnc Type', groupHdr: 'CNC' },  // 67
      { key: 'cnc_rec_sheets', width: 12, colHdr: 'REC (Sheets)', groupHdr: 'CNC', isNumeric: true },  // 68
      ...(showCost ? [
        { key: 'cnc_amount', width: 12, colHdr: 'CNC Cost', groupHdr: 'CNC', isNumeric: true },  // 73
        { key: 'cnc_expense_amount', width: 12, colHdr: 'CNC Expense', groupHdr: 'CNC', isNumeric: true },  // 74
      ] : []),
      { key: 'colour_rec_sheets', width: 12, colHdr: 'REC (Sheets)', groupHdr: 'COLOUR', isNumeric: true },  // 75
      { key: 'sales_cmt_sqm', width: 16, colHdr: 'Order (CBM / SQM)', groupHdr: 'Sales', isNumeric: true },  // 76 — order line CBM / SQM
      { key: 'challan_cmt_sqm', width: 16, colHdr: 'SQM/CBM', groupHdr: 'Challan', isNumeric: true },  // 77 — challan issued SQM/CBM
    ];

    ws.columns = activeCols.map(c => ({ key: c.key, width: c.width }));
    const totalCols = activeCols.length;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const fmt = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      } catch {
        return 'N/A';
      }
    };

    const numFmt = '#,##0.000';

    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    const totalFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE0B2' },
    };
    const grandTotalFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD54F' },
    };
    const thin = { style: 'thin' };
    const medium = { style: 'medium' };
    const thinBorder = {
      top: thin,
      left: thin,
      bottom: thin,
      right: thin,
    };

    const applyRowBorders = (row, startCol, endCol, opts = {}) => {
      const { top = false, bottom = true, bottomStyle = 'thin' } = opts;
      const bottomBorder = bottomStyle === 'medium' ? medium : thin;
      for (let col = startCol; col <= endCol; col++) {
        const cell = row.getCell(col);
        cell.border = {
          left: thin,
          right: thin,
          ...(top && { top: thin }),
          ...(bottom && { bottom: bottomBorder }),
        };
      }
    };

    const styleCell = (cell, opts = {}) => {
      const borderType = opts.borderType || 'full';
      if (borderType === 'full') {
        cell.border = thinBorder;
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: opts.align || 'center',
        wrapText: true,
      };
      if (opts.bold) cell.font = { bold: true, size: opts.size || 10 };
      if (opts.fill) cell.fill = opts.fill;
      if (opts.numFmt) cell.numFmt = opts.numFmt;
    };

    const styleRow = (row, opts = {}) => {
      row.eachCell({ includeEmpty: true }, (cell) => styleCell(cell, opts));
    };

    // ── Row 1: Title ──────────────────────────────────────────────────────────
    const titleRow = ws.addRow(['Inward Log Further Process Report']);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
    titleRow.height = 22;
    ws.mergeCells(1, 1, 1, totalCols);

    // ── Row 2: Date range ─────────────────────────────────────────────────────
    const dateRangeRow = ws.addRow([
      `Date: ${fmt(startDate)}  To  ${fmt(endDate)}`,
    ]);
    dateRangeRow.font = { size: 10 };
    dateRangeRow.alignment = { vertical: 'middle', horizontal: 'left' };
    dateRangeRow.height = 16;
    ws.mergeCells(2, 1, 2, totalCols);

    // ── Row 3: Filter label (only when inward_id or log_no is provided) ───────
    const filterLabel = filter.inward_id
      ? `Inward Id :- ${filter.inward_id}`
      : filter.log_no
        ? `Log No :- ${filter.log_no}`
        : '';
    const filterRow = ws.addRow([filterLabel]);
    filterRow.font = { size: 10 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left' };
    filterRow.height = 16;
    ws.mergeCells(3, 1, 3, totalCols);

    // ── Row 4: Section group headers ─────────────────────────────────────────
    const secHdr = activeCols.map(c => c.groupHdr || '');
    const groupRow = ws.addRow(secHdr);
    groupRow.height = 22;
    styleRow(groupRow, { bold: true, fill: headerFill });

    // Merge section header spans dynamically
    let startCol = 1;
    while (startCol <= totalCols) {
      const headerName = secHdr[startCol - 1];
      if (headerName && headerName !== '') {
        let endCol = startCol;
        while (endCol < totalCols && secHdr[endCol] === headerName) {
          endCol++;
        }
        if (endCol > startCol) {
          ws.mergeCells(4, startCol, 4, endCol);
        }
        startCol = endCol + 1;
      } else {
        startCol++;
      }
    }

    // ── Row 5: Column headers ─────────────────────────────────────────────────
    const colHdr = activeCols.map(c => c.colHdr);
    const headerRow = ws.addRow(colHdr);
    headerRow.height = 36;
    styleRow(headerRow, { bold: true, fill: headerFill });

    // ── Dynamic column index mapping ─────────────────────────────────────────
    const ITEM_COLS = [];
    const LOG_COLS = [];
    const CC_COLS = [];
    const FLITCH_COLS = [];
    const SIDE_COLS = [];
    const NUMERIC_COLS = new Set();

    activeCols.forEach((col, idx) => {
      const colNum = idx + 1;
      if (col.isNumeric) {
        NUMERIC_COLS.add(colNum);
      }
      if (col.mergeGroup === 'item') ITEM_COLS.push(colNum);
      else if (col.mergeGroup === 'log') LOG_COLS.push(colNum);
      else if (col.mergeGroup === 'cc') CC_COLS.push(colNum);
      else if (col.mergeGroup === 'flitch') FLITCH_COLS.push(colNum);
      else if (col.mergeGroup === 'side') SIDE_COLS.push(colNum);
    });

    const toCells = (row) => {
      return activeCols.map(col => {
        if (col.key === 'fitch_amount') {
          return row.fitch_amount ?? row.flitch_amount ?? '';
        }
        if (col.key === 'fitch_expense_amount') {
          return row.fitch_expense_amount ?? row.flitch_expense_amount ?? '';
        }
        return row[col.key] ?? '';
      });
    };

    // ── Build row values array from data ──────────────────────────────────────
    const merges = []; // { startRow, endRow, col }

    // Per-log and per-item total accumulators
    // We group rows by item_name then by log_no
    const itemGroups = new Map(); // item_name → { logGroups: Map<log_no, rows[]> }

    for (const row of logData) {
      const item = row.item_name;
      const log = row.log_no;
      if (!itemGroups.has(item)) {
        itemGroups.set(item, { logGroups: new Map() });
      }
      const ig = itemGroups.get(item);
      if (!ig.logGroups.has(log)) {
        ig.logGroups.set(log, []);
      }
      ig.logGroups.get(log).push(row);
    }

    // Helper: accumulate numeric values into totals object
    const accumulate = (totals, cells) => {
      NUMERIC_COLS.forEach((colIdx1) => {
        const key = `c${colIdx1}`;
        const v = parseFloat(cells[colIdx1 - 1]);
        if (!isNaN(v)) totals[key] = (totals[key] || 0) + v;
      });
    };

    // Helper: add a styled total row
    const addTotalRow = (label, totals, fill, dataRows) => {
      const cells = new Array(totalCols).fill('');
      cells[0] = label[0];
      cells[1] = label[1] || '';
      NUMERIC_COLS.forEach((colIdx1) => {
        const key = `c${colIdx1}`;
        if (totals[key] != null) {
          cells[colIdx1 - 1] = parseFloat(totals[key].toFixed(3));
        }
      });

      const wsRow = ws.addRow(cells);
      wsRow.height = 18;
      wsRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        styleCell(cell, {
          bold: true,
          fill,
          align: NUMERIC_COLS.has(colNum) ? 'right' : 'left',
          numFmt: NUMERIC_COLS.has(colNum) ? numFmt : undefined,
        });
      });
      const isGrandTotal = label[0] === 'Total' && label[1] === '';
      applyRowBorders(wsRow, 1, totalCols, {
        top: true,
        bottom: true,
        bottomStyle: isGrandTotal ? 'medium' : 'thin',
      });
      return wsRow.number;
    };

    // ── Write data rows grouped by item → log ────────────────────────────────
    const grandTotals = {};

    for (const [itemName, ig] of itemGroups) {
      const itemTotals = {};

      for (const [logNo, rows] of ig.logGroups) {
        // Track merge start rows for this log's data
        let curMItem = null;
        let curMLog = null;
        let curMCc = null;
        let curMFlitch = null;
        let curMSide = null;

        let pItem = Symbol(); // unique sentinels to force "new" on first row
        let pLog = Symbol();
        let pCc = Symbol();
        let pFlitch = Symbol();
        let pSide = Symbol();

        for (const row of rows) {
          const curItem = row.item_name;
          const curLog = row.log_no;
          const curCc = row.cc_log_no || '__EMPTY__';
          const curFlitch = row.flitch_no || '__EMPTY__';
          const curSide = row.slicing_side || row.peeling_process || '__EMPTY__';

          const wsRowNum = ws.lastRow ? ws.lastRow.number + 1 : 6;

          // Determine which parent groups changed
          const newItem = curItem !== pItem;
          const newLog = curLog !== pLog || newItem;
          const newCc = curCc !== pCc || newLog;
          const newFlitch = curFlitch !== pFlitch || newCc;
          const newSide = curSide !== pSide || newFlitch;

          // Close previous merges for groups that changed
          if (newItem && curMItem) { merges.push(...ITEM_COLS.map(c => ({ startRow: curMItem.startRow, endRow: wsRowNum - 1, col: c }))); curMItem = null; }
          if (newLog && curMLog) { merges.push(...LOG_COLS.map(c => ({ startRow: curMLog.startRow, endRow: wsRowNum - 1, col: c }))); curMLog = null; }
          if (newCc && curMCc) { merges.push(...CC_COLS.map(c => ({ startRow: curMCc.startRow, endRow: wsRowNum - 1, col: c }))); curMCc = null; }
          if (newFlitch && curMFlitch) { merges.push(...FLITCH_COLS.map(c => ({ startRow: curMFlitch.startRow, endRow: wsRowNum - 1, col: c }))); curMFlitch = null; }
          if (newSide && curMSide) { merges.push(...SIDE_COLS.map(c => ({ startRow: curMSide.startRow, endRow: wsRowNum - 1, col: c }))); curMSide = null; }

          // Build cell values — blank out parent columns for non-first rows
          const cells = toCells(row);
          if (!newItem) { ITEM_COLS.forEach(c => { cells[c - 1] = ''; }); }
          if (!newLog) { LOG_COLS.forEach(c => { cells[c - 1] = ''; }); }
          if (!newCc) { CC_COLS.forEach(c => { cells[c - 1] = ''; }); }
          if (!newFlitch) { FLITCH_COLS.forEach(c => { cells[c - 1] = ''; }); }
          if (!newSide) { SIDE_COLS.forEach(c => { cells[c - 1] = ''; }); }

          // Write the worksheet row
          const wsRow = ws.addRow(cells);
          wsRow.height = 16;
          wsRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
            styleCell(cell, {
              align: NUMERIC_COLS.has(colNum) ? 'right' : 'left',
              numFmt: NUMERIC_COLS.has(colNum) ? numFmt : undefined,
              borderType: 'data',
            });
          });
          applyRowBorders(wsRow, 1, totalCols, { top: false, bottom: true });

          // Accumulate totals (only first row of each parent group for parent cols)
          const fullCells = toCells(row); // un-blanked
          accumulate(itemTotals, fullCells);
          accumulate(grandTotals, fullCells);

          // Open new merge groups
          if (newItem) curMItem = { startRow: wsRowNum };
          if (newLog) curMLog = { startRow: wsRowNum };
          if (newCc) curMCc = { startRow: wsRowNum };
          if (newFlitch) curMFlitch = { startRow: wsRowNum };
          if (newSide) curMSide = { startRow: wsRowNum };

          pItem = curItem;
          pLog = curLog;
          pCc = curCc;
          pFlitch = curFlitch;
          pSide = curSide;
        }

        // Close any open merge groups at end of this log's rows
        const lastDataRow = ws.lastRow.number;
        if (curMItem) merges.push(...ITEM_COLS.map(c => ({ startRow: curMItem.startRow, endRow: lastDataRow, col: c })));
        if (curMLog) merges.push(...LOG_COLS.map(c => ({ startRow: curMLog.startRow, endRow: lastDataRow, col: c })));
        if (curMCc) merges.push(...CC_COLS.map(c => ({ startRow: curMCc.startRow, endRow: lastDataRow, col: c })));
        if (curMFlitch) merges.push(...FLITCH_COLS.map(c => ({ startRow: curMFlitch.startRow, endRow: lastDataRow, col: c })));
        if (curMSide) merges.push(...SIDE_COLS.map(c => ({ startRow: curMSide.startRow, endRow: lastDataRow, col: c })));
      }

      // Per-item total row
      addTotalRow(
        [`Total ${itemName}`, ''],
        itemTotals,
        totalFill,
        []
      );
    }

    // ── Grand total row ───────────────────────────────────────────────────────
    addTotalRow(['Total', ''], grandTotals, grandTotalFill, []);

    // ── Apply vertical cell merges ────────────────────────────────────────────
    for (const m of merges) {
      if (m.startRow < m.endRow) {
        try {
          ws.mergeCells(m.startRow, m.col, m.endRow, m.col);
          const cell = ws.getCell(m.startRow, m.col);
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left',
            wrapText: true,
          };
        } catch {
          // Ignore overlap errors
        }
      }
    }

    // ── Save file ─────────────────────────────────────────────────────────────
    const timestamp = Date.now();
    const fileName = `Log-Item-Further-Process-Report-${timestamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Log item further process report generated =>', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating log item further process report:', error);
    throw new ApiError(500, error.message, error);
  }
};
