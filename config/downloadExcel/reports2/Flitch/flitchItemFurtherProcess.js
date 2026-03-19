import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Flitch Item Further Process Report Excel
 *
 * 47 columns across 14 section groups:
 *  Col  1        : Item Name
 *  Cols  2- 5   : Flitch Inward in(CMT) → Flitch No., REC CMT, Issue For Slicing/Peeling/Sales, Issue Status
 *  Cols  6- 9   : Slicing Issue in(CMT) → Side, Process Cmt, Balance Cmt, REC (Leaf)
 *  Cols 10-13   : Peeling               → Process, Balance Rostroller, Output, Rec (Leaf)
 *  Cols 14-16   : Dressing              → Rec Sq. Mtr., Issue (Sq.Mtr.), Issue Status
 *  Cols 17-19   : Smoking/Dying         → Process, Issue (Sq.Mtr.), Issue Status
 *  Cols 20-27   : Clipping/Grouping     → New Group Number, Rec Sheets, Rec Sq.Mtr.,
 *                                          Issue (Sheets), Issue (Sq.Mtr.), Issue Status,
 *                                          Balance (Sheets), Balance Sq. Mtr.
 *  Cols 28-34   : Splicing              → Rec Machine (Sq.mtr.), Rec Hand (Sq.Mtr.),
 *                                          Splicing Sheets, Issue (Sheets), Issue Status,
 *                                          Balance (Sheets), Balance (Sq. Mtr.)
 *  Cols 35-41   : Pressing              → Pressing (Sheets), Pressing (Sq.mtr.),
 *                                          Issue (Sheets), Issue (Sq. Mtr.), Issue Status,
 *                                          Balance (Sheets), Balance (Sq. Mtr.)
 *  Cols 42-43   : CNC                   → Cnc Type, REC (Sheets)
 *  Col  44      : COLOUR                → REC (Sheets)
 *  Col  45      : Sales                 → REC (Sheets)
 *  Col  46      : Job Work Challan      → Veneer
 *  Col  47      : Adv Work Challan      → Pressing Sheets
 *
 * Rows are one per leaf entity (grouping item / peeling item / slicing side).
 * Parent columns are merged vertically for consecutive identical keys.
 */
export const createFlitchItemFurtherProcessReportExcel = async (
  flitchData,
  startDate,
  endDate,
  filter = {}
) => {
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

    // ── Column definitions (47 total) ────────────────────────────────────────
    ws.columns = [
      { key: 'item_name',               width: 22 },  //  1
      { key: 'flitch_no',               width: 14 },  //  2
      { key: 'rece_cmt',                width: 11 },  //  3
      { key: 'issue_for',               width: 14 },  //  4
      { key: 'issue_status',            width: 13 },  //  5
      { key: 'slicing_side',            width: 14 },  //  6
      { key: 'slicing_process_cmt',     width: 12 },  //  7
      { key: 'slicing_balance_cmt',     width: 12 },  //  8
      { key: 'slicing_rec_leaf',        width: 12 },  //  9
      { key: 'peeling_process',         width: 12 },  // 10
      { key: 'peeling_balance_rostroller', width: 14 }, // 11
      { key: 'peeling_output',          width: 12 },  // 12
      { key: 'peeling_rec_leaf',        width: 12 },  // 13
      { key: 'dress_rec_sqm',           width: 12 },  // 14
      { key: 'dress_issue_sqm',         width: 12 },  // 15
      { key: 'dress_issue_status',      width: 13 },  // 16
      { key: 'smoking_process',         width: 12 },  // 17
      { key: 'smoking_issue_sqm',       width: 12 },  // 18
      { key: 'smoking_issue_status',    width: 13 },  // 19
      { key: 'grouping_new_group_no',   width: 16 },  // 20
      { key: 'grouping_rec_sheets',     width: 12 },  // 21
      { key: 'grouping_rec_sqm',        width: 12 },  // 22
      { key: 'grouping_issue_sheets',   width: 12 },  // 23
      { key: 'grouping_issue_sqm',      width: 12 },  // 24
      { key: 'grouping_issue_status',   width: 13 },  // 25
      { key: 'grouping_balance_sheets', width: 14 },  // 26
      { key: 'grouping_balance_sqm',    width: 14 },  // 27
      { key: 'splicing_rec_machine_sqm', width: 16 }, // 28
      { key: 'splicing_rec_hand_sqm',   width: 16 },  // 29
      { key: 'splicing_sheets',         width: 14 },  // 30
      { key: 'splicing_issue_sheets',   width: 14 },  // 31
      { key: 'splicing_issue_status',   width: 13 },  // 32
      { key: 'splicing_balance_sheets', width: 15 },  // 33
      { key: 'splicing_balance_sqm',    width: 15 },  // 34
      { key: 'pressing_sheets',         width: 14 },  // 35
      { key: 'pressing_sqm',            width: 13 },  // 36
      { key: 'pressing_issue_sheets',   width: 14 },  // 37
      { key: 'pressing_issue_sqm',      width: 14 },  // 38
      { key: 'pressing_issue_status',   width: 13 },  // 39
      { key: 'pressing_balance_sheets', width: 15 },  // 40
      { key: 'pressing_balance_sqm',    width: 15 },  // 41
      { key: 'cnc_type',                width: 13 },  // 42
      { key: 'cnc_rec_sheets',          width: 12 },  // 43
      { key: 'colour_rec_sheets',       width: 12 },  // 44
      { key: 'sales_rec_sheets',        width: 12 },  // 45
      { key: 'jwc_veneer',              width: 12 },  // 46
      { key: 'awc_pressing_sheets',     width: 16 },  // 47
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
    ws.mergeCells(1, 1, 1, 47);

    // ── Row 2: Date range ─────────────────────────────────────────────────────
    const dateRangeRow = ws.addRow([
      `Date: ${fmt(startDate)}  To  ${fmt(endDate)}`,
    ]);
    dateRangeRow.font = { size: 10 };
    dateRangeRow.alignment = { vertical: 'middle', horizontal: 'left' };
    dateRangeRow.height = 16;
    ws.mergeCells(2, 1, 2, 47);

    // ── Row 3: Filter label (only when inward_id or flitch_no is provided) ────
    const filterLabel = filter.inward_id
      ? `Inward Id :- ${filter.inward_id}`
      : filter.flitch_no
      ? `Flitch No :- ${filter.flitch_no}`
      : '';
    const filterRow = ws.addRow([filterLabel]);
    filterRow.font = { size: 10 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left' };
    filterRow.height = 16;
    ws.mergeCells(3, 1, 3, 47);

    // ── Row 4: Section group headers ──────────────────────────────────────────
    const secHdr = new Array(47).fill('');
    secHdr[0]  = '';                       //  1  Item Name – no group label
    secHdr[1]  = 'Flitch Inward in(CMT)'; //  2-5
    secHdr[5]  = 'Slicing Issue in(CMT)'; //  6-9
    secHdr[9]  = 'Peeling';               // 10-13
    secHdr[13] = 'Dressing';              // 14-16
    secHdr[16] = 'Smoking/Dying';         // 17-19
    secHdr[19] = 'Clipping/Grouping';     // 20-27
    secHdr[27] = 'Splicing';              // 28-34
    secHdr[34] = 'Pressing';              // 35-41
    secHdr[41] = 'CNC';                   // 42-43
    secHdr[43] = 'COLOUR';               // 44
    secHdr[44] = 'Sales';                 // 45
    secHdr[45] = 'Job Work Challan';      // 46
    secHdr[46] = 'Adv Work Challan';      // 47

    const groupRow = ws.addRow(secHdr);
    groupRow.height = 22;
    styleRow(groupRow, { bold: true, fill: headerFill });

    // Merge section header spans
    ws.mergeCells(4,  2,  4,  5);   // Flitch Inward in(CMT)
    ws.mergeCells(4,  6,  4,  9);   // Slicing Issue in(CMT)
    ws.mergeCells(4, 10,  4, 13);   // Peeling
    ws.mergeCells(4, 14,  4, 16);   // Dressing
    ws.mergeCells(4, 17,  4, 19);   // Smoking/Dying
    ws.mergeCells(4, 20,  4, 27);   // Clipping/Grouping
    ws.mergeCells(4, 28,  4, 34);   // Splicing
    ws.mergeCells(4, 35,  4, 41);   // Pressing
    ws.mergeCells(4, 42,  4, 43);   // CNC

    // ── Row 5: Column headers ─────────────────────────────────────────────────
    const colHdr = [
      'Item Name',                          //  1
      'Flitch No.',                         //  2
      'REC CMT',                            //  3
      'Issue For Slicing/Peeling/Sales',    //  4
      'Issue Status',                       //  5
      'Side',                               //  6
      'Process Cmt',                        //  7
      'Balance Cmt',                        //  8
      'REC (Leaf)',                          //  9
      'Process',                            // 10
      'Balance Rostroller',                 // 11
      'Output',                             // 12
      'Rec (Leaf)',                          // 13
      'Rec Sq. Mtr.',                       // 14
      'Issue (Sq.Mtr.)',                    // 15
      'Issue Status',                       // 16
      'Process',                            // 17
      'Issue (Sq.Mtr.)',                    // 18
      'Issue Status',                       // 19
      'New Group Number',                   // 20
      'Rec Sheets',                         // 21
      'Rec Sq.Mtr.',                        // 22
      'Issue (Sheets)',                     // 23
      'Issue (Sq.Mtr.)',                    // 24
      'Issue Status',                       // 25
      'Balance (Sheets)',                   // 26
      'Balance Sq. Mtr.',                   // 27
      'Rec Machine (Sq.mtr.)',              // 28
      'Rec Hand (Sq.Mtr.)',                // 29
      'Splicing Sheets',                    // 30
      'Issue (Sheets)',                     // 31
      'Issue Status',                       // 32
      'Balance (Sheets)',                   // 33
      'Balance (Sq. Mtr.)',                // 34
      'Pressing (Sheets)',                  // 35
      'Pressing (Sq.mtr.)',               // 36
      'Issue (Sheets)',                     // 37
      'Issue (Sq. Mtr.)',                   // 38
      'Issue Status',                       // 39
      'Balance (Sheets)',                   // 40
      'Balance (Sq. Mtr.)',                // 41
      'Cnc Type',                           // 42
      'REC (Sheets)',                       // 43
      'REC (Sheets)',                       // 44
      'REC (Sheets)',                       // 45
      'Veneer',                             // 46
      'Pressing Sheets',                    // 47
    ];

    const headerRow = ws.addRow(colHdr);
    headerRow.height = 36;
    styleRow(headerRow, { bold: true, fill: headerFill });

    // ── Numeric column indices (1-based) used for totals ─────────────────────
    const NUMERIC_COLS = new Set([
      3, 4,         // rece_cmt, issue_for
      9,            // slicing_rec_leaf
      13,           // peeling_rec_leaf
      14, 15,       // dress_rec_sqm, dress_issue_sqm
      18,           // smoking_issue_sqm
      21, 22, 23, 24, 26, 27,  // grouping
      28, 29, 30, 31, 33, 34,  // splicing
      35, 36, 37, 38, 40, 41,  // pressing
      43, 44, 45,   // cnc, colour, sales
    ]);

    // Columns to MERGE vertically (parent-level columns)
    // Col 1        : item_name
    // Cols 2-5     : flitch-level
    // Cols 6-9, 14-19: slicing-side-level + dressing + smoking
    const ITEM_COLS   = [1];
    const FLITCH_COLS = [2, 3, 4, 5];
    const SIDE_COLS   = [6, 7, 8, 9, 14, 15, 16, 17, 18, 19];

    // ── Helper: convert row object to cell value array (47 elements) ─────────
    const toCells = (row) => [
      row.item_name,
      row.flitch_no,
      row.rece_cmt,
      row.issue_for,
      row.issue_status,
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
      const cells = new Array(47).fill('');
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
      applyRowBorders(wsRow, 1, 47, {
        top: true,
        bottom: true,
        bottomStyle: isGrandTotal ? 'medium' : 'thin',
      });
      return wsRow.number;
    };

    // ── Group data by item_name → flitch_no ──────────────────────────────────
    const itemGroups = new Map(); // item_name → { flitchGroups: Map<flitch_no, rows[]> }

    for (const row of flitchData) {
      const item = row.item_name;
      const fno  = row.flitch_no;
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
        const flitchTotals = {};

        let curMItem   = null;
        let curMFlitch = null;
        let curMSide   = null;

        let pItem   = Symbol();
        let pFlitch = Symbol();
        let pSide   = Symbol();

        for (const row of rows) {
          const curItem   = row.item_name;
          const curFlitch = row.flitch_no || '__EMPTY__';
          const curSide   = row.slicing_side || row.peeling_process || '__EMPTY__';

          const wsRowNum = ws.lastRow ? ws.lastRow.number + 1 : 6;

          const newItem   = curItem   !== pItem;
          const newFlitch = curFlitch !== pFlitch || newItem;
          const newSide   = curSide   !== pSide   || newFlitch;

          // Close previous merges for groups that changed
          if (newItem   && curMItem)   { merges.push(...ITEM_COLS.map(c => ({ startRow: curMItem.startRow,   endRow: wsRowNum - 1, col: c }))); curMItem = null; }
          if (newFlitch && curMFlitch) { merges.push(...FLITCH_COLS.map(c => ({ startRow: curMFlitch.startRow, endRow: wsRowNum - 1, col: c }))); curMFlitch = null; }
          if (newSide   && curMSide)   { merges.push(...SIDE_COLS.map(c => ({ startRow: curMSide.startRow,   endRow: wsRowNum - 1, col: c }))); curMSide = null; }

          // Build cell values — blank out parent columns for non-first rows
          const cells = toCells(row);
          if (!newItem)   { ITEM_COLS.forEach(c   => { cells[c - 1] = ''; }); }
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
          applyRowBorders(wsRow, 1, 47, { top: false, bottom: true });

          // Accumulate totals using full (un-blanked) values
          const fullCells = toCells(row);
          accumulate(flitchTotals, fullCells);
          accumulate(itemTotals, fullCells);
          accumulate(grandTotals, fullCells);

          // Open new merge groups
          if (newItem)   curMItem   = { startRow: wsRowNum };
          if (newFlitch) curMFlitch = { startRow: wsRowNum };
          if (newSide)   curMSide   = { startRow: wsRowNum };

          pItem   = curItem;
          pFlitch = curFlitch;
          pSide   = curSide;
        }

        // Close any open merge groups at end of this flitch's rows
        const lastDataRow = ws.lastRow.number;
        if (curMItem)   merges.push(...ITEM_COLS.map(c   => ({ startRow: curMItem.startRow,   endRow: lastDataRow, col: c })));
        if (curMFlitch) merges.push(...FLITCH_COLS.map(c => ({ startRow: curMFlitch.startRow, endRow: lastDataRow, col: c })));
        if (curMSide)   merges.push(...SIDE_COLS.map(c   => ({ startRow: curMSide.startRow,   endRow: lastDataRow, col: c })));

        // Per-flitch total row
        addTotalRow(['', `Total ${flitchNo}`], flitchTotals, totalFill);
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
    const fileName  = `Flitch-Item-Further-Process-Report-${timestamp}.xlsx`;
    const filePath  = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Flitch item further process report generated =>', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating flitch item further process report:', error);
    throw new ApiError(500, error.message, error);
  }
};
