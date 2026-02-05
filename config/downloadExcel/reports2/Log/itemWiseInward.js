import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Item Wise Inward Report Excel
 * Generates comprehensive inventory report tracking complete journey of logs
 * from inward receipt through crosscutting, flitching, peeling, and sales
 * 
 * @param {Array} aggregatedData - Aggregated stock data by item_name
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createItemWiseInwardReportExcel = async (
  aggregatedData,
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
    const worksheet = workbook.addWorksheet('Item Wise Inward Report');

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
    let title = `Inward Item Wise Stock Details Between ${formattedStartDate} and ${formattedEndDate}`;
    if (filter?.item_name) {
      title = `Inward Item Wise Stock Details [ ${filter.item_name} ] Between ${formattedStartDate} and ${formattedEndDate}`;
    }

    console.log('Generated item wise inward report title:', title);

    // Define columns (15 columns)
    const columnDefinitions = [
      { key: 'item_name', width: 25 },          // 1. ItemName
      { key: 'opening_stock_cmt', width: 15 },  // 2. Opening Stock CMT
      { key: 'invoice_cmt', width: 12 },        // 3. Invoice (ROUND LOG)
      { key: 'indian_cmt', width: 12 },         // 4. Indian (ROUND LOG)
      { key: 'actual_cmt', width: 12 },         // 5. Actual (ROUND LOG)
      { key: 'issue_for_cc', width: 15 },       // 6. Issue for CC
      { key: 'cc_received', width: 15 },        // 7. CC Received
      { key: 'diff', width: 12 },               // 8. Diff
      { key: 'flitching', width: 12 },          // 9. Flitching
      { key: 'sawing', width: 12 },             // 10. Sawing (placeholder)
      { key: 'wooden_tile', width: 15 },        // 11. Wooden Tile (placeholder)
      { key: 'unedge', width: 12 },             // 12. UnEdge (placeholder)
      { key: 'peel', width: 12 },               // 13. Peel
      { key: 'sales', width: 12 },              // 14. Sales
      { key: 'closing_stock_cmt', width: 15 },  // 15. Closing Stock CMT
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all 15 columns)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 15);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Group headers (merged cells for grouped columns)
    const groupHeaderRow = worksheet.addRow([
      '', // ItemName - no group
      '', // Opening Stock CMT - no group
      'ROUND LOG DETAIL CMT', // Columns 3-5
      '', // (part of ROUND LOG)
      '', // (part of ROUND LOG)
      'Cross Cut Details CMT', // Columns 6-8
      '', // (part of Cross Cut)
      '', // (part of Cross Cut)
      '', // Flitching - no group
      '', // Sawing - no group
      'CrossCut Log Issue For CMT', // Columns 11-14
      '', // (part of CrossCut Log Issue)
      '', // (part of CrossCut Log Issue)
      '', // (part of CrossCut Log Issue)
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
    worksheet.mergeCells(3, 3, 3, 5);   // ROUND LOG DETAIL CMT (cols 3-5)
    worksheet.mergeCells(3, 6, 3, 8);   // Cross Cut Details CMT (cols 6-8)
    worksheet.mergeCells(3, 11, 3, 14); // CrossCut Log Issue For CMT (cols 11-14)

    // Row 4: Column headers
    const headerRow = worksheet.addRow([
      'ItemName',
      'Opening Stock CMT',
      'Invoice',
      'Indian',
      'Actual',
      'Issue for CC',
      'CC Received',
      'Diff',
      'Flitching',
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

    // Initialize grand totals
    const grandTotals = {
      opening_stock_cmt: 0,
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

    // Sort data by item_name
    const sortedData = [...aggregatedData].sort((a, b) => {
      const nameA = a.item_name || '';
      const nameB = b.item_name || '';
      return nameA.localeCompare(nameB);
    });

    // Add data rows
    sortedData.forEach((item) => {
      const rowData = {
        item_name: item.item_name || '',
        opening_stock_cmt: parseFloat(item.opening_stock_cmt || 0).toFixed(3),
        invoice_cmt: parseFloat(item.invoice_cmt || 0).toFixed(3),
        indian_cmt: parseFloat(item.indian_cmt || 0).toFixed(3),
        actual_cmt: parseFloat(item.actual_cmt || 0).toFixed(3),
        issue_for_cc: parseFloat(item.issue_for_cc || 0).toFixed(3),
        cc_received: parseFloat(item.cc_received || 0).toFixed(3),
        diff: parseFloat(item.diff || 0).toFixed(3),
        flitching: parseFloat(item.flitching || 0).toFixed(3),
        sawing: parseFloat(item.sawing || 0).toFixed(3),
        wooden_tile: parseFloat(item.wooden_tile || 0).toFixed(3),
        unedge: parseFloat(item.unedge || 0).toFixed(3),
        peel: parseFloat(item.peel || 0).toFixed(3),
        sales: parseFloat(item.sales || 0).toFixed(3),
        closing_stock_cmt: parseFloat(item.closing_stock_cmt || 0).toFixed(3),
      };

      worksheet.addRow(rowData);

      // Accumulate grand totals
      grandTotals.opening_stock_cmt += parseFloat(item.opening_stock_cmt || 0);
      grandTotals.invoice_cmt += parseFloat(item.invoice_cmt || 0);
      grandTotals.indian_cmt += parseFloat(item.indian_cmt || 0);
      grandTotals.actual_cmt += parseFloat(item.actual_cmt || 0);
      grandTotals.issue_for_cc += parseFloat(item.issue_for_cc || 0);
      grandTotals.cc_received += parseFloat(item.cc_received || 0);
      grandTotals.diff += parseFloat(item.diff || 0);
      grandTotals.flitching += parseFloat(item.flitching || 0);
      grandTotals.sawing += parseFloat(item.sawing || 0);
      grandTotals.wooden_tile += parseFloat(item.wooden_tile || 0);
      grandTotals.unedge += parseFloat(item.unedge || 0);
      grandTotals.peel += parseFloat(item.peel || 0);
      grandTotals.sales += parseFloat(item.sales || 0);
      grandTotals.closing_stock_cmt += parseFloat(item.closing_stock_cmt || 0);
    });

    // Add grand total row
    const totalRow = worksheet.addRow({
      item_name: 'Total',
      opening_stock_cmt: grandTotals.opening_stock_cmt.toFixed(3),
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
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // Save file
    const timeStamp = new Date().getTime();
    const fileName = `Item-Wise-Inward-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Item wise inward report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating item wise inward report:', error);
    throw new ApiError(500, error.message, error);
  }
};
