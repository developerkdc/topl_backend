import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Inward Log Item Further Process Report Excel
 *
 * 56 columns across 16 section groups:
 *  Col 1        : Item Name
 *  Cols  2- 6   : Inward in(CMT)
 *  Cols  7-10   : Cross Cut Issue in(CMT)
 *  Cols 11-14   : Flitch Issue in(CMT)
 *  Cols 15-18   : Slicing Issue in(CMT)
 *  Cols 19-22   : Peeling
 *  Cols 23-25   : Dressing
 *  Cols 26-28   : Smoking/Dying
 *  Cols 29-36   : Clipping/Grouping
 *  Cols 37-43   : Splicing
 *  Cols 44-50   : Pressing
 *  Cols 51-52   : CNC
 *  Col  53      : COLOUR
 *  Col  54      : Sales
 *  Col  55      : Job Work Challan
 *  Col  56      : Adv Work Challan
 *
 * Rows are one per leaf entity (grouping item / peeling item / slicing side).
 * Parent columns are merged vertically for consecutive identical keys.
 */
export const createLogItemFurtherProcessReportExcel = async (
  logData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
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

    // ── Column definitions (56 total) ────────────────────────────────────────
    ws.columns = [
      { key: 'item_name',               width: 22 },  // 1
      { key: 'log_no',                  width: 13 },  // 2
      { key: 'indian_cmt',              width: 11 },  // 3
      { key: 'rece_cmt',                width: 10 },  // 4
      { key: 'inward_issue_for',        width: 14 },  // 5
      { key: 'inward_issue_status',     width: 12 },  // 6
      { key: 'cc_log_no',               width: 14 },  // 7
      { key: 'cc_rec',                  width: 10 },  // 8
      { key: 'cc_issue_for',            width: 14 },  // 9
      { key: 'cc_status',               width: 11 },  // 10
      { key: 'flitch_no',               width: 13 },  // 11
      { key: 'flitch_rec',              width: 10 },  // 12
      { key: 'flitch_issue_for',        width: 14 },  // 13
      { key: 'flitch_status',           width: 11 },  // 14
      { key: 'slicing_side',            width: 13 },  // 15
      { key: 'slicing_process_cmt',     width: 12 },  // 16
      { key: 'slicing_balance_cmt',     width: 12 },  // 17
      { key: 'slicing_rec_leaf',        width: 12 },  // 18
      { key: 'peeling_process',         width: 12 },  // 19
      { key: 'peeling_balance_rostroller', width: 14 }, // 20
      { key: 'peeling_output',          width: 12 },  // 21
      { key: 'peeling_rec_leaf',        width: 12 },  // 22
      { key: 'dress_rec_sqm',           width: 12 },  // 23
      { key: 'dress_issue_sqm',         width: 12 },  // 24
      { key: 'dress_issue_status',      width: 13 },  // 25
      { key: 'smoking_process',         width: 12 },  // 26
      { key: 'smoking_issue_sqm',       width: 12 },  // 27
      { key: 'smoking_issue_status',    width: 13 },  // 28
      { key: 'grouping_new_group_no',   width: 16 },  // 29
      { key: 'grouping_rec_sheets',     width: 12 },  // 30
      { key: 'grouping_rec_sqm',        width: 12 },  // 31
      { key: 'grouping_issue_sheets',   width: 12 },  // 32
      { key: 'grouping_issue_sqm',      width: 12 },  // 33
      { key: 'grouping_issue_status',   width: 13 },  // 34
      { key: 'grouping_balance_sheets', width: 14 },  // 35
      { key: 'grouping_balance_sqm',    width: 14 },  // 36
      { key: 'splicing_rec_machine_sqm',width: 16 },  // 37
      { key: 'splicing_rec_hand_sqm',   width: 16 },  // 38
      { key: 'splicing_sheets',         width: 14 },  // 39
      { key: 'splicing_issue_sheets',   width: 14 },  // 40
      { key: 'splicing_issue_status',   width: 13 },  // 41
      { key: 'splicing_balance_sheets', width: 15 },  // 42
      { key: 'splicing_balance_sqm',    width: 15 },  // 43
      { key: 'pressing_sheets',         width: 14 },  // 44
      { key: 'pressing_sqm',            width: 13 },  // 45
      { key: 'pressing_issue_sheets',   width: 14 },  // 46
      { key: 'pressing_issue_sqm',      width: 14 },  // 47
      { key: 'pressing_issue_status',   width: 13 },  // 48
      { key: 'pressing_balance_sheets', width: 15 },  // 49
      { key: 'pressing_balance_sqm',    width: 15 },  // 50
      { key: 'cnc_type',                width: 13 },  // 51
      { key: 'cnc_rec_sheets',          width: 12 },  // 52
      { key: 'colour_rec_sheets',       width: 12 },  // 53
      { key: 'sales_rec_sheets',        width: 16 },  // 54 — order line CBM / SQM
      { key: 'jwc_veneer',              width: 12 },  // 55
      { key: 'awc_pressing_sheets',     width: 16 },  // 56
    ];

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
      // 'data' and 'total' borders applied via applyRowBorders
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
    ws.mergeCells(1, 1, 1, 56);

    // ── Row 2: Date range ─────────────────────────────────────────────────────
    const dateRangeRow = ws.addRow([
      `Date: ${fmt(startDate)}  To  ${fmt(endDate)}`,
    ]);
    dateRangeRow.font = { size: 10 };
    dateRangeRow.alignment = { vertical: 'middle', horizontal: 'left' };
    dateRangeRow.height = 16;
    ws.mergeCells(2, 1, 2, 56);

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
    ws.mergeCells(3, 1, 3, 56);

    // ── Row 3: Section group headers ─────────────────────────────────────────
    //  The row values map to column positions 1..56.
    //  We'll fill col 1 with '' and put the section label at the FIRST column
    //  of each section (others remain '').
    const secHdr = new Array(56).fill('');
    secHdr[0]  = '';                    // 1  Item Name – no group label
    secHdr[1]  = 'Inward in(CMT)';     // 2-6
    secHdr[6]  = 'Cross Cut Issue in(CMT)'; // 7-10
    secHdr[10] = 'Flitch Issue in(CMT)';    // 11-14
    secHdr[14] = 'Slicing Issue in(CMT)';   // 15-18
    secHdr[18] = 'Peeling';                  // 19-22
    secHdr[22] = 'Dressing';                 // 23-25
    secHdr[25] = 'Smoking/Dying';            // 26-28
    secHdr[28] = 'Clipping/Grouping';        // 29-36
    secHdr[36] = 'Splicing';                 // 37-43
    secHdr[43] = 'Pressing';                 // 44-50
    secHdr[50] = 'CNC';                      // 51-52
    secHdr[52] = 'COLOUR';                   // 53
    secHdr[53] = 'Sales';                    // 54
    secHdr[54] = 'Job Work Challan';         // 55
    secHdr[55] = 'Adv Work Challan';         // 56

    const groupRow = ws.addRow(secHdr);
    groupRow.height = 22;
    styleRow(groupRow, { bold: true, fill: headerFill });

    // Merge section header spans
    ws.mergeCells(4,  2,  4,  6);   // Inward in(CMT)
    ws.mergeCells(4,  7,  4, 10);   // Cross Cut Issue in(CMT)
    ws.mergeCells(4, 11,  4, 14);   // Flitch Issue in(CMT)
    ws.mergeCells(4, 15,  4, 18);   // Slicing Issue in(CMT)
    ws.mergeCells(4, 19,  4, 22);   // Peeling
    ws.mergeCells(4, 23,  4, 25);   // Dressing
    ws.mergeCells(4, 26,  4, 28);   // Smoking/Dying
    ws.mergeCells(4, 29,  4, 36);   // Clipping/Grouping
    ws.mergeCells(4, 37,  4, 43);   // Splicing
    ws.mergeCells(4, 44,  4, 50);   // Pressing
    ws.mergeCells(4, 51,  4, 52);   // CNC

    // ── Row 4: Column headers ─────────────────────────────────────────────────
    const colHdr = [
      'Item Name',                         // 1
      'LogNo',                             // 2
      'Indian CMT',                        // 3
      'RECE CMT',                          // 4
      'Issue For Cross cut/Flitch/Peeling/Sales', // 5
      'Issue Status',                      // 6
      'Cross Cut Log No',                  // 7
      'CC REC',                            // 8
      'Issue For Flitch/Peeling',          // 9
      'Status',                            // 10
      'Log No code',                       // 11
      'REC',                               // 12
      'Issue For Slicing/Peeling',         // 13
      'Status',                            // 14
      'Side',                              // 15
      'Process Cmt',                       // 16
      'Balance Cmt',                       // 17
      'REC (Leaf)',                         // 18
      'Process',                           // 19
      'Balance Rostroller',                // 20
      'Output',                            // 21
      'Rec (Leaf)',                         // 22
      'Rec Sq. Mtr.',                      // 23
      'Issue (Sq.Mtr.)',                   // 24
      'Issue Status',                      // 25
      'Process',                           // 26
      'Issue (Sq.Mtr.)',                   // 27
      'Issue Status',                      // 28
      'New Group Number',                  // 29
      'Rec Sheets',                        // 30
      'Rec Sq.Mtr.',                       // 31
      'Issue (Sheets)',                    // 32
      'Issue (Sq.Mtr.)',                   // 33
      'Issue Status',                      // 34
      'Balance (Sheets)',                  // 35
      'Balance Sq. Mtr.',                  // 36
      'Rec Machine (Sq.mtr.)',             // 37
      'Rec Hand (Sq.Mtr.)',               // 38
      'Splicing Sheets',                   // 39
      'Issue (Sheets)',                    // 40
      'Issue Status',                      // 41
      'Balance (Sheets)',                  // 42
      'Balance (Sq. Mtr.)',               // 43
      'Pressing (Sheets)',                 // 44
      'Pressing (Sq.mtr.)',               // 45
      'Issue (Sheets)',                    // 46
      'Issue (Sq. Mtr.)',                  // 47
      'Issue Status',                      // 48
      'Balance (Sheets)',                  // 49
      'Balance (Sq. Mtr.)',               // 50
      'Cnc Type',                          // 51
      'REC (Sheets)',                      // 52
      'REC (Sheets)',                      // 53
      'Order (CBM / SQM)',                 // 54
      'Veneer',                            // 55
      'Pressing Sheets',                   // 56
    ];

    const headerRow = ws.addRow(colHdr);
    headerRow.height = 36;
    styleRow(headerRow, { bold: true, fill: headerFill });

    // ── Numeric column indices (1-based) used for totals ─────────────────────
    // These columns are summed in total rows.
    const NUMERIC_COLS = new Set([
      3, 4, 5,          // indian_cmt, rece_cmt, inward_issue_for
      8, 9,             // cc_rec, cc_issue_for
      12, 13,           // flitch_rec, flitch_issue_for
      18,               // slicing_rec_leaf
      22,               // peeling_rec_leaf
      23, 24,           // dress_rec_sqm, dress_issue_sqm
      27,               // smoking_issue_sqm
      30, 31, 32, 33, 35, 36,   // grouping
      37, 38, 39, 40, 42, 43,   // splicing
      44, 45, 46, 47, 49, 50,   // pressing
      52, 53,                  // cnc, colour (sales col 54 is text: CBM/SQM)
    ]);

    // Columns to MERGE vertically (parent-level columns)
    // Col 1: item_name
    // Cols 2-6: log-level
    // Cols 7-10: crosscut-level
    // Cols 11-14: flitch-level
    // Cols 15-18, 23-28: slicing-side-level
    const ITEM_COLS   = [1];
    const LOG_COLS    = [2, 3, 4, 5, 6];
    const CC_COLS     = [7, 8, 9, 10];
    const FLITCH_COLS = [11, 12, 13, 14];
    const SIDE_COLS   = [15, 16, 17, 18, 23, 24, 25, 26, 27, 28];

    // ── Build row values array from data ──────────────────────────────────────
    // Track "previous" keys to handle merging and first-occurrence display
    let prevItem    = null;
    let prevLog     = null;
    let prevCc      = null;
    let prevFlitch  = null;
    let prevSide    = null;

    // Track merge start rows (1-based worksheet row numbers)
    const merges = []; // { startRow, endRow, startCol, endCol }
    let mItem   = null;
    let mLog    = null;
    let mCc     = null;
    let mFlitch = null;
    let mSide   = null;

    // Grand total accumulators
    const grandTotal = {};

    // Per-item-group rows (for item subtotals after all logs in item group)
    // We'll collect rows in order and insert total rows when item changes.

    // Helper: record a pending merge when a group closes
    const closeMerge = (mergeVar, currentRow, cols) => {
      if (mergeVar && mergeVar.startRow < currentRow - 1) {
        for (const col of cols) {
          merges.push({
            startRow: mergeVar.startRow,
            endRow: currentRow - 1,
            col,
          });
        }
      }
    };

    // Helper: convert row object to cell value array (56 elements, 0-indexed)
    const toCells = (row) => [
      row.item_name,
      row.log_no,
      row.indian_cmt,
      row.rece_cmt,
      row.inward_issue_for,
      row.inward_issue_status,
      row.cc_log_no,
      row.cc_rec,
      row.cc_issue_for,
      row.cc_status,
      row.flitch_no,
      row.flitch_rec,
      row.flitch_issue_for,
      row.flitch_status,
      row.slicing_side,
      row.slicing_process_cmt,
      row.slicing_balance_cmt,
      row.slicing_rec_leaf,
      row.peeling_process,
      row.peeling_balance_rostroller,
      row.peeling_output,
      row.peeling_rec_leaf,
      row.dress_rec_sqm,
      row.dress_issue_sqm,
      row.dress_issue_status,
      row.smoking_process,
      row.smoking_issue_sqm,
      row.smoking_issue_status,
      row.grouping_new_group_no,
      row.grouping_rec_sheets,
      row.grouping_rec_sqm,
      row.grouping_issue_sheets,
      row.grouping_issue_sqm,
      row.grouping_issue_status,
      row.grouping_balance_sheets,
      row.grouping_balance_sqm,
      row.splicing_rec_machine_sqm,
      row.splicing_rec_hand_sqm,
      row.splicing_sheets,
      row.splicing_issue_sheets,
      row.splicing_issue_status,
      row.splicing_balance_sheets,
      row.splicing_balance_sqm,
      row.pressing_sheets,
      row.pressing_sqm,
      row.pressing_issue_sheets,
      row.pressing_issue_sqm,
      row.pressing_issue_status,
      row.pressing_balance_sheets,
      row.pressing_balance_sqm,
      row.cnc_type,
      row.cnc_rec_sheets,
      row.colour_rec_sheets,
      row.sales_rec_sheets,
      row.jwc_veneer,
      row.awc_pressing_sheets,
    ];

    // Per-log and per-item total accumulators
    // We group rows by item_name then by log_no
    const itemGroups = new Map(); // item_name → { logGroups: Map<log_no, rows[]> }

    for (const row of logData) {
      const item = row.item_name;
      const log  = row.log_no;
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
      // Build cell array from totals, only populating numeric columns
      const cells = new Array(56).fill('');
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
      applyRowBorders(wsRow, 1, 56, {
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
      const itemStartRow = ws.lastRow ? ws.lastRow.number + 1 : 6;

      for (const [logNo, rows] of ig.logGroups) {
        const logTotals = {};
        const logStartRow = ws.lastRow ? ws.lastRow.number + 1 : 6;

        // Track merge start rows for this log's data
        let curMItem   = null;
        let curMLog    = null;
        let curMCc     = null;
        let curMFlitch = null;
        let curMSide   = null;

        let pItem   = Symbol(); // unique sentinels to force "new" on first row
        let pLog    = Symbol();
        let pCc     = Symbol();
        let pFlitch = Symbol();
        let pSide   = Symbol();

        for (const row of rows) {
          const curItem   = row.item_name;
          const curLog    = row.log_no;
          const curCc     = row.cc_log_no || '__EMPTY__';
          const curFlitch = row.flitch_no  || '__EMPTY__';
          const curSide   = row.slicing_side || row.peeling_process || '__EMPTY__';

          const wsRowNum = ws.lastRow ? ws.lastRow.number + 1 : 6;

          // Determine which parent groups changed
          const newItem   = curItem   !== pItem;
          const newLog    = curLog    !== pLog   || newItem;
          const newCc     = curCc     !== pCc    || newLog;
          const newFlitch = curFlitch !== pFlitch || newCc;
          const newSide   = curSide   !== pSide  || newFlitch;

          // Close previous merges for groups that changed
          if (newItem   && curMItem)   { merges.push(...ITEM_COLS.map(c => ({ startRow: curMItem.startRow, endRow: wsRowNum - 1, col: c }))); curMItem = null; }
          if (newLog    && curMLog)    { merges.push(...LOG_COLS.map(c => ({ startRow: curMLog.startRow, endRow: wsRowNum - 1, col: c }))); curMLog = null; }
          if (newCc     && curMCc)     { merges.push(...CC_COLS.map(c => ({ startRow: curMCc.startRow, endRow: wsRowNum - 1, col: c }))); curMCc = null; }
          if (newFlitch && curMFlitch) { merges.push(...FLITCH_COLS.map(c => ({ startRow: curMFlitch.startRow, endRow: wsRowNum - 1, col: c }))); curMFlitch = null; }
          if (newSide   && curMSide)   { merges.push(...SIDE_COLS.map(c => ({ startRow: curMSide.startRow, endRow: wsRowNum - 1, col: c }))); curMSide = null; }

          // Build cell values — blank out parent columns for non-first rows
          const cells = toCells(row);
          if (!newItem)   { ITEM_COLS.forEach(c   => { cells[c - 1] = ''; }); }
          if (!newLog)    { LOG_COLS.forEach(c    => { cells[c - 1] = ''; }); }
          if (!newCc)     { CC_COLS.forEach(c     => { cells[c - 1] = ''; }); }
          if (!newFlitch) { FLITCH_COLS.forEach(c => { cells[c - 1] = ''; }); }
          if (!newSide)   { SIDE_COLS.forEach(c   => { cells[c - 1] = ''; }); }

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
          applyRowBorders(wsRow, 1, 56, { top: false, bottom: true });

          // Accumulate totals (only first row of each parent group for parent cols)
          const fullCells = toCells(row); // un-blanked
          accumulate(logTotals, fullCells);
          accumulate(itemTotals, fullCells);
          accumulate(grandTotals, fullCells);

          // Open new merge groups
          if (newItem)   curMItem   = { startRow: wsRowNum };
          if (newLog)    curMLog    = { startRow: wsRowNum };
          if (newCc)     curMCc     = { startRow: wsRowNum };
          if (newFlitch) curMFlitch = { startRow: wsRowNum };
          if (newSide)   curMSide   = { startRow: wsRowNum };

          pItem   = curItem;
          pLog    = curLog;
          pCc     = curCc;
          pFlitch = curFlitch;
          pSide   = curSide;
        }

        // Close any open merge groups at end of this log's rows
        const lastDataRow = ws.lastRow.number;
        if (curMItem)   merges.push(...ITEM_COLS.map(c   => ({ startRow: curMItem.startRow,   endRow: lastDataRow, col: c })));
        if (curMLog)    merges.push(...LOG_COLS.map(c    => ({ startRow: curMLog.startRow,    endRow: lastDataRow, col: c })));
        if (curMCc)     merges.push(...CC_COLS.map(c     => ({ startRow: curMCc.startRow,     endRow: lastDataRow, col: c })));
        if (curMFlitch) merges.push(...FLITCH_COLS.map(c => ({ startRow: curMFlitch.startRow, endRow: lastDataRow, col: c })));
        if (curMSide)   merges.push(...SIDE_COLS.map(c   => ({ startRow: curMSide.startRow,   endRow: lastDataRow, col: c })));

        // Per-log total row
        addTotalRow(
          ['', `Total ${logNo}`],
          logTotals,
          totalFill,
          rows
        );
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
          // Align merged cell value to top-center
          const cell = ws.getCell(m.startRow, m.col);
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left',
            wrapText: true,
          };
        } catch {
          // Ignore overlapping merge errors (can happen with edge cases)
        }
      }
    }

    // ── Save file ─────────────────────────────────────────────────────────────
    const timestamp = Date.now();
    const fileName  = `Log-Item-Further-Process-Report-${timestamp}.xlsx`;
    const filePath  = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Log item further process report generated =>', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating log item further process report:', error);
    throw new ApiError(500, error.message, error);
  }
};
