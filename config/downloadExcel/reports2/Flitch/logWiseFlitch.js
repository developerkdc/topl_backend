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
 *            Slicing Details CMT, Round log + Cross Cu merged across sub-columns)
 *   Row 4 – Sub-column headers
 *
 * Column layout:
 *   1–6   Item Name, Flitch Log No., Inward Date, Status, Opening Stock CMT, Recovered From rejected
 *   ── Received Flitch Detail CMT (cols 7–9) ──
 *   7  Invoice, 8 Indian, 9 Actual
 *   ── Flitch Details CMT (cols 10–12) ──
 *   10 Issue for Flitch, 11 Flitch Received, 12 Flitch Diff
 *   ── Slicing Details CMT (cols 13–15) ──
 *   13 Issue for Slicing, 14 Slicing Received, 15 Slicing Diff
 *   16 Issue for Sq.Edge (standalone)
 *   17 Round log +Cross Cut → Sales
 *   18 (Cc+Flitch+Slicing) → Rejected
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
  filter = {},
  includeCostAndExpense
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
    const columnDefinitions = [
      { key: 'item_name', width: 22 },
      { key: 'log_no', width: 14 },
      { key: 'inward_date', width: 13 },
      { key: 'status', width: 20 },
      { key: 'op_bal', width: 16 },
      ...(includeCostAndExpense ? [
        { key: 'op_bal_amount', width: 16 },
        { key: 'op_bal_expense_amount', width: 16 },
      ] : []),
      { key: 'recover_from_rejected', width: 22 },
      { key: 'invoice_cmt', width: 10 },
      { key: 'indian_cmt', width: 12 },
      { key: 'actual_cmt', width: 12 },
      ...(includeCostAndExpense ? [
        { key: 'actual_cmt_amount', width: 16 },
        { key: 'actual_cmt_expense_amount', width: 16 },
      ] : []),
      { key: 'issue_for_flitch', width: 16 },
      ...(includeCostAndExpense ? [
        { key: 'issue_for_flitch_amount', width: 16 },
        { key: 'issue_for_flitch_expense_amount', width: 16 },
      ] : []),
      { key: 'flitch_received', width: 16 },
      ...(includeCostAndExpense ? [
        { key: 'flitch_received_amount', width: 16 },
        { key: 'flitch_received_expense_amount', width: 16 },
      ] : []),
      { key: 'flitch_diff', width: 13 },
      { key: 'issue_for_slicing', width: 16 },
      ...(includeCostAndExpense ? [
        { key: 'issue_for_slicing_amount', width: 16 },
        { key: 'issue_for_slicing_expense_amount', width: 16 },
      ] : []),
      { key: 'slicing_received', width: 16 },
      ...(includeCostAndExpense ? [
        { key: 'slicing_received_amount', width: 16 },
        { key: 'slicing_received_expense_amount', width: 16 },
      ] : []),
      { key: 'slicing_diff', width: 13 },
      { key: 'issue_for_sqedge', width: 16 },
      { key: 'sales', width: 12 },
      ...(includeCostAndExpense ? [
        { key: 'sales_amount', width: 16 },
        { key: 'sales_expense_amount', width: 16 },
      ] : []),
      { key: 'rejected', width: 12 },
      { key: 'fl_closing', width: 16 },
      ...(includeCostAndExpense ? [
        { key: 'fl_closing_amount', width: 16 },
        { key: 'fl_closing_expense_amount', width: 16 },
      ] : []),
    ];

    worksheet.columns = columnDefinitions;
    const TOTAL_COLS = columnDefinitions.length;
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
    // Received Flitch Detail CMT (7–9), Flitch Details CMT (10–12), Slicing Details CMT (13–15),
    // col 16 empty, Round log +Cross Cut (17), (Cc+Flitch+Slicing) (18), col 19 empty
    const colIndex = (key) => columnDefinitions.findIndex((c) => c.key === key) + 1;

    const groupHeaderValues = new Array(TOTAL_COLS).fill('');
    groupHeaderValues[colIndex('invoice_cmt') - 1] = 'Received Flitch Detail CMT';
    groupHeaderValues[colIndex('issue_for_flitch') - 1] = 'Flitch Details CMT';
    groupHeaderValues[colIndex('issue_for_slicing') - 1] = 'Slicing Details CMT';
    groupHeaderValues[colIndex('sales') - 1] = 'Round log +Cross Cut';
    groupHeaderValues[colIndex('rejected') - 1] = 'Flitch+Slicing';

    const groupHeaderRow = worksheet.addRow(groupHeaderValues);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.height = 18;
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const extra = includeCostAndExpense ? 2 : 0;
    worksheet.mergeCells(3, colIndex('invoice_cmt'), 3, colIndex('actual_cmt') + extra);
    worksheet.mergeCells(3, colIndex('issue_for_flitch'), 3, colIndex('flitch_diff'));
    worksheet.mergeCells(3, colIndex('issue_for_slicing'), 3, colIndex('slicing_diff'));

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
      ...(includeCostAndExpense ? ['Opening Stock Amount', 'Opening Stock Expense Amount'] : []),
      'Recovered From rejected',
      'Invoice',
      'Indian',
      'Actual',
      ...(includeCostAndExpense ? ['Actual Amount', 'Actual Expense Amount'] : []),
      'Issue for Flitch',
      ...(includeCostAndExpense ? ['Issue for Flitch Amount', 'Issue for Flitch Expense Amount'] : []),
      'Flitch Received',
      ...(includeCostAndExpense ? ['Flitch Received Amount', 'Flitch Received Expense Amount'] : []),
      'Flitch Diff',
      'Issue for Slicing',
      ...(includeCostAndExpense ? ['Issue for Slicing Amount', 'Issue for Slicing Expense Amount'] : []),
      'Slicing Received',
      ...(includeCostAndExpense ? ['Slicing Received Amount', 'Slicing Received Expense Amount'] : []),
      'Slicing Diff',
      'Issue for Sq.Edge',
      'Sales',
      ...(includeCostAndExpense ? ['Sales Amount', 'Sales Expense Amount'] : []),
      'Rejected',
      'Closing Stock CMT',
      ...(includeCostAndExpense ? ['Closing Stock Amount', 'Closing Stock Expense Amount'] : []),
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
      invoice_cmt: 0,
      indian_cmt: 0,
      actual_cmt: 0,
      issue_for_flitch: 0,
      flitch_received: 0,
      flitch_diff: 0,
      issue_for_slicing: 0,
      slicing_received: 0,
      slicing_diff: 0,
      issue_for_sqedge: 0,
      sales: 0,
      rejected: 0,
      fl_closing: 0,
      ...(includeCostAndExpense && {
        op_bal_amount: 0,
        op_bal_expense_amount: 0,
        recover_from_rejected_amount: 0,
        recover_from_rejected_expense_amount: 0,
        invoice_cmt_amount: 0,
        invoice_cmt_expense_amount: 0,
        indian_cmt_amount: 0,
        indian_cmt_expense_amount: 0,
        actual_cmt_amount: 0,
        actual_cmt_expense_amount: 0,
        issue_for_flitch_amount: 0,
        issue_for_flitch_expense_amount: 0,
        flitch_received_amount: 0,
        flitch_received_expense_amount: 0,
        flitch_diff_amount: 0,
        flitch_diff_expense_amount: 0,
        issue_for_slicing_amount: 0,
        issue_for_slicing_expense_amount: 0,
        slicing_received_amount: 0,
        slicing_received_expense_amount: 0,
        slicing_diff_amount: 0,
        slicing_diff_expense_amount: 0,
        sales_amount: 0,
        sales_expense_amount: 0,
        rejected_amount: 0,
        rejected_expense_amount: 0,
        fl_closing_amount: 0,
        fl_closing_expense_amount: 0,
      }),
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
          item_name: idx === 0 ? itemName : '',
          log_no: log.log_no || '',
          inward_date: fmt(log.inward_date),
          status: log.status || '',
          op_bal: n(log.op_bal),
          recover_from_rejected: n(log.recover_from_rejected),
          invoice_cmt: log.invoice_cmt != null ? log.invoice_cmt : '',
          indian_cmt: n(log.indian_cmt),
          actual_cmt: n(log.actual_cmt),
          issue_for_flitch: n(log.issue_for_flitch),
          flitch_received: n(log.flitch_received),
          flitch_diff: n(log.flitch_diff),
          issue_for_slicing: n(log.issue_for_slicing),
          slicing_received: n(log.slicing_received),
          slicing_diff: n(log.slicing_diff),
          issue_for_sqedge: n(log.issue_for_sqedge),
          sales: n(log.sales),
          rejected: n(log.rejected),
          fl_closing: n(log.fl_closing),
          ...(includeCostAndExpense && {
            op_bal_amount: n(log.op_bal_amount),
            op_bal_expense_amount: n(log.op_bal_expense_amount),
            recover_from_rejected_amount: n(log.recover_from_rejected_amount),
            recover_from_rejected_expense_amount: n(log.recover_from_rejected_expense_amount),
            invoice_cmt_amount: n(log.invoice_cmt_amount),
            invoice_cmt_expense_amount: n(log.invoice_cmt_expense_amount),
            indian_cmt_amount: n(log.indian_cmt_amount),
            indian_cmt_expense_amount: n(log.indian_cmt_expense_amount),
            actual_cmt_amount: n(log.actual_cmt_amount),
            actual_cmt_expense_amount: n(log.actual_cmt_expense_amount),
            issue_for_flitch_amount: n(log.issue_for_flitch_amount),
            issue_for_flitch_expense_amount: n(log.issue_for_flitch_expense_amount),
            flitch_received_amount: n(log.flitch_received_amount),
            flitch_received_expense_amount: n(log.flitch_received_expense_amount),
            flitch_diff_amount: n(log.flitch_diff_amount),
            flitch_diff_expense_amount: n(log.flitch_diff_expense_amount),
            issue_for_slicing_amount: n(log.issue_for_slicing_amount),
            issue_for_slicing_expense_amount: n(log.issue_for_slicing_expense_amount),
            slicing_received_amount: n(log.slicing_received_amount),
            slicing_received_expense_amount: n(log.slicing_received_expense_amount),
            slicing_diff_amount: n(log.slicing_diff_amount),
            slicing_diff_expense_amount: n(log.slicing_diff_expense_amount),
            issue_for_sqedge_amount: n(log.issue_for_sqedge_amount),
            issue_for_sqedge_expense_amount: n(log.issue_for_sqedge_expense_amount),
            sales_amount: n(log.sales_amount),
            sales_expense_amount: n(log.sales_expense_amount),
            rejected_amount: n(log.rejected_amount),
            rejected_expense_amount: n(log.rejected_expense_amount),
            fl_closing_amount: n(log.fl_closing_amount),
            fl_closing_expense_amount: n(log.fl_closing_expense_amount),
          }),
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
        grand.op_bal += parseFloat(log.op_bal || 0);
        grand.recover_from_rejected += parseFloat(log.recover_from_rejected || 0);
        grand.invoice_cmt += parseFloat(log.invoice_cmt || 0);
        grand.indian_cmt += parseFloat(log.indian_cmt || 0);
        grand.actual_cmt += parseFloat(log.actual_cmt || 0);
        grand.issue_for_flitch += parseFloat(log.issue_for_flitch || 0);
        grand.flitch_received += parseFloat(log.flitch_received || 0);
        grand.flitch_diff += parseFloat(log.flitch_diff || 0);
        grand.issue_for_slicing += parseFloat(log.issue_for_slicing || 0);
        grand.slicing_received += parseFloat(log.slicing_received || 0);
        grand.slicing_diff += parseFloat(log.slicing_diff || 0);
        grand.issue_for_sqedge += parseFloat(log.issue_for_sqedge || 0);
        grand.sales += parseFloat(log.sales || 0);
        grand.rejected += parseFloat(log.rejected || 0);
        grand.fl_closing += parseFloat(log.fl_closing || 0);
        if (includeCostAndExpense) {
          grand.op_bal_amount += parseFloat(log.op_bal_amount || 0);
          grand.op_bal_expense_amount += parseFloat(log.op_bal_expense_amount || 0);

          grand.recover_from_rejected_amount += parseFloat(
            log.recover_from_rejected_amount || 0
          );
          grand.recover_from_rejected_expense_amount += parseFloat(
            log.recover_from_rejected_expense_amount || 0
          );

          grand.invoice_cmt_amount += parseFloat(log.invoice_cmt_amount || 0);
          grand.invoice_cmt_expense_amount += parseFloat(
            log.invoice_cmt_expense_amount || 0
          );

          grand.indian_cmt_amount += parseFloat(log.indian_cmt_amount || 0);
          grand.indian_cmt_expense_amount += parseFloat(
            log.indian_cmt_expense_amount || 0
          );

          grand.actual_cmt_amount += parseFloat(log.actual_cmt_amount || 0);
          grand.actual_cmt_expense_amount += parseFloat(
            log.actual_cmt_expense_amount || 0
          );

          grand.issue_for_flitch_amount += parseFloat(
            log.issue_for_flitch_amount || 0
          );
          grand.issue_for_flitch_expense_amount += parseFloat(
            log.issue_for_flitch_expense_amount || 0
          );

          grand.flitch_received_amount += parseFloat(
            log.flitch_received_amount || 0
          );
          grand.flitch_received_expense_amount += parseFloat(
            log.flitch_received_expense_amount || 0
          );

          grand.flitch_diff_amount += parseFloat(log.flitch_diff_amount || 0);
          grand.flitch_diff_expense_amount += parseFloat(
            log.flitch_diff_expense_amount || 0
          );

          grand.issue_for_slicing_amount += parseFloat(
            log.issue_for_slicing_amount || 0
          );
          grand.issue_for_slicing_expense_amount += parseFloat(
            log.issue_for_slicing_expense_amount || 0
          );

          grand.slicing_received_amount += parseFloat(
            log.slicing_received_amount || 0
          );
          grand.slicing_received_expense_amount += parseFloat(
            log.slicing_received_expense_amount || 0
          );

          grand.slicing_diff_amount += parseFloat(log.slicing_diff_amount || 0);
          grand.slicing_diff_expense_amount += parseFloat(
            log.slicing_diff_expense_amount || 0
          );

          grand.issue_for_sqedge_amount += parseFloat(
            log.issue_for_sqedge_amount || 0
          );
          grand.issue_for_sqedge_expense_amount += parseFloat(
            log.issue_for_sqedge_expense_amount || 0
          );

          grand.sales_amount += parseFloat(log.sales_amount || 0);
          grand.sales_expense_amount += parseFloat(
            log.sales_expense_amount || 0
          );

          grand.rejected_amount += parseFloat(log.rejected_amount || 0);
          grand.rejected_expense_amount += parseFloat(
            log.rejected_expense_amount || 0
          );

          grand.fl_closing_amount += parseFloat(log.fl_closing_amount || 0);
          grand.fl_closing_expense_amount += parseFloat(
            log.fl_closing_expense_amount || 0
          );
        }
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
      item_name: 'Total',
      log_no: '',
      inward_date: '',
      status: '',
      op_bal: g(grand.op_bal),
      recover_from_rejected: g(grand.recover_from_rejected),
      invoice_cmt: g(grand.invoice_cmt),
      indian_cmt: g(grand.indian_cmt),
      actual_cmt: g(grand.actual_cmt),
      issue_for_flitch: g(grand.issue_for_flitch),
      flitch_received: g(grand.flitch_received),
      flitch_diff: g(grand.flitch_diff),
      issue_for_slicing: g(grand.issue_for_slicing),
      slicing_received: g(grand.slicing_received),
      slicing_diff: g(grand.slicing_diff),
      issue_for_sqedge: g(grand.issue_for_sqedge),
      sales: g(grand.sales),
      rejected: g(grand.rejected),
      fl_closing: g(grand.fl_closing),
      ...(includeCostAndExpense && {
        op_bal_amount: g(grand.op_bal_amount),
        op_bal_expense_amount: g(grand.op_bal_expense_amount),
        recover_from_rejected_amount: g(grand.recover_from_rejected_amount),
        recover_from_rejected_expense_amount: g(grand.recover_from_rejected_expense_amount),
        invoice_cmt_amount: g(grand.invoice_cmt_amount),
        invoice_cmt_expense_amount: g(grand.invoice_cmt_expense_amount),
        indian_cmt_amount: g(grand.indian_cmt_amount),
        indian_cmt_expense_amount: g(grand.indian_cmt_expense_amount),
        actual_cmt_amount: g(grand.actual_cmt_amount),
        actual_cmt_expense_amount: g(grand.actual_cmt_expense_amount),
        issue_for_flitch_amount: g(grand.issue_for_flitch_amount),
        issue_for_flitch_expense_amount: g(grand.issue_for_flitch_expense_amount),
        flitch_received_amount: g(grand.flitch_received_amount),
        flitch_received_expense_amount: g(grand.flitch_received_expense_amount),
        flitch_diff_amount: g(grand.flitch_diff_amount),
        flitch_diff_expense_amount: g(grand.flitch_diff_expense_amount),
        issue_for_slicing_amount: g(grand.issue_for_slicing_amount),
        issue_for_slicing_expense_amount: g(grand.issue_for_slicing_expense_amount),
        slicing_received_amount: g(grand.slicing_received_amount),
        slicing_received_expense_amount: g(grand.slicing_received_expense_amount),
        slicing_diff_amount: g(grand.slicing_diff_amount),
        slicing_diff_expense_amount: g(grand.slicing_diff_expense_amount),
        issue_for_sqedge_amount: g(grand.issue_for_sqedge_amount),
        issue_for_sqedge_expense_amount: g(grand.issue_for_sqedge_expense_amount),
        sales_amount: g(grand.sales_amount),
        sales_expense_amount: g(grand.sales_expense_amount),
        rejected_amount: g(grand.rejected_amount),
        rejected_expense_amount: g(grand.rejected_expense_amount),
        fl_closing_amount: g(grand.fl_closing_amount),
        fl_closing_expense_amount: g(grand.fl_closing_expense_amount),
      }),
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
    const fileName = `LogWiseFlitch_${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}/${filePath}`;
    console.log('Log wise flitch report generated =>', downloadLink);
    return downloadLink;
  } catch (error) {
    console.error('Error creating log wise flitch report:', error);
    throw new ApiError(500, error.message, error);
  }
};
