import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Log Wise Flitch Report Excel
 * Generates the "Inward Item & Log Wise Report" matching the client's required layout.
 *
 * 19 columns across 4 header rows:
 *   Row 1 – Title (merged)
 *   Row 2 – Empty spacer
 *   Row 3 – Group headers (Received Flitch Detail CMT, Flitch Details CMT,
 *            Peeling Details CMT, Round log + Cross Cu merged across sub-columns)
 *   Row 4 – Sub-column headers
 *
 * Column layout:
 *   1–6   Item Name, Flitch Log No., Inward Date, Status, Opening Stock CMT, Recovered From rejected
 *   ── Received Flitch Detail CMT (cols 7–9) ──
 *   7  Invoice, 8 Indian, 9 Actual
 *   ── Flitch Details CMT (cols 10–12) ──
 *   10 Issue for Flitch, 11 Flitch Received, 12 Flitch Diff
 *   ── Peeling Details CMT (cols 13–15) ──
 *   13 Issue for Peeling, 14 Peeling Received, 15 Peeling Diff
 *   16 Issue for Sq.Edge (standalone)
 *   17 Round log +Cross Cut → Sales
 *   18 (Cc+Flitch+Peeling) → Rejected
 *   19 Closing Stock CMT (standalone)
 *
 * @param {Array}  logData   – Array of log objects from the controller
 * @param {String} startDate – YYYY-MM-DD
 * @param {String} endDate   – YYYY-MM-DD
 * @param {Object} filter    – Optional filters
 * @returns {String} Download URL
 */
export const createLogWiseFlitchReportExcel = async (
  logData,
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
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Log Wise Flitch Report');

    const TOTAL_COLS = 19;

    // ── Date formatters ──────────────────────────────────────────────────────
    const fmt = (dateStr) => {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      } catch {
        return '';
      }
    };

    const fmtFull = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        const d = new Date(dateStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
      } catch {
        return 'N/A';
      }
    };

    // ── Column definitions ───────────────────────────────────────────────────
    worksheet.columns = [
      { key: 'item_name',             width: 22 }, // 1
      { key: 'log_no',                width: 14 }, // 2
      { key: 'inward_date',           width: 13 }, // 3
      { key: 'status',                width: 20 }, // 4
      { key: 'op_bal',                width: 16 }, // 5
      { key: 'recover_from_rejected', width: 22 }, // 6
      { key: 'invoice_ref',           width: 10 }, // 7
      { key: 'indian_cmt',            width: 12 }, // 8
      { key: 'actual_cmt',            width: 12 }, // 9
      { key: 'issue_for_flitch',      width: 16 }, // 10
      { key: 'flitch_received',       width: 16 }, // 11
      { key: 'flitch_diff',           width: 13 }, // 12
      { key: 'issue_for_peeling',     width: 16 }, // 13
      { key: 'peel_received',         width: 16 }, // 14
      { key: 'peeling_diff',          width: 13 }, // 15
      { key: 'issue_for_sqedge',      width: 16 }, // 16
      { key: 'sales',                 width: 12 }, // 17
      { key: 'rejected',              width: 12 }, // 18
      { key: 'fl_closing',            width: 16 }, // 19
    ];

    const thin = { style: 'thin' };
    const medium = { style: 'medium' };

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

    // ── ROW 1: Title ─────────────────────────────────────────────────────────
    const title =
      `Inward Item & Log Wise Report From ${fmtFull(startDate)} To ${fmtFull(endDate)}`;
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
    titleRow.height = 22;
    worksheet.mergeCells(1, 1, 1, TOTAL_COLS);

    // ── ROW 2: Spacer ────────────────────────────────────────────────────────
    worksheet.addRow([]);

    // ── ROW 3: Group header row ──────────────────────────────────────────────
    // Received Flitch Detail CMT (7–9), Flitch Details CMT (10–12), Peeling Details CMT (13–15),
    // col 16 empty, Round log +Cross Cut (17), (Cc+Flitch+Peeling) (18), col 19 empty
    const groupHeaderRow = worksheet.addRow([
      '', '', '', '', '', '',                           // cols 1–6: no group label
      'Received Flitch Detail CMT', '', '',             // cols 7–9 (Invoice, Indian, Actual)
      'Flitch Details CMT', '', '',                     // cols 10–12
      'Peeling Details CMT', '', '',                    // cols 13–15
      '',                                               // col 16: Issue for Sq.Edge standalone
      'Round log +Cross Cut',                           // col 17: Sales
      '(Cc+Flitch+Peeling)',                             // col 18: Rejected
      '',                                               // col 19: Closing Stock standalone
    ]);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.height = 18;
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Merge only the 3-column groups; 17 and 18 are single-cell labels
    worksheet.mergeCells(3, 7, 3, 9);   // Received Flitch Detail CMT (Invoice, Indian, Actual)
    worksheet.mergeCells(3, 10, 3, 12); // Flitch Details CMT
    worksheet.mergeCells(3, 13, 3, 15); // Peeling Details CMT

    // Style + border every cell in group header row (including inside merged ranges)
    const groupFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = groupHeaderRow.getCell(c);
      cell.fill = groupFill;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
    applyRowBorders(groupHeaderRow, 1, TOTAL_COLS, { top: true, bottom: true });

    // ── ROW 4: Sub-column headers ────────────────────────────────────────────
    const subHeaderRow = worksheet.addRow([
      'Item Name',
      'Flitch Log No.',
      'Inward Date',
      'Status',
      'Opening Stock CMT',
      'Recovered From rejected',
      'Invoice',
      'Indian',
      'Actual',
      'Issue for Flitch',
      'Flitch Received',
      'Flitch Diff',
      'Issue for Peeling',
      'Peeling Received',
      'Peeling Diff',
      'Issue for Sq.Edge',
      'Sales',
      'Rejected',
      'Closing Stock CMT',
    ]);
    subHeaderRow.font = { bold: true };
    subHeaderRow.height = 32;
    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = subHeaderRow.getCell(c);
      cell.fill = groupFill;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
    applyRowBorders(subHeaderRow, 1, TOTAL_COLS, { top: true, bottom: true });

    // ── Grand-total accumulators ─────────────────────────────────────────────
    const grand = {
      op_bal: 0,
      recover_from_rejected: 0,
      indian_cmt: 0,
      actual_cmt: 0,
      issue_for_flitch: 0,
      flitch_received: 0,
      flitch_diff: 0,
      issue_for_peeling: 0,
      peel_received: 0,
      peeling_diff: 0,
      issue_for_sqedge: 0,
      sales: 0,
      rejected: 0,
      fl_closing: 0,
    };

    // ── Group data by item_name ──────────────────────────────────────────────
    const groupedData = {};
    logData.forEach((log) => {
      const key = log.item_name || 'UNKNOWN';
      if (!groupedData[key]) groupedData[key] = [];
      groupedData[key].push(log);
    });

    const sortedItems = Object.keys(groupedData).sort();

    // ── DATA ROWS ────────────────────────────────────────────────────────────
    sortedItems.forEach((itemName) => {
      const logs = groupedData[itemName];
      const itemStartRow = worksheet.lastRow.number + 1;

      logs.forEach((log, idx) => {
        const n = (v) => parseFloat(v || 0).toFixed(3);

        const dataRow = worksheet.addRow({
          item_name:             idx === 0 ? itemName : '',
          log_no:                log.log_no || '',
          inward_date:           fmt(log.inward_date),
          status:                log.status || '',
          op_bal:                n(log.op_bal),
          recover_from_rejected: n(log.recover_from_rejected),
          invoice_ref:           log.invoice_ref != null ? log.invoice_ref : '',
          indian_cmt:            n(log.indian_cmt),
          actual_cmt:            n(log.actual_cmt),
          issue_for_flitch:      n(log.issue_for_flitch),
          flitch_received:       n(log.flitch_received),
          flitch_diff:           n(log.flitch_diff),
          issue_for_peeling:     n(log.issue_for_peeling),
          peel_received:         n(log.peel_received),
          peeling_diff:          n(log.peeling_diff),
          issue_for_sqedge:      n(log.issue_for_sqedge),
          sales:                 n(log.sales),
          rejected:              n(log.rejected),
          fl_closing:            n(log.fl_closing),
        });

        applyRowBorders(dataRow, 1, TOTAL_COLS, { top: false, bottom: true });
        for (let c = 1; c <= TOTAL_COLS; c++) {
          const cell = dataRow.getCell(c);
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        // Left-align text columns
        dataRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        dataRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        dataRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };

        // Accumulate grand totals
        grand.op_bal             += parseFloat(log.op_bal             || 0);
        grand.recover_from_rejected += parseFloat(log.recover_from_rejected || 0);
        grand.indian_cmt         += parseFloat(log.indian_cmt         || 0);
        grand.actual_cmt         += parseFloat(log.actual_cmt         || 0);
        grand.issue_for_flitch   += parseFloat(log.issue_for_flitch   || 0);
        grand.flitch_received    += parseFloat(log.flitch_received    || 0);
        grand.flitch_diff        += parseFloat(log.flitch_diff        || 0);
        grand.issue_for_peeling  += parseFloat(log.issue_for_peeling  || 0);
        grand.peel_received      += parseFloat(log.peel_received      || 0);
        grand.peeling_diff       += parseFloat(log.peeling_diff       || 0);
        grand.issue_for_sqedge   += parseFloat(log.issue_for_sqedge   || 0);
        grand.sales              += parseFloat(log.sales              || 0);
        grand.rejected           += parseFloat(log.rejected           || 0);
        grand.fl_closing         += parseFloat(log.fl_closing         || 0);
      });

      // Merge item_name cells vertically for this item group
      if (logs.length > 1) {
        const itemEndRow = worksheet.lastRow.number;
        worksheet.mergeCells(itemStartRow, 1, itemEndRow, 1);
        const mergedCell = worksheet.getCell(itemStartRow, 1);
        mergedCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    });

    // ── GRAND TOTAL ROW ──────────────────────────────────────────────────────
    const g = (v) => v.toFixed(3);
    const grandTotalRow = worksheet.addRow({
      item_name:             'Total',
      log_no:                '',
      inward_date:           '',
      status:                '',
      op_bal:                g(grand.op_bal),
      recover_from_rejected: g(grand.recover_from_rejected),
      invoice_ref:           '',
      indian_cmt:            g(grand.indian_cmt),
      actual_cmt:            g(grand.actual_cmt),
      issue_for_flitch:      g(grand.issue_for_flitch),
      flitch_received:       g(grand.flitch_received),
      flitch_diff:           g(grand.flitch_diff),
      issue_for_peeling:     g(grand.issue_for_peeling),
      peel_received:         g(grand.peel_received),
      peeling_diff:          g(grand.peeling_diff),
      issue_for_sqedge:      g(grand.issue_for_sqedge),
      sales:                 g(grand.sales),
      rejected:              g(grand.rejected),
      fl_closing:            g(grand.fl_closing),
    });

    const yellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };
    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = grandTotalRow.getCell(c);
      cell.font = { bold: true };
      cell.fill = yellowFill;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
    applyRowBorders(grandTotalRow, 1, TOTAL_COLS, { top: true, bottom: true });
    grandTotalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

    // ── Save & return download URL ────────────────────────────────────────────
    const timeStamp = Date.now();
    const fileName  = `LogWiseFlitch_${timeStamp}.xlsx`;
    const filePath  = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}/${filePath}`;
    console.log('Log wise flitch report generated =>', downloadLink);
    return downloadLink;
  } catch (error) {
    console.error('Error creating log wise flitch report:', error);
    throw new ApiError(500, error.message, error);
  }
};
