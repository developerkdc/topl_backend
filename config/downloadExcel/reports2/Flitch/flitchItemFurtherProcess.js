import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Flitch Item Further Process Report Excel
 *
 * totalCols columns across 12 section groups:
 *  Col  1        : Item Name
 *  Cols  2- 5   : Flitch Inward in(CMT) → LogNo (original log_no), REC CMT, Issue For Slicing/Peeling/Sales, Issue Status
 *  Cols  6- 9   : Slicing Issue in(CMT) → Side, Process Cmt, Balance Cmt, REC (Leaf)
 *  Cols 10-12   : Dressing              → Rec Sq. Mtr., Issue (Sq.Mtr.), Issue Status
 *  Cols 13-15   : Smoking/Dying         → total SQM processed, issued SQM, issue status (issued rows only)
 *  Cols 16-23   : Clipping/Grouping     → New Group Number, Rec Sheets, Rec Sq.Mtr.,
 *                                          Issue (Sheets), Issue (Sq.Mtr.), Issue Status,
 *                                          Balance (Sheets), Balance Sq. Mtr.
 *  Cols 24-30   : Splicing              → Rec Machine (Sq.mtr.), Rec Hand (Sq.Mtr.),
 *                                          Splicing Sheets, Issue (Sheets), Issue Status,
 *                                          Balance (Sheets), Balance (Sq. Mtr.)
 *  Cols 31-37   : Pressing              → Pressing (Sheets), Pressing (Sq.mtr.),
 *                                          Issue (Sheets), Issue (Sq. Mtr.), Issue Status,
 *                                          Balance (Sheets), Balance (Sq. Mtr.)
 *  Cols 38-39   : CNC                   → Cnc Type, REC (Sheets)
 *  Col  40      : COLOUR                → REC (Sheets)
 *  Col  totalCols      : Sales                 → Order line CBM or SQM
 *
 * Rows are one per leaf entity (grouping item / slicing side).
 * Parent columns are merged vertically for consecutive identical keys.
 */
export const createFlitchItemFurtherProcessReportExcel = async (
  flitchData,
  startDate,
  endDate,
  filter = {},
  includeCostAndExpense = false
) => {

  const showCost = includeCostAndExpense === true || includeCostAndExpense === 'true' || filter?.includeCostAndExpense === true || filter?.includeCostAndExpense === 'true';

  try {
    const folderPath = 'public/upload/reports/reports2/Flitch';
    try {
      await fs.access(folderPath);
    } catch {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const ws = workbook.addWorksheet('Flitch Further Process', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }],
    });

    // ── Column definitions (totalCols total) ────────────────────────────────────────
    const activeCols = [
      { key: 'item_name', width: 22, colHdr: 'Item Name', groupHdr: '', mergeGroup: 'item' },
      { key: 'log_no', width: 14, colHdr: 'LogNo', groupHdr: 'Flitch Inward in(CMT)', mergeGroup: 'flitch' },
      { key: 'rece_cmt', width: 11, colHdr: 'REC CMT', groupHdr: 'Flitch Inward in(CMT)', mergeGroup: 'flitch', isNumeric: true },
      { key: 'issue_for', width: 14, colHdr: 'Issue For Slicing/Peeling/Sales', groupHdr: 'Flitch Inward in(CMT)', mergeGroup: 'flitch', isNumeric: true },
      { key: 'issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Flitch Inward in(CMT)', mergeGroup: 'flitch' },

      { key: 'slicing_side', width: 14, colHdr: 'Side', groupHdr: 'Slicing Issue in(CMT)', mergeGroup: 'side' },
      { key: 'slicing_process_cmt', width: 12, colHdr: 'Process Cmt', groupHdr: 'Slicing Issue in(CMT)', mergeGroup: 'side', isNumeric: true },
      { key: 'slicing_balance_cmt', width: 12, colHdr: 'Balance Cmt', groupHdr: 'Slicing Issue in(CMT)', mergeGroup: 'side', isNumeric: true },
      { key: 'slicing_rec_leaf', width: 12, colHdr: 'REC (Leaf)', groupHdr: 'Slicing Issue in(CMT)', mergeGroup: 'side', isNumeric: true },

      ...(showCost ? [
        { key: 'slicing_amount', width: 12, colHdr: 'Amount', groupHdr: 'Slicing Issue in(CMT)', isNumeric: true },
        { key: 'slicing_expense_amount', width: 12, colHdr: 'Expense', groupHdr: 'Slicing Issue in(CMT)', isNumeric: true },
      ] : []),

      { key: 'dress_rec_sqm', width: 12, colHdr: 'Rec Sq. Mtr.', groupHdr: 'Dressing', isNumeric: true },
      { key: 'dress_issue_sqm', width: 12, colHdr: 'Issue (Sq.Mtr.)', groupHdr: 'Dressing', isNumeric: true },
      { key: 'dress_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Dressing' },

      ...(showCost ? [
        { key: 'dress_amount', width: 12, colHdr: 'Amount', groupHdr: 'Dressing', isNumeric: true },
        { key: 'dress_expense_amount', width: 12, colHdr: 'Expense', groupHdr: 'Dressing', isNumeric: true },
      ] : []),

      { key: 'smoking_process', width: 12, colHdr: 'Process', groupHdr: 'Smoking/Dying' },
      { key: 'smoking_issue_sqm', width: 12, colHdr: 'Issue (Sq.Mtr.)', groupHdr: 'Smoking/Dying', isNumeric: true },
      { key: 'smoking_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Smoking/Dying' },

      ...(showCost ? [
        { key: 'smoking_amount', width: 12, colHdr: 'Amount', groupHdr: 'Smoking/Dying', isNumeric: true },
        { key: 'smoking_expense_amount', width: 12, colHdr: 'Expense', groupHdr: 'Smoking/Dying', isNumeric: true },
      ] : []),

      { key: 'grouping_new_group_no', width: 16, colHdr: 'New Group Number', groupHdr: 'Clipping/Grouping' },
      { key: 'grouping_rec_sheets', width: 12, colHdr: 'Rec Sheets', groupHdr: 'Clipping/Grouping', isNumeric: true },
      { key: 'grouping_rec_sqm', width: 12, colHdr: 'Rec Sq.Mtr.', groupHdr: 'Clipping/Grouping', isNumeric: true },
      { key: 'grouping_issue_sheets', width: 12, colHdr: 'Issue (Sheets)', groupHdr: 'Clipping/Grouping', isNumeric: true },
      { key: 'grouping_issue_sqm', width: 12, colHdr: 'Issue (Sq.Mtr.)', groupHdr: 'Clipping/Grouping', isNumeric: true },
      { key: 'grouping_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Clipping/Grouping' },
      { key: 'grouping_balance_sheets', width: 14, colHdr: 'Balance (Sheets)', groupHdr: 'Clipping/Grouping', isNumeric: true },
      { key: 'grouping_balance_sqm', width: 14, colHdr: 'Balance Sq. Mtr.', groupHdr: 'Clipping/Grouping', isNumeric: true },

      ...(showCost ? [
        { key: 'grouping_amount', width: 12, colHdr: 'Amount', groupHdr: 'Clipping/Grouping', isNumeric: true },
        { key: 'grouping_expense_amount', width: 12, colHdr: 'Expense', groupHdr: 'Clipping/Grouping', isNumeric: true },
      ] : []),

      { key: 'splicing_rec_machine_sqm', width: 16, colHdr: 'Rec Machine (Sq.mtr.)', groupHdr: 'Splicing', isNumeric: true },
      { key: 'splicing_rec_hand_sqm', width: 16, colHdr: 'Rec Hand (Sq.Mtr.)', groupHdr: 'Splicing', isNumeric: true },
      { key: 'splicing_sheets', width: 14, colHdr: 'Splicing Sheets', groupHdr: 'Splicing', isNumeric: true },
      { key: 'splicing_issue_sheets', width: 14, colHdr: 'Issue (Sheets)', groupHdr: 'Splicing', isNumeric: true },
      { key: 'splicing_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Splicing' },
      { key: 'splicing_balance_sheets', width: 15, colHdr: 'Balance (Sheets)', groupHdr: 'Splicing', isNumeric: true },
      { key: 'splicing_balance_sqm', width: 15, colHdr: 'Balance (Sq. Mtr.)', groupHdr: 'Splicing', isNumeric: true },

      ...(showCost ? [
        { key: 'splicing_amount', width: 12, colHdr: 'Amount', groupHdr: 'Splicing', isNumeric: true },
        { key: 'splicing_expense_amount', width: 12, colHdr: 'Expense', groupHdr: 'Splicing', isNumeric: true },
      ] : []),

      { key: 'pressing_sheets', width: 14, colHdr: 'Pressing (Sheets)', groupHdr: 'Pressing', isNumeric: true },
      { key: 'pressing_sqm', width: 13, colHdr: 'Pressing (Sq.mtr.)', groupHdr: 'Pressing', isNumeric: true },
      { key: 'pressing_issue_sheets', width: 14, colHdr: 'Issue (Sheets)', groupHdr: 'Pressing', isNumeric: true },
      { key: 'pressing_issue_sqm', width: 14, colHdr: 'Issue (Sq. Mtr.)', groupHdr: 'Pressing', isNumeric: true },
      { key: 'pressing_issue_status', width: 13, colHdr: 'Issue Status', groupHdr: 'Pressing' },
      { key: 'pressing_balance_sheets', width: 15, colHdr: 'Balance (Sheets)', groupHdr: 'Pressing', isNumeric: true },
      { key: 'pressing_balance_sqm', width: 15, colHdr: 'Balance (Sq. Mtr.)', groupHdr: 'Pressing', isNumeric: true },

      ...(showCost ? [
        { key: 'pressing_amount', width: 12, colHdr: 'Amount', groupHdr: 'Pressing', isNumeric: true },
        { key: 'pressing_expense_amount', width: 12, colHdr: 'Expense', groupHdr: 'Pressing', isNumeric: true },
      ] : []),

      { key: 'cnc_type', width: 13, colHdr: 'Cnc Type', groupHdr: 'CNC' },
      { key: 'cnc_rec_sheets', width: 12, colHdr: 'REC (Sheets)', groupHdr: 'CNC', isNumeric: true },

      ...(showCost ? [
        { key: 'cnc_amount', width: 12, colHdr: 'Amount', groupHdr: 'CNC', isNumeric: true },
        { key: 'cnc_expense_amount', width: 12, colHdr: 'Expense', groupHdr: 'CNC', isNumeric: true },
      ] : []),

      { key: 'colour_rec_sheets', width: 12, colHdr: 'REC (Sheets)', groupHdr: 'COLOUR', isNumeric: true },
      { key: 'sales_order_no', width: 16, colHdr: 'Order (CBM / SQM)', groupHdr: 'Sales', isNumeric: true },
    ];

    ws.columns = activeCols.map(c => ({ key: c.key, width: c.width }));
    const totalCols = activeCols.length;

    const COL_COUNT = totalCols;

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
    const titleRow = ws.addRow(['Flitch Further Process Report']);
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

    // ── Row 3: Filter label (only when inward_id or flitch_no is provided) ────
    const filterLabel = filter.inward_id
      ? `Inward Id :- ${filter.inward_id}`
      : filter.flitch_no
        ? `Flitch Code :- ${filter.flitch_no}`
        : '';
    const filterRow = ws.addRow([filterLabel]);
    filterRow.font = { size: 10 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left' };
    filterRow.height = 16;
    ws.mergeCells(3, 1, 3, totalCols);

    // ── Row 4: Section group headers ──────────────────────────────────────────
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

    const NUMERIC_COLS = new Set();
    const ITEM_COLS = [];
    const FLITCH_COLS = [];
    const SIDE_COLS = [];

    activeCols.forEach((col, idx) => {
      const colNum = idx + 1;
      if (col.isNumeric) {
        NUMERIC_COLS.add(colNum);
      }
      if (col.mergeGroup === 'item') ITEM_COLS.push(colNum);
      else if (col.mergeGroup === 'flitch') FLITCH_COLS.push(colNum);
      else if (col.mergeGroup === 'side') SIDE_COLS.push(colNum);
    });


    // ── Helper: convert row object to cell value array (totalCols elements) ─────────
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

    // ── Helper: accumulate numeric values into totals object ─────────────────
    const accumulate = (totals, cells) => {
      NUMERIC_COLS.forEach((colIdx1) => {
        const key = `c${colIdx1}`;
        const v = parseFloat(cells[colIdx1 - 1]);
        if (!isNaN(v)) totals[key] = (totals[key] || 0) + v;
      });
    };

    // ── Helper: add a styled total row ───────────────────────────────────────
    const addTotalRow = (label, totals, fill) => {
      const cells = new Array(COL_COUNT).fill('');
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
      applyRowBorders(wsRow, 1, COL_COUNT, {
        top: true,
        bottom: true,
        bottomStyle: isGrandTotal ? 'medium' : 'thin',
      });
      return wsRow.number;
    };

    // ── Group data by item_name → log_no (original log number) ───────────────
    const itemGroups = new Map(); // item_name → { flitchGroups: Map<log_no, rows[]> }

    for (const row of flitchData) {
      const item = row.item_name;
      const fno = row.log_no;
      if (!itemGroups.has(item)) {
        itemGroups.set(item, { flitchGroups: new Map() });
      }
      const ig = itemGroups.get(item);
      if (!ig.flitchGroups.has(fno)) {
        ig.flitchGroups.set(fno, []);
      }
      ig.flitchGroups.get(fno).push(row);
    }

    // ── Write data rows grouped by item → flitch ─────────────────────────────
    const grandTotals = {};
    const merges = [];

    for (const [itemName, ig] of itemGroups) {
      const itemTotals = {};

      for (const [flitchNo, rows] of ig.flitchGroups) {
        let curMItem = null;
        let curMFlitch = null;
        let curMSide = null;

        let pItem = Symbol();
        let pFlitch = Symbol();
        let pSide = Symbol();

        for (const row of rows) {
          const curItem = row.item_name;
          const curFlitch = row.log_no || '__EMPTY__';
          const curSide = row.slicing_side || row.peeling_process || '__EMPTY__';

          const wsRowNum = ws.lastRow ? ws.lastRow.number + 1 : 6;

          const newItem = curItem !== pItem;
          const newFlitch = curFlitch !== pFlitch || newItem;
          const newSide = curSide !== pSide || newFlitch;

          // Close previous merges for groups that changed
          if (newItem && curMItem) { merges.push(...ITEM_COLS.map(c => ({ startRow: curMItem.startRow, endRow: wsRowNum - 1, col: c }))); curMItem = null; }
          if (newFlitch && curMFlitch) { merges.push(...FLITCH_COLS.map(c => ({ startRow: curMFlitch.startRow, endRow: wsRowNum - 1, col: c }))); curMFlitch = null; }
          if (newSide && curMSide) { merges.push(...SIDE_COLS.map(c => ({ startRow: curMSide.startRow, endRow: wsRowNum - 1, col: c }))); curMSide = null; }

          // Build cell values — blank out parent columns for non-first rows
          const cells = toCells(row);
          if (!newItem) { ITEM_COLS.forEach(c => { cells[c - 1] = ''; }); }
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
          applyRowBorders(wsRow, 1, COL_COUNT, { top: false, bottom: true });

          // Accumulate totals using full (un-blanked) values
          const fullCells = toCells(row);
          accumulate(itemTotals, fullCells);
          accumulate(grandTotals, fullCells);

          // Open new merge groups
          if (newItem) curMItem = { startRow: wsRowNum };
          if (newFlitch) curMFlitch = { startRow: wsRowNum };
          if (newSide) curMSide = { startRow: wsRowNum };

          pItem = curItem;
          pFlitch = curFlitch;
          pSide = curSide;
        }

        // Close any open merge groups at end of this flitch's rows
        const lastDataRow = ws.lastRow.number;
        if (curMItem) merges.push(...ITEM_COLS.map(c => ({ startRow: curMItem.startRow, endRow: lastDataRow, col: c })));
        if (curMFlitch) merges.push(...FLITCH_COLS.map(c => ({ startRow: curMFlitch.startRow, endRow: lastDataRow, col: c })));
        if (curMSide) merges.push(...SIDE_COLS.map(c => ({ startRow: curMSide.startRow, endRow: lastDataRow, col: c })));
      }

      // Per-item total row
      addTotalRow([`Total ${itemName}`, ''], itemTotals, totalFill);
    }

    // ── Grand total row ───────────────────────────────────────────────────────
    addTotalRow(['Total', ''], grandTotals, grandTotalFill);

    // ── Apply vertical cell merges ────────────────────────────────────────────
    for (const m of merges) {
      if (m.startRow < m.endRow) {
        try {
          ws.mergeCells(m.startRow, m.col, m.endRow, m.col);
          const cell = ws.getCell(m.startRow, m.col);
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } catch {
          // Ignore overlapping merge errors
        }
      }
    }

    // ── Save file ─────────────────────────────────────────────────────────────
    const timestamp = Date.now();
    const fileName = `Flitch-Item-Further-Process-Report-${timestamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Flitch item further process report generated =>', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating flitch item further process report:', error);
    throw new ApiError(500, error.message, error);
  }
};
