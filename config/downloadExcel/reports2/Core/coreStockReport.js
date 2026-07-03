import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Generate Core Stock Report Excel
 * Title: Core Stock Report - DD/MM/YYYY-DD/MM/YYYY
 * Columns: Item name, Thickness, Inward Date, Opening Balance, Received Metres, Issued Metres, Closing Bal.
 * Total row at bottom.
 *
 * @param {Array} aggregatedData - Aggregated stock data per (item_name, thickness)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const GenerateCoreStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {},
  includeCostAndExpense
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Core';

    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Core Stock Report');

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

    let title = `Core Stock Report - ${formattedStartDate}-${formattedEndDate}`;
    if (filter?.item_name) {
      title = `Core Stock Report [ ${filter.item_name} ] - ${formattedStartDate}-${formattedEndDate}`;
    }

    console.log('Generated core stock report title:', title);

    const columnDefinitions = [
      { key: 'item_name', width: 30 },
      { key: 'thickness', width: 15 },
      { key: 'inward_date', width: 22 },
      { key: 'opening_balance', width: 18 },
      ...(includeCostAndExpense ? [{ key: 'opening_amount', width: 18 }, { key: 'opening_expense_amount', width: 18 }] : []),
      { key: 'received_metres', width: 18 },
      ...(includeCostAndExpense ? [{ key: 'receive_amount', width: 18 }, { key: 'receive_expense_amount', width: 18 }] : []),
      { key: 'issued_metres', width: 18 },
      ...(includeCostAndExpense ? [{ key: 'issued_amount', width: 18 }] : []),
      { key: 'closing_bal', width: 18 },
      ...(includeCostAndExpense ? [{ key: 'closing_amount', width: 18 }, { key: 'closing_expense_amount', width: 18 }] : []),
    ];

    worksheet.columns = columnDefinitions;

    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 7);

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'Item name',
      'Thickness',
      'Inward Date',
      'Opening Balance',
      ...(includeCostAndExpense ? ['Opening Amount', 'Opening Expense Amount'] : []),
      'Received Metres',
      ...(includeCostAndExpense ? ['Received Amount', 'Received Expense Amount'] : []),
      'Issued Metres',
      ...(includeCostAndExpense ? ['Issued Amount'] : []),
      'Closing Bal',
      ...(includeCostAndExpense ? ['Closing Amount', 'Closing Expense Amount'] : []),
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
      ...(includeCostAndExpense ? { opening_amount: 0, opening_expense_amount: 0, receive_amount: 0, receive_expense_amount: 0, issued_amount: 0, closing_amount: 0, closing_expense_amount: 0 } : {}),
    };

    const groupedData = {};
    aggregatedData.forEach((row) => {
      const itemName = row.item_name || 'UNKNOWN';
      if (!groupedData[itemName]) {
        groupedData[itemName] = [];
      }
      groupedData[itemName].push(row);
    });

    const sortedItemNames = Object.keys(groupedData).sort();

    sortedItemNames.forEach((itemName) => {
      const items = groupedData[itemName];

      items.sort(
        (a, b) =>
          (a.thickness || 0) - (b.thickness || 0) ||
          new Date(a.inward_date) - new Date(b.inward_date)
      );

      let itemFirstOpening = null;
      let itemLastClosing = 0;
      let itemReceived = 0;
      let itemIssued = 0;
      let itemOpeningAmount = 0;
      let itemOpeningExpenseAmount = 0;
      let itemReceivedAmount = 0;
      let itemReceivedExpenseAmount = 0;
      let itemIssuedAmount = 0;
      let itemClosingAmount = 0;
      let itemClosingExpenseAmount = 0;

      let itemStartRow = null;

      items.forEach((item) => {
        if (itemFirstOpening === null) itemFirstOpening = parseFloat(item.opening_balance || 0);
        itemLastClosing = parseFloat(item.closing_bal || 0);
        itemReceived += parseFloat(item.received_metres || 0);
        itemIssued += parseFloat(item.issued_metres || 0);
        if (includeCostAndExpense) {
          itemOpeningAmount += parseFloat(item.opening_amount || 0);
          itemOpeningExpenseAmount += parseFloat(item.opening_expense_amount || 0);
          itemReceivedAmount += parseFloat(item.receive_amount || 0);
          itemReceivedExpenseAmount += parseFloat(item.receive_expense_amount || 0);
          itemIssuedAmount += parseFloat(item.issued_amount || 0);
          itemClosingAmount += parseFloat(item.closing_amount || 0);
          itemClosingExpenseAmount += parseFloat(item.closing_expense_amount || 0);
        }
        const rowData = {
          item_name: itemName,
          thickness: parseFloat(item.thickness || 0).toFixed(2),
          inward_date: formatDate(item.inward_date),
          opening_balance: parseFloat(item.opening_balance || 0).toFixed(2),
          received_metres: parseFloat(item.received_metres || 0).toFixed(2),
          issued_metres: parseFloat(item.issued_metres || 0).toFixed(2),
          closing_bal: parseFloat(item.closing_bal || 0).toFixed(2),
          ...(includeCostAndExpense ? { opening_amount: parseFloat(item.opening_amount || 0).toFixed(2), opening_expense_amount: parseFloat(item.opening_expense_amount || 0).toFixed(2), receive_amount: parseFloat(item.receive_amount || 0).toFixed(2), receive_expense_amount: parseFloat(item.receive_expense_amount || 0).toFixed(2), issued_amount: parseFloat(item.issued_amount || 0).toFixed(2), closing_amount: parseFloat(item.closing_amount || 0).toFixed(2), closing_expense_amount: parseFloat(item.closing_expense_amount || 0).toFixed(2) } : {}),
        };
        const row = worksheet.addRow(rowData);
        if (itemStartRow === null) itemStartRow = row.number;
      });

      const itemEndRow = worksheet.lastRow.number;
      if (itemStartRow !== null && itemEndRow >= itemStartRow) {
        worksheet.mergeCells(itemStartRow, 1, itemEndRow, 1);
        const mergedCell = worksheet.getCell(itemStartRow, 1);
        mergedCell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      const itemTotalRow = worksheet.addRow({
        item_name: '',
        thickness: 'Total',
        inward_date: '',
        opening_balance: (itemFirstOpening ?? 0).toFixed(2),
        received_metres: itemReceived.toFixed(2),
        issued_metres: itemIssued.toFixed(2),
        closing_bal: itemLastClosing.toFixed(2),
        ...(includeCostAndExpense ? { opening_amount: itemOpeningAmount.toFixed(2), opening_expense_amount: itemOpeningExpenseAmount.toFixed(2), receive_amount: itemReceivedAmount.toFixed(2), receive_expense_amount: itemReceivedExpenseAmount.toFixed(2), issued_amount: itemIssuedAmount.toFixed(2), closing_amount: itemClosingAmount.toFixed(2), closing_expense_amount: itemClosingExpenseAmount.toFixed(2) } : {}),
      });
      itemTotalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8E8E8' },
        };
      });

      grandTotals.opening_balance += itemFirstOpening ?? 0;
      grandTotals.received_metres += itemReceived;
      grandTotals.issued_metres += itemIssued;
      grandTotals.closing_bal += itemLastClosing;
      if (includeCostAndExpense) {
        grandTotals.opening_amount += itemOpeningAmount;
        grandTotals.opening_expense_amount += itemOpeningExpenseAmount;
        grandTotals.receive_amount += itemReceivedAmount;
        grandTotals.receive_expense_amount += itemReceivedExpenseAmount;
        grandTotals.issued_amount += itemIssuedAmount;
        grandTotals.closing_amount += itemClosingAmount;
        grandTotals.closing_expense_amount += itemClosingExpenseAmount;
      }
    });

    const totalRow = worksheet.addRow({
      item_name: '',
      thickness: 'Total',
      inward_date: '',
      opening_balance: grandTotals.opening_balance.toFixed(2),
      received_metres: grandTotals.received_metres.toFixed(2),
      issued_metres: grandTotals.issued_metres.toFixed(2),
      closing_bal: grandTotals.closing_bal.toFixed(2),
      ...(includeCostAndExpense ? { opening_amount: grandTotals.opening_amount.toFixed(2), opening_expense_amount: grandTotals.opening_expense_amount.toFixed(2), receive_amount: grandTotals.receive_amount.toFixed(2), receive_expense_amount: grandTotals.receive_expense_amount.toFixed(2), issued_amount: grandTotals.issued_amount.toFixed(2), closing_amount: grandTotals.closing_amount.toFixed(2), closing_expense_amount: grandTotals.closing_expense_amount.toFixed(2) } : {}),
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
    const fileName = `Core-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Core stock report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating core stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};
