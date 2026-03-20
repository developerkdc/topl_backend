import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

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

/**
 * Create Log Item Wise Inward Report Excel
 * Generates comprehensive inventory report tracking complete journey of individual logs
 * from inward receipt through crosscutting, flitching, peeling, and sales
 * Shows one row per log with item grouping
 * 
 * @param {Array} logData - Array of log data with calculated metrics
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createLogItemWiseInwardReportExcel = async (
  logData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Log';

    // Ensure folder exists
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Log Item Wise Inward Report');

    // Format dates for title
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (err) {
        return 'N/A';
      }
    };

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    // Build title
    const title = `Inward Item and Log Wise Stock Details Between ${formattedStartDate} and ${formattedEndDate}`;

    console.log('Generated log item wise inward report title:', title);

    // Define columns (25 columns) – Received CMT added after Opening Bal. CMT
    const columnDefinitions = [
      { key: 'item_name', width: 25 },            // 1. ItemName
      { key: 'log_no', width: 15 },               // 2. Log No
      { key: 'inward_date', width: 15 },          // 3. Inward Date
      { key: 'status', width: 12 },               // 4. Status
      { key: 'opening_balance_cmt', width: 15 },  // 5. Opening Bal. CMT
      { key: 'received_cmt', width: 15 },         // 6. Received CMT
      { key: 'recover_from_rejected', width: 15 },// 7. Recover From rejected
      { key: 'invoice_cmt', width: 12 },          // 8. Invoice
      { key: 'indian_cmt', width: 12 },           // 9. Indian
      { key: 'actual_cmt', width: 12 },           // 10. Actual
      { key: 'issue_for_cc', width: 15 },         // 11. Issue for CC
      { key: 'cc_received', width: 15 },          // 12. CC Received
      { key: 'cc_issued', width: 15 },            // 13. CC Issue
      { key: 'cc_diff', width: 12 },              // 14. CC Diff
      { key: 'issue_for_flitch', width: 15 },     // 15. Issue for Flitch
      { key: 'flitch_received', width: 15 },      // 16. Flitch Received
      { key: 'flitch_diff', width: 12 },          // 17. Flitch Diff
      { key: 'peeling_issued', width: 15 },       // 18. Issue for Peeling
      { key: 'peeling_received', width: 15 },     // 19. Peeling Received
      { key: 'peeling_diff', width: 12 },         // 20. Peeling Diff
      { key: 'issue_for_sqedge', width: 15 },     // 21. Issue for Sq.Edge
      { key: 'sales', width: 12 },                // 22. Sales
      { key: 'job_work_challan', width: 15 },     // 23. Job Work Challan
      { key: 'rejected', width: 12 },             // 24. Rejected
      { key: 'closing_stock_cmt', width: 15 },    // 25. Closing Stock CMT
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all columns)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 25);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Group headers (merged cells for grouped columns)
    const groupHeaderRow = worksheet.addRow([
      '', '', '', '', '', '', // cols 1-6: ItemName, Log No, Inward Date, Status, Opening Bal., Received CMT
      '', 'ROUND LOG DETAIL CMT', '', '', // cols 7-10: Recover From rejected, Invoice, Indian, Actual
      'Cross Cut Details CMT', '', '', '', // cols 11-14: Issue for CC, CC Received, CC Issue, CC Diff
      'Flitch Details CMT', '', '', // cols 15-17: Issue for Flitch, Flitch Received, Flitch Diff
      'Peeling Details CMT', '', '', // cols 18-20: Issue for Peeling, Peeling Received, Peeling Diff
      '', 'Round log +Cross Cut', '', '(Cc+Flitch+Peeling)', '', // cols 21-25: Sq.Edge, Sales, Job Work Challan, Rejected, Closing
    ]);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    groupHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    applyRowBorders(groupHeaderRow, 1, 25, { top: true, bottom: true });

    // Merge group headers (align with Item Wise report)
    worksheet.mergeCells(3, 8, 3, 10);  // ROUND LOG DETAIL CMT (cols 8-10: Invoice, Indian, Actual)
    worksheet.mergeCells(3, 11, 3, 14); // Cross Cut Details CMT (cols 11-14)
    worksheet.mergeCells(3, 15, 3, 17); // Flitch Details CMT (cols 15-17)
    worksheet.mergeCells(3, 18, 3, 20); // Peeling Details CMT (cols 18-20)

    // Row 4: Column headers
    const headerRow = worksheet.addRow([
      'ItemName',
      'Log No',
      'Inward Date',
      'Status',
      'Opening Bal. CMT',
      'Received CMT',
      'Recover From rejected',
      'Invoice',
      'Indian',
      'Actual',
      'Issue For CC',
      'CC Received',
      'CC Issue',
      'CC Diff',
      'Issue for Flitch',
      'Flitch Received',
      'Flitch Diff',
      'Issue for Peeling',
      'Peeling Received',
      'Peeling Diff',
      'Issue for Sq.Edge',
      'Sales',
      'Job Work Challan',
      'Rejected',
      'Closing Stock CMT',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    applyRowBorders(headerRow, 1, 25, { top: true, bottom: true });

    // Group data by item_name
    const groupedData = {};
    logData.forEach((log) => {
      const itemName = log.item_name || 'UNKNOWN';
      if (!groupedData[itemName]) {
        groupedData[itemName] = [];
      }
      groupedData[itemName].push(log);
    });

    // Initialize grand totals
    const grandTotals = {
      opening_balance_cmt: 0,
      received_cmt: 0,
      invoice_cmt: 0,
      indian_cmt: 0,
      actual_cmt: 0,
      recover_from_rejected: 0,
      issue_for_cc: 0,
      cc_received: 0,
      cc_issued: 0,
      cc_diff: 0,
      issue_for_flitch: 0,
      flitch_received: 0,
      flitch_diff: 0,
      issue_for_sqedge: 0,
      peeling_issued: 0,
      peeling_received: 0,
      peeling_diff: 0,
      sales: 0,
      job_work_challan: 0,
      rejected: 0,
      closing_stock_cmt: 0,
    };

    // Sort items alphabetically
    const sortedItemNames = Object.keys(groupedData).sort();

    // Add data rows grouped by item
    sortedItemNames.forEach((itemName) => {
      const logs = groupedData[itemName];
      const itemStartRow = worksheet.lastRow.number + 1;

      // Initialize item totals
      const itemTotals = {
        opening_balance_cmt: 0,
        received_cmt: 0,
        invoice_cmt: 0,
        indian_cmt: 0,
        actual_cmt: 0,
        recover_from_rejected: 0,
        issue_for_cc: 0,
        cc_received: 0,
        cc_issued: 0,
        cc_diff: 0,
        issue_for_flitch: 0,
        flitch_received: 0,
        flitch_diff: 0,
        issue_for_sqedge: 0,
        peeling_issued: 0,
        peeling_received: 0,
        peeling_diff: 0,
        sales: 0,
        job_work_challan: 0,
        rejected: 0,
        closing_stock_cmt: 0,
      };

      // Add each log for this item
      logs.forEach((log, index) => {
        const rowData = {
          item_name: index === 0 ? itemName : '', // Only show item name on first log
          log_no: log.log_no || '',
          inward_date: log.inward_date ? formatDate(log.inward_date) : '',
          status: log.status || '',
          opening_balance_cmt: parseFloat(log.opening_balance_cmt || 0).toFixed(3),
          received_cmt: parseFloat(log.received_cmt || 0).toFixed(3),
          invoice_cmt: parseFloat(log.invoice_cmt || 0).toFixed(3),
          indian_cmt: parseFloat(log.indian_cmt || 0).toFixed(3),
          actual_cmt: parseFloat(log.actual_cmt || 0).toFixed(3),
          recover_from_rejected: parseFloat(log.recover_from_rejected || 0).toFixed(3),
          issue_for_cc: parseFloat(log.issue_for_cc || 0).toFixed(3),
          cc_received: parseFloat(log.cc_received || 0).toFixed(3),
          cc_issued: parseFloat(log.cc_issued || 0).toFixed(3),
          cc_diff: parseFloat(log.cc_diff || 0).toFixed(3),
          issue_for_flitch: parseFloat(log.issue_for_flitch || 0).toFixed(3),
          flitch_received: parseFloat(log.flitch_received || 0).toFixed(3),
          flitch_diff: parseFloat(log.flitch_diff || 0).toFixed(3),
          issue_for_sqedge: parseFloat(log.issue_for_sqedge || 0).toFixed(3),
          peeling_issued: parseFloat(log.peeling_issued || 0).toFixed(3),
          peeling_received: parseFloat(log.peeling_received || 0).toFixed(3),
          peeling_diff: parseFloat(log.peeling_diff || 0).toFixed(3),
          sales: parseFloat(log.sales || 0).toFixed(3),
          job_work_challan: parseFloat(log.job_work_challan || 0).toFixed(3),
          rejected: parseFloat(log.rejected || 0).toFixed(3),
          closing_stock_cmt: parseFloat(log.closing_stock_cmt || 0).toFixed(3),
        };

        const dataRow = worksheet.addRow(rowData);
        applyRowBorders(dataRow, 1, 25, { top: false, bottom: true });

        // Accumulate item totals
        itemTotals.opening_balance_cmt += parseFloat(log.opening_balance_cmt || 0);
        itemTotals.received_cmt += parseFloat(log.received_cmt || 0);
        itemTotals.invoice_cmt += parseFloat(log.invoice_cmt || 0);
        itemTotals.indian_cmt += parseFloat(log.indian_cmt || 0);
        itemTotals.actual_cmt += parseFloat(log.actual_cmt || 0);
        itemTotals.recover_from_rejected += parseFloat(log.recover_from_rejected || 0);
        itemTotals.issue_for_cc += parseFloat(log.issue_for_cc || 0);
        itemTotals.cc_received += parseFloat(log.cc_received || 0);
        itemTotals.cc_issued += parseFloat(log.cc_issued || 0);
        itemTotals.cc_diff += parseFloat(log.cc_diff || 0);
        itemTotals.issue_for_flitch += parseFloat(log.issue_for_flitch || 0);
        itemTotals.flitch_received += parseFloat(log.flitch_received || 0);
        itemTotals.flitch_diff += parseFloat(log.flitch_diff || 0);
        itemTotals.issue_for_sqedge += parseFloat(log.issue_for_sqedge || 0);
        itemTotals.peeling_issued += parseFloat(log.peeling_issued || 0);
        itemTotals.peeling_received += parseFloat(log.peeling_received || 0);
        itemTotals.peeling_diff += parseFloat(log.peeling_diff || 0);
        itemTotals.sales += parseFloat(log.sales || 0);
        itemTotals.job_work_challan += parseFloat(log.job_work_challan || 0);
        itemTotals.rejected += parseFloat(log.rejected || 0);
        itemTotals.closing_stock_cmt += parseFloat(log.closing_stock_cmt || 0);
      });

      // Merge item_name cells vertically for this item
      if (logs.length > 1) {
        const itemEndRow = worksheet.lastRow.number;
        worksheet.mergeCells(itemStartRow, 1, itemEndRow, 1);
        worksheet.getRow(itemStartRow).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }

      // Add item total row
      const itemTotalRow = worksheet.addRow({
        item_name: '',
        log_no: 'Total',
        inward_date: '',
        status: '',
        opening_balance_cmt: itemTotals.opening_balance_cmt.toFixed(3),
        received_cmt: itemTotals.received_cmt.toFixed(3),
        invoice_cmt: itemTotals.invoice_cmt.toFixed(3),
        indian_cmt: itemTotals.indian_cmt.toFixed(3),
        actual_cmt: itemTotals.actual_cmt.toFixed(3),
        recover_from_rejected: itemTotals.recover_from_rejected.toFixed(3),
        issue_for_cc: itemTotals.issue_for_cc.toFixed(3),
        cc_received: itemTotals.cc_received.toFixed(3),
        cc_issued: itemTotals.cc_issued.toFixed(3),
        cc_diff: itemTotals.cc_diff.toFixed(3),
        issue_for_flitch: itemTotals.issue_for_flitch.toFixed(3),
        flitch_received: itemTotals.flitch_received.toFixed(3),
        flitch_diff: itemTotals.flitch_diff.toFixed(3),
        issue_for_sqedge: itemTotals.issue_for_sqedge.toFixed(3),
        peeling_issued: itemTotals.peeling_issued.toFixed(3),
        peeling_received: itemTotals.peeling_received.toFixed(3),
        peeling_diff: itemTotals.peeling_diff.toFixed(3),
        sales: itemTotals.sales.toFixed(3),
        job_work_challan: itemTotals.job_work_challan.toFixed(3),
        rejected: itemTotals.rejected.toFixed(3),
        closing_stock_cmt: itemTotals.closing_stock_cmt.toFixed(3),
      });
      itemTotalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      });
      applyRowBorders(itemTotalRow, 1, 25, { top: true, bottom: true });

      // Accumulate grand totals
      grandTotals.opening_balance_cmt += itemTotals.opening_balance_cmt;
      grandTotals.received_cmt += itemTotals.received_cmt;
      grandTotals.invoice_cmt += itemTotals.invoice_cmt;
      grandTotals.indian_cmt += itemTotals.indian_cmt;
      grandTotals.actual_cmt += itemTotals.actual_cmt;
      grandTotals.recover_from_rejected += itemTotals.recover_from_rejected;
      grandTotals.issue_for_cc += itemTotals.issue_for_cc;
      grandTotals.cc_received += itemTotals.cc_received;
      grandTotals.cc_issued += itemTotals.cc_issued;
      grandTotals.cc_diff += itemTotals.cc_diff;
      grandTotals.issue_for_flitch += itemTotals.issue_for_flitch;
      grandTotals.flitch_received += itemTotals.flitch_received;
      grandTotals.flitch_diff += itemTotals.flitch_diff;
      grandTotals.issue_for_sqedge += itemTotals.issue_for_sqedge;
      grandTotals.peeling_issued += itemTotals.peeling_issued;
      grandTotals.peeling_received += itemTotals.peeling_received;
      grandTotals.peeling_diff += itemTotals.peeling_diff;
      grandTotals.sales += itemTotals.sales;
      grandTotals.job_work_challan += itemTotals.job_work_challan;
      grandTotals.rejected += itemTotals.rejected;
      grandTotals.closing_stock_cmt += itemTotals.closing_stock_cmt;
    });

    // Add grand total row
    const grandTotalRow = worksheet.addRow({
      item_name: 'Total',
      log_no: '',
      inward_date: '',
      status: '',
      opening_balance_cmt: grandTotals.opening_balance_cmt.toFixed(3),
      received_cmt: grandTotals.received_cmt.toFixed(3),
      invoice_cmt: grandTotals.invoice_cmt.toFixed(3),
      indian_cmt: grandTotals.indian_cmt.toFixed(3),
      actual_cmt: grandTotals.actual_cmt.toFixed(3),
      recover_from_rejected: grandTotals.recover_from_rejected.toFixed(3),
      issue_for_cc: grandTotals.issue_for_cc.toFixed(3),
      cc_received: grandTotals.cc_received.toFixed(3),
      cc_issued: grandTotals.cc_issued.toFixed(3),
      cc_diff: grandTotals.cc_diff.toFixed(3),
      issue_for_flitch: grandTotals.issue_for_flitch.toFixed(3),
      flitch_received: grandTotals.flitch_received.toFixed(3),
      flitch_diff: grandTotals.flitch_diff.toFixed(3),
      issue_for_sqedge: grandTotals.issue_for_sqedge.toFixed(3),
      peeling_issued: grandTotals.peeling_issued.toFixed(3),
      peeling_received: grandTotals.peeling_received.toFixed(3),
      peeling_diff: grandTotals.peeling_diff.toFixed(3),
      sales: grandTotals.sales.toFixed(3),
      job_work_challan: grandTotals.job_work_challan.toFixed(3),
      rejected: grandTotals.rejected.toFixed(3),
      closing_stock_cmt: grandTotals.closing_stock_cmt.toFixed(3),
    });
    grandTotalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
    });
    applyRowBorders(grandTotalRow, 1, 25, { top: true, bottom: true });

    // Save file
    const timeStamp = new Date().getTime();
    const fileName = `Log-Item-Wise-Inward-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Log item wise inward report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating log item wise inward report:', error);
    throw new ApiError(500, error.message, error);
  }
};
