import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Generate Face Stock Report Excel
 * Title: Face Stock Report - DD/MM/YYYY-DD/MM/YYYY
 * Columns: Item name, Thickness, Opening Balance, Received Metres, Issued Metres, Closing Bal.
 * Total row at bottom.
 *
 * @param {Array} aggregatedData - Aggregated stock data per (item_name, thickness)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const GenerateFaceStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Face';

    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Face Stock Report');

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

    let title = `Face Stock Report - ${formattedStartDate}-${formattedEndDate}`;
    if (filter?.item_name) {
      title = `Face Stock Report [ ${filter.item_name} ] - ${formattedStartDate}-${formattedEndDate}`;
    }

    console.log('Generated face stock report title:', title);

    const columnDefinitions = [
      { key: 'item_name', width: 30 },
      { key: 'thickness', width: 15 },
      { key: 'opening_balance', width: 18 },
      { key: 'received_metres', width: 18 },
      { key: 'issued_metres', width: 18 },
      { key: 'closing_bal', width: 18 },
    ];

    worksheet.columns = columnDefinitions;

    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 6);

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'Item name',
      'Thickness',
      'Opening Balance',
      'Received Metres',
      'Issued Metres',
      'Closing Bal',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    const grandTotals = {
      opening_balance: 0,
      received_metres: 0,
      issued_metres: 0,
      closing_bal: 0,
    };

    const groupedData = {};
    aggregatedData.forEach((item) => {
      const itemName = item.item_name || 'UNKNOWN';
      if (!groupedData[itemName]) {
        groupedData[itemName] = [];
      }
      groupedData[itemName].push(item);
    });

    const sortedItemNames = Object.keys(groupedData).sort();

    sortedItemNames.forEach((itemName) => {
      const items = groupedData[itemName];

      items.sort((a, b) => (a.thickness || 0) - (b.thickness || 0));

      const subtotals = {
        opening_balance: 0,
        received_metres: 0,
        issued_metres: 0,
        closing_bal: 0,
      };

      items.forEach((item) => {
        const rowData = {
          item_name: itemName,
          thickness: parseFloat(item.thickness || 0).toFixed(2),
          opening_balance: parseFloat(item.opening_balance || 0).toFixed(2),
          received_metres: parseFloat(item.received_metres || 0).toFixed(2),
          issued_metres: parseFloat(item.issued_metres || 0).toFixed(2),
          closing_bal: parseFloat(item.closing_bal || 0).toFixed(2),
        };

        worksheet.addRow(rowData);

        subtotals.opening_balance += parseFloat(item.opening_balance || 0);
        subtotals.received_metres += parseFloat(item.received_metres || 0);
        subtotals.issued_metres += parseFloat(item.issued_metres || 0);
        subtotals.closing_bal += parseFloat(item.closing_bal || 0);
      });

      const subtotalRow = worksheet.addRow({
        item_name: '',
        thickness: 'Total',
        opening_balance: subtotals.opening_balance.toFixed(2),
        received_metres: subtotals.received_metres.toFixed(2),
        issued_metres: subtotals.issued_metres.toFixed(2),
        closing_bal: subtotals.closing_bal.toFixed(2),
      });
      subtotalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' },
        };
      });

      grandTotals.opening_balance += subtotals.opening_balance;
      grandTotals.received_metres += subtotals.received_metres;
      grandTotals.issued_metres += subtotals.issued_metres;
      grandTotals.closing_bal += subtotals.closing_bal;
    });

    const totalRow = worksheet.addRow({
      item_name: '',
      thickness: 'Total',
      opening_balance: grandTotals.opening_balance.toFixed(2),
      received_metres: grandTotals.received_metres.toFixed(2),
      issued_metres: grandTotals.issued_metres.toFixed(2),
      closing_bal: grandTotals.closing_bal.toFixed(2),
    });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    const timeStamp = new Date().getTime();
    const fileName = `Face-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Face stock report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating face stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};
