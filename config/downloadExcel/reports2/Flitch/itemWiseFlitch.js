import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Item Wise Flitch Report Excel
 * Generates comprehensive flitch inventory report tracking movements
 * including opening balance, crosscut received, flitch received, issued, and closing balance
 * 
 * @param {Array} aggregatedData - Aggregated stock data by item_name
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createItemWiseFlitchReportExcel = async (
  aggregatedData,
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
    const worksheet = workbook.addWorksheet('Item Wise Flitch Report');

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
    let title = `Itemwise Flitch between ${formattedStartDate} and ${formattedEndDate}`;
    if (filter?.item_name) {
      title = `Itemwise Flitch [ ${filter.item_name} ] between ${formattedStartDate} and ${formattedEndDate}`;
    }

    console.log('Generated item wise flitch report title:', title);

    // Define columns (7 columns)
    const columnDefinitions = [
      { key: 'item_name', width: 25 },          // 1. Item Name
      { key: 'physical_gmt', width: 15 },       // 2. Physical GMT
      { key: 'cc_received', width: 15 },        // 3. CC Received
      { key: 'opening_balance', width: 15 },    // 4. Op Bal
      { key: 'flitch_received', width: 15 },    // 5. Flitch Received
      { key: 'flitch_issued', width: 15 },      // 6. FL Issued
      { key: 'closing_balance', width: 15 },    // 7. FL Closing
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all 7 columns)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 7);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Column headers
    const headerRow = worksheet.addRow([
      'Item Name',
      'Physical GMT',
      'CC Received',
      'Op Bal',
      'Flitch Received',
      'FL Issued',
      'FL Closing',
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
      physical_gmt: 0,
      cc_received: 0,
      opening_balance: 0,
      flitch_received: 0,
      flitch_issued: 0,
      closing_balance: 0,
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
        physical_gmt: parseFloat(item.physical_gmt || 0).toFixed(3),
        cc_received: parseFloat(item.cc_received || 0).toFixed(3),
        opening_balance: parseFloat(item.opening_balance || 0).toFixed(3),
        flitch_received: parseFloat(item.flitch_received || 0).toFixed(3),
        flitch_issued: parseFloat(item.flitch_issued || 0).toFixed(3),
        closing_balance: parseFloat(item.closing_balance || 0).toFixed(3),
      };

      worksheet.addRow(rowData);

      // Accumulate grand totals
      grandTotals.physical_gmt += parseFloat(item.physical_gmt || 0);
      grandTotals.cc_received += parseFloat(item.cc_received || 0);
      grandTotals.opening_balance += parseFloat(item.opening_balance || 0);
      grandTotals.flitch_received += parseFloat(item.flitch_received || 0);
      grandTotals.flitch_issued += parseFloat(item.flitch_issued || 0);
      grandTotals.closing_balance += parseFloat(item.closing_balance || 0);
    });

    // Add grand total row
    const totalRow = worksheet.addRow({
      item_name: 'Total',
      physical_gmt: grandTotals.physical_gmt.toFixed(3),
      cc_received: grandTotals.cc_received.toFixed(3),
      opening_balance: grandTotals.opening_balance.toFixed(3),
      flitch_received: grandTotals.flitch_received.toFixed(3),
      flitch_issued: grandTotals.flitch_issued.toFixed(3),
      closing_balance: grandTotals.closing_balance.toFixed(3),
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
    const fileName = `Item-Wise-Flitch-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Item wise flitch report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating item wise flitch report:', error);
    throw new ApiError(500, error.message, error);
  }
};
