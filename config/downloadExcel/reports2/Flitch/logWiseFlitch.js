import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Log Wise Flitch Report Excel
 * Generates comprehensive flitch inventory report tracking complete journey of individual flitch logs
 * from inward receipt through crosscutting, slicing, peeling, and sales
 * Shows one row per log with item grouping
 * 
 * @param {Array} logData - Array of flitch log data with calculated metrics
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createLogWiseFlitchReportExcel = async (
  logData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Flitch';

    // Ensure folder exists
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Log Wise Flitch Report');

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
    const title = `Logwise Flitch between ${formattedStartDate} and ${formattedEndDate}`;

    console.log('Generated log wise flitch report title:', title);

    // Define columns (11 columns)
    const columnDefinitions = [
      { key: 'item_name', width: 25 },       // 1. Item Name
      { key: 'log_no', width: 15 },          // 2. Log No
      { key: 'physical_cmt', width: 15 },    // 3. Physical CMT
      { key: 'cc_received', width: 15 },     // 4. CC Received
      { key: 'op_bal', width: 15 },          // 5. Op Bal
      { key: 'flitch_received', width: 15 }, // 6. Flitch Received
      { key: 'fl_issued', width: 15 },       // 7. FLIssued
      { key: 'fl_closing', width: 15 },      // 8. FLClosing
      { key: 'sq_received', width: 15 },     // 9. SQ Received
      { key: 'un_received', width: 15 },     // 10. UN Received
      { key: 'peel_received', width: 15 },   // 11. Peel Received
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all 11 columns)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 11);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Column headers
    const headerRow = worksheet.addRow([
      'Item Name',
      'Log No',
      'Physical CMT',
      'CC Received',
      'Op Bal',
      'Flitch Received',
      'FLIssued',
      'FLClosing',
      'SQ Received',
      'UN Received',
      'Peel Received',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Apply borders to header row
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

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
      physical_cmt: 0,
      cc_received: 0,
      op_bal: 0,
      flitch_received: 0,
      fl_issued: 0,
      fl_closing: 0,
      sq_received: 0,
      un_received: 0,
      peel_received: 0,
    };

    // Sort items alphabetically
    const sortedItemNames = Object.keys(groupedData).sort();

    // Add data rows grouped by item
    sortedItemNames.forEach((itemName) => {
      const logs = groupedData[itemName];
      const itemStartRow = worksheet.lastRow.number + 1;

      // Add each log for this item
      logs.forEach((log, index) => {
        const rowData = {
          item_name: index === 0 ? itemName : '', // Only show item name on first log
          log_no: log.log_no || '',
          physical_cmt: parseFloat(log.physical_cmt || 0).toFixed(3),
          cc_received: parseFloat(log.cc_received || 0).toFixed(3),
          op_bal: parseFloat(log.op_bal || 0).toFixed(3),
          flitch_received: parseFloat(log.flitch_received || 0).toFixed(3),
          fl_issued: parseFloat(log.fl_issued || 0).toFixed(3),
          fl_closing: parseFloat(log.fl_closing || 0).toFixed(3),
          sq_received: parseFloat(log.sq_received || 0).toFixed(3),
          un_received: parseFloat(log.un_received || 0).toFixed(3),
          peel_received: parseFloat(log.peel_received || 0).toFixed(3),
        };

        const dataRow = worksheet.addRow(rowData);

        // Apply borders to data row
        dataRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });

        // Accumulate grand totals
        grandTotals.physical_cmt += parseFloat(log.physical_cmt || 0);
        grandTotals.cc_received += parseFloat(log.cc_received || 0);
        grandTotals.op_bal += parseFloat(log.op_bal || 0);
        grandTotals.flitch_received += parseFloat(log.flitch_received || 0);
        grandTotals.fl_issued += parseFloat(log.fl_issued || 0);
        grandTotals.fl_closing += parseFloat(log.fl_closing || 0);
        grandTotals.sq_received += parseFloat(log.sq_received || 0);
        grandTotals.un_received += parseFloat(log.un_received || 0);
        grandTotals.peel_received += parseFloat(log.peel_received || 0);
      });

      // Merge item_name cells vertically for this item
      if (logs.length > 1) {
        const itemEndRow = worksheet.lastRow.number;
        worksheet.mergeCells(itemStartRow, 1, itemEndRow, 1);
        
        // Center align the merged item name cell
        const mergedCell = worksheet.getCell(itemStartRow, 1);
        mergedCell.alignment = { 
          vertical: 'middle', 
          horizontal: 'left',
          wrapText: true 
        };
      }
    });

    // Add grand total row
    const grandTotalRow = worksheet.addRow({
      item_name: 'Total',
      log_no: '',
      physical_cmt: grandTotals.physical_cmt.toFixed(3),
      cc_received: grandTotals.cc_received.toFixed(3),
      op_bal: grandTotals.op_bal.toFixed(3),
      flitch_received: grandTotals.flitch_received.toFixed(3),
      fl_issued: grandTotals.fl_issued.toFixed(3),
      fl_closing: grandTotals.fl_closing.toFixed(3),
      sq_received: grandTotals.sq_received.toFixed(3),
      un_received: grandTotals.un_received.toFixed(3),
      peel_received: grandTotals.peel_received.toFixed(3),
    });

    // Style grand total row
    grandTotalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFCC00' }, // Yellow background for total
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Save file
    const timeStamp = new Date().getTime();
    const fileName = `LogWiseFlitch_${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}/${filePath}`;
    console.log('Log wise flitch report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating log wise flitch report:', error);
    throw new ApiError(500, error.message, error);
  }
};
