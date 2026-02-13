import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

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

    // Define columns (16 columns)
    const columnDefinitions = [
      { key: 'item_name', width: 25 },            // 1. ItemName
      { key: 'log_no', width: 15 },               // 2. Log No
      { key: 'opening_balance_cmt', width: 15 },  // 3. Opening Bal. CMT
      { key: 'invoice_cmt', width: 12 },          // 4. Invoice (ROUND LOG)
      { key: 'indian_cmt', width: 12 },           // 5. Indian (ROUND LOG)
      { key: 'actual_cmt', width: 12 },           // 6. Actual (ROUND LOG)
      { key: 'issue_for_cc', width: 15 },         // 7. Issue for CC
      { key: 'cc_received', width: 15 },          // 8. CC Received
      { key: 'diff', width: 12 },                 // 9. Diff
      { key: 'flitching', width: 12 },            // 10. Flitching
      { key: 'sawing', width: 12 },               // 11. Sawing
      { key: 'wooden_tile', width: 15 },          // 12. Wooden Tile
      { key: 'unedge', width: 12 },               // 13. UnEdge
      { key: 'peel', width: 12 },                 // 14. Peel
      { key: 'sales', width: 12 },                // 15. Sales
      { key: 'closing_stock_cmt', width: 15 },    // 16. Closing Stock CMT
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all 16 columns)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 16);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Group headers (merged cells for grouped columns)
    const groupHeaderRow = worksheet.addRow([
      '', // ItemName - no group
      '', // Log No - no group
      '', // Opening Bal. CMT - no group
      'ROUND LOG DETAIL CMT', // Columns 4-6
      '', // (part of ROUND LOG)
      '', // (part of ROUND LOG)
      'Cross Cut Details CMT', // Columns 7-9
      '', // (part of Cross Cut)
      '', // (part of Cross Cut)
      '', // Flitching - no group (starts CrossCut Log Issue For)
      '', // Sawing
      'CrossCut Log Issue For CMT', // Columns 12-14 (merged label)
      '', // (part of CrossCut Log Issue)
      '', // (part of CrossCut Log Issue)
      '', // Sales - no group
      '', // Closing Stock CMT - no group
    ]);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    groupHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Merge group headers
    worksheet.mergeCells(3, 4, 3, 6);   // ROUND LOG DETAIL CMT (cols 4-6)
    worksheet.mergeCells(3, 7, 3, 9);   // Cross Cut Details CMT (cols 7-9)
    worksheet.mergeCells(3, 10, 3, 14); // CrossCut Log Issue For CMT (cols 10-14)

    // Row 4: Column headers
    const headerRow = worksheet.addRow([
      'ItemName',
      'Log No',
      'Opening Bal. CMT',
      'Invoice',
      'Indian',
      'Actual',
      'Issue For CC',
      'CC Received',
      'DIFF',
      'Flitch',
      'Sawing',
      'Wooden Tile',
      'UnEdge',
      'Peel',
      'Sales',
      'Closing Stock CMT',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

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
      invoice_cmt: 0,
      indian_cmt: 0,
      actual_cmt: 0,
      issue_for_cc: 0,
      cc_received: 0,
      diff: 0,
      flitching: 0,
      sawing: 0,
      wooden_tile: 0,
      unedge: 0,
      peel: 0,
      sales: 0,
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
        invoice_cmt: 0,
        indian_cmt: 0,
        actual_cmt: 0,
        issue_for_cc: 0,
        cc_received: 0,
        diff: 0,
        flitching: 0,
        sawing: 0,
        wooden_tile: 0,
        unedge: 0,
        peel: 0,
        sales: 0,
        closing_stock_cmt: 0,
      };

      // Add each log for this item
      logs.forEach((log, index) => {
        const rowData = {
          item_name: index === 0 ? itemName : '', // Only show item name on first log
          log_no: log.log_no || '',
          opening_balance_cmt: parseFloat(log.opening_balance_cmt || 0).toFixed(3),
          invoice_cmt: parseFloat(log.invoice_cmt || 0).toFixed(3),
          indian_cmt: parseFloat(log.indian_cmt || 0).toFixed(3),
          actual_cmt: parseFloat(log.actual_cmt || 0).toFixed(3),
          issue_for_cc: parseFloat(log.issue_for_cc || 0).toFixed(3),
          cc_received: parseFloat(log.cc_received || 0).toFixed(3),
          diff: parseFloat(log.diff || 0).toFixed(3),
          flitching: parseFloat(log.flitching || 0).toFixed(3),
          sawing: parseFloat(log.sawing || 0).toFixed(3),
          wooden_tile: parseFloat(log.wooden_tile || 0).toFixed(3),
          unedge: parseFloat(log.unedge || 0).toFixed(3),
          peel: parseFloat(log.peel || 0).toFixed(3),
          sales: parseFloat(log.sales || 0).toFixed(3),
          closing_stock_cmt: parseFloat(log.closing_stock_cmt || 0).toFixed(3),
        };

        worksheet.addRow(rowData);

        // Accumulate item totals
        itemTotals.opening_balance_cmt += parseFloat(log.opening_balance_cmt || 0);
        itemTotals.invoice_cmt += parseFloat(log.invoice_cmt || 0);
        itemTotals.indian_cmt += parseFloat(log.indian_cmt || 0);
        itemTotals.actual_cmt += parseFloat(log.actual_cmt || 0);
        itemTotals.issue_for_cc += parseFloat(log.issue_for_cc || 0);
        itemTotals.cc_received += parseFloat(log.cc_received || 0);
        itemTotals.diff += parseFloat(log.diff || 0);
        itemTotals.flitching += parseFloat(log.flitching || 0);
        itemTotals.sawing += parseFloat(log.sawing || 0);
        itemTotals.wooden_tile += parseFloat(log.wooden_tile || 0);
        itemTotals.unedge += parseFloat(log.unedge || 0);
        itemTotals.peel += parseFloat(log.peel || 0);
        itemTotals.sales += parseFloat(log.sales || 0);
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
        opening_balance_cmt: itemTotals.opening_balance_cmt.toFixed(3),
        invoice_cmt: itemTotals.invoice_cmt.toFixed(3),
        indian_cmt: itemTotals.indian_cmt.toFixed(3),
        actual_cmt: itemTotals.actual_cmt.toFixed(3),
        issue_for_cc: itemTotals.issue_for_cc.toFixed(3),
        cc_received: itemTotals.cc_received.toFixed(3),
        diff: itemTotals.diff.toFixed(3),
        flitching: itemTotals.flitching.toFixed(3),
        sawing: itemTotals.sawing.toFixed(3),
        wooden_tile: itemTotals.wooden_tile.toFixed(3),
        unedge: itemTotals.unedge.toFixed(3),
        peel: itemTotals.peel.toFixed(3),
        sales: itemTotals.sales.toFixed(3),
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

      // Accumulate grand totals
      grandTotals.opening_balance_cmt += itemTotals.opening_balance_cmt;
      grandTotals.invoice_cmt += itemTotals.invoice_cmt;
      grandTotals.indian_cmt += itemTotals.indian_cmt;
      grandTotals.actual_cmt += itemTotals.actual_cmt;
      grandTotals.issue_for_cc += itemTotals.issue_for_cc;
      grandTotals.cc_received += itemTotals.cc_received;
      grandTotals.diff += itemTotals.diff;
      grandTotals.flitching += itemTotals.flitching;
      grandTotals.sawing += itemTotals.sawing;
      grandTotals.wooden_tile += itemTotals.wooden_tile;
      grandTotals.unedge += itemTotals.unedge;
      grandTotals.peel += itemTotals.peel;
      grandTotals.sales += itemTotals.sales;
      grandTotals.closing_stock_cmt += itemTotals.closing_stock_cmt;
    });

    // Add grand total row
    const grandTotalRow = worksheet.addRow({
      item_name: 'Total',
      log_no: '',
      opening_balance_cmt: grandTotals.opening_balance_cmt.toFixed(3),
      invoice_cmt: grandTotals.invoice_cmt.toFixed(3),
      indian_cmt: grandTotals.indian_cmt.toFixed(3),
      actual_cmt: grandTotals.actual_cmt.toFixed(3),
      issue_for_cc: grandTotals.issue_for_cc.toFixed(3),
      cc_received: grandTotals.cc_received.toFixed(3),
      diff: grandTotals.diff.toFixed(3),
      flitching: grandTotals.flitching.toFixed(3),
      sawing: grandTotals.sawing.toFixed(3),
      wooden_tile: grandTotals.wooden_tile.toFixed(3),
      unedge: grandTotals.unedge.toFixed(3),
      peel: grandTotals.peel.toFixed(3),
      sales: grandTotals.sales.toFixed(3),
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
