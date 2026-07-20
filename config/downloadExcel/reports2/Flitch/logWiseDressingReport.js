import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

const NUM_COLUMNS = 20;

/**
 * Create Log Wise Dressing Report Excel
 * Dressing Stock Register By LogX – one row per Log X, 20 columns, one Total row at end.
 *
 * @param {Array} rows - Array of log row data with all 20 fields
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createLogWiseDressingReportExcel = async (
  rows,
  startDate,
  endDate,
  filter = {},
  includeCostAndExpense
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Dressing';

    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Dressing Stock Register By LogX');

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
    const title = `Dressing Stock Register By LogX - ${formattedStartDate}-${formattedEndDate}`;

    const columnDefinitions = [
      { key: 'item_group_name', width: 22 },
      { key: 'item_name', width: 22 },
      { key: 'dressing_date', width: 14 },
      { key: 'log_x', width: 14 },
      { key: 'opening_balance', width: 14 },
      ...(includeCostAndExpense ? [{ key: 'opening_balance_amount', width: 14 }, { key: 'opening_balance_expense_amount', width: 14 }] : []),
      { key: 'purchase', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'purchase_amount', width: 14 }, { key: 'purchase_expense_amount', width: 14 }] : []),
      { key: 'receipt', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'receipt_amount', width: 14 }, { key: 'receipt_expense_amount', width: 14 }] : []),
      { key: 'issue_sq_mtr', width: 14 },
      ...(includeCostAndExpense ? [{ key: 'issue_amount', width: 14 }, { key: 'issue_expense_amount', width: 14 }] : []),
      { key: 'clipping', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'clipping_amount', width: 14 }, { key: 'clipping_expense_amount', width: 14 }] : []),
      { key: 'dyeing', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'dyeing_amount', width: 14 }, { key: 'dyeing_expense_amount', width: 14 }] : []),
      { key: 'mixmatch', width: 12 },
      { key: 'edgebanding', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'edgebanding_amount', width: 14 }, { key: 'edgebanding_expense_amount', width: 14 }] : []),
      { key: 'lipping', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'lipping_amount', width: 14 }, { key: 'lipping_expense_amount', width: 14 }] : []),
      { key: 'redressing', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'redressing_amount', width: 14 }, { key: 'redressing_expense_amount', width: 14 }] : []),
      { key: 'sale', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'sale_amount', width: 14 }, { key: 'sale_expense_amount', width: 14 }] : []),
      { key: 'closing_balance', width: 14 },
      { key: 'issue_from_old_balance', width: 18 },
      ...(includeCostAndExpense ? [{ key: 'issue_from_old_balance_amount', width: 14 }, { key: 'issue_from_old_balance_expense_amount', width: 14 }] : []),
      { key: 'closing_balance_old', width: 16 },
      { key: 'issue_from_new_balance', width: 18 },
      ...(includeCostAndExpense ? [{ key: 'issue_from_new_balance_amount', width: 14 }, { key: 'issue_from_new_balance_expense_amount', width: 14 }] : []),
      { key: 'closing_balance_new', width: 16 },
    ];
    worksheet.columns = columnDefinitions;

    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, NUM_COLUMNS);

    worksheet.addRow([]);

    const headers = [
      'Item Group Name',
      'Item Name',
      'Dressing Date',
      'Log X',
      'Opening Balance',
      ...(includeCostAndExpense ? ['Opening Balance Amount', 'Opening Balance Expense Amount'] : []),
      'Purchase',
      ...(includeCostAndExpense ? ['Purchase Amount', 'Purchase Expense Amount'] : []),
      'Receipt',
      ...(includeCostAndExpense ? ['Receipt Amount', 'Receipt Expense Amount'] : []),
      'Issue Sq Mtr',
      ...(includeCostAndExpense ? ['Issue Amount', 'Issue Expense Amount'] : []),
      'Clipping',
      ...(includeCostAndExpense ? ['Clipping Amount', 'Clipping Expense Amount'] : []),
      'Dyeing',
      ...(includeCostAndExpense ? ['Dyeing Amount', 'Dyeing Expense Amount'] : []),
      'Mixmatch',
      'Edgebanding',
      ...(includeCostAndExpense ? ['Edgebanding Amount', 'Edgebanding Expense Amount'] : []),
      'Lipping',
      ...(includeCostAndExpense ? ['Lipping Amount', 'Lipping Expense Amount'] : []),
      'Redressing',
      ...(includeCostAndExpense ? ['Redressing Amount', 'Redressing Expense Amount'] : []),
      'Sale',
      ...(includeCostAndExpense ? ['Sale Amount', 'Sale Expense Amount'] : []),
      'Closing Balance',
      'Issue From Old Balance',
      ...(includeCostAndExpense ? ['Issue From Old Balance Amount', 'Issue From Old Balance Expense Amount'] : []),
      'Closing Balance Old',
      'Issue From New Balance',
      ...(includeCostAndExpense ? ['Issue From New Balance Amount', 'Issue From New Balance Expense Amount'] : []),
      'Closing Balance New',
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const grandTotals = {
      opening_balance: 0,
      purchase: 0,
      receipt: 0,
      issue_sq_mtr: 0,
      clipping: 0,
      dyeing: 0,
      mixmatch: 0,
      edgebanding: 0,
      lipping: 0,
      redressing: 0,
      sale: 0,
      closing_balance: 0,
      issue_from_old_balance: 0,
      closing_balance_old: 0,
      issue_from_new_balance: 0,
      closing_balance_new: 0,
      ...(includeCostAndExpense ? {
        opening_balance_amount: 0,
        opening_balance_expense_amount: 0,
        purchase_amount: 0,
        purchase_expense_amount: 0,
        receipt_amount: 0,
        receipt_expense_amount: 0,
        issue_amount: 0,
        issue_expense_amount: 0,
        clipping_amount: 0,
        clipping_expense_amount: 0,
        dyeing_amount: 0,
        dyeing_expense_amount: 0,
        edgebanding_amount: 0,
        edgebanding_expense_amount: 0,
        lipping_amount: 0,
        lipping_expense_amount: 0,
        redressing_amount: 0,
        redressing_expense_amount: 0,
        sale_amount: 0,
        sale_expense_amount: 0,
        issue_from_old_balance_amount: 0,
        issue_from_old_balance_expense_amount: 0,
        issue_from_new_balance_amount: 0,
        issue_from_new_balance_expense_amount: 0,
      } : {}),
    };

    // Group by item_group_name + item_name for merging first column
    const groupKey = (r) => `${r.item_group_name || ''}|${r.item_name || ''}`;
    let currentGroup = null;
    let itemStartRow = null;

    rows.forEach((row, index) => {
      const key = groupKey(row);
      if (key !== currentGroup) {
        currentGroup = key;
        itemStartRow = worksheet.lastRow.number + 1;
      }

      const rowData = {
        item_group_name: index === 0 || groupKey(rows[index - 1]) !== key ? (row.item_group_name ?? '') : '',
        item_name: index === 0 || groupKey(rows[index - 1]) !== key ? (row.item_name ?? '') : '',
        dressing_date: row.dressing_date ?? '',
        log_x: row.log_x ?? '',
        opening_balance: parseFloat(row.opening_balance || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          opening_balance_amount: parseFloat(row.opening_balance_amount || 0).toFixed(2),
          opening_balance_expense_amount: parseFloat(row.opening_balance_expense_amount || 0).toFixed(2),
        } : {}),
        purchase: parseFloat(row.purchase || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          purchase_amount: parseFloat(row.purchase_amount || 0).toFixed(2),
          purchase_expense_amount: parseFloat(row.purchase_expense_amount || 0).toFixed(2),
        } : {}),
        receipt: parseFloat(row.receipt || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          receipt_amount: parseFloat(row.receipt_amount || 0).toFixed(2),
          receipt_expense_amount: parseFloat(row.receipt_expense_amount || 0).toFixed(2),
        } : {}),
        issue_sq_mtr: parseFloat(row.issue_sq_mtr || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          issue_amount: parseFloat(row.issue_amount || 0).toFixed(2),
          issue_expense_amount: parseFloat(row.issue_expense_amount || 0).toFixed(2),
        } : {}),
        clipping: parseFloat(row.clipping || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          clipping_amount: parseFloat(row.clipping_amount || 0).toFixed(2),
          clipping_expense_amount: parseFloat(row.clipping_expense_amount || 0).toFixed(2),
        } : {}),
        dyeing: parseFloat(row.dyeing || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          dyeing_amount: parseFloat(row.dyeing_amount || 0).toFixed(2),
          dyeing_expense_amount: parseFloat(row.dyeing_expense_amount || 0).toFixed(2),
        } : {}),
        mixmatch: parseFloat(row.mixmatch || 0).toFixed(2),
        edgebanding: parseFloat(row.edgebanding || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          edgebanding_amount: parseFloat(row.edgebanding_amount || 0).toFixed(2),
          edgebanding_expense_amount: parseFloat(row.edgebanding_expense_amount || 0).toFixed(2),
        } : {}),
        lipping: parseFloat(row.lipping || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          lipping_amount: parseFloat(row.lipping_amount || 0).toFixed(2),
          lipping_expense_amount: parseFloat(row.lipping_expense_amount || 0).toFixed(2),
        } : {}),
        redressing: parseFloat(row.redressing || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          redressing_amount: parseFloat(row.redressing_amount || 0).toFixed(2),
          redressing_expense_amount: parseFloat(row.redressing_expense_amount || 0).toFixed(2),
        } : {}),
        sale: parseFloat(row.sale || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          sale_amount: parseFloat(row.sale_amount || 0).toFixed(2),
          sale_expense_amount: parseFloat(row.sale_expense_amount || 0).toFixed(2),
        } : {}),
        closing_balance: parseFloat(row.closing_balance || 0).toFixed(2),
        issue_from_old_balance: parseFloat(row.issue_from_old_balance || 0).toFixed(2),
        closing_balance_old: parseFloat(row.closing_balance_old || 0).toFixed(2),
        issue_from_new_balance: parseFloat(row.issue_from_new_balance || 0).toFixed(2),
        closing_balance_new: parseFloat(row.closing_balance_new || 0).toFixed(2),
        ...(includeCostAndExpense ? {
          issue_from_old_balance_amount: parseFloat(row.issue_from_old_balance_amount || 0).toFixed(2),
          issue_from_old_balance_expense_amount: parseFloat(row.issue_from_old_balance_expense_amount || 0).toFixed(2),
          issue_from_new_balance_amount: parseFloat(row.issue_from_new_balance_amount || 0).toFixed(2),
          issue_from_new_balance_expense_amount: parseFloat(row.issue_from_new_balance_expense_amount || 0).toFixed(2),
        } : {}),
      };

      const dataRow = worksheet.addRow(rowData);
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      grandTotals.opening_balance += parseFloat(row.opening_balance || 0);
      grandTotals.purchase += parseFloat(row.purchase || 0);
      grandTotals.receipt += parseFloat(row.receipt || 0);
      grandTotals.issue_sq_mtr += parseFloat(row.issue_sq_mtr || 0);
      grandTotals.clipping += parseFloat(row.clipping || 0);
      grandTotals.dyeing += parseFloat(row.dyeing || 0);
      grandTotals.mixmatch += parseFloat(row.mixmatch || 0);
      grandTotals.edgebanding += parseFloat(row.edgebanding || 0);
      grandTotals.lipping += parseFloat(row.lipping || 0);
      grandTotals.redressing += parseFloat(row.redressing || 0);
      grandTotals.sale += parseFloat(row.sale || 0);
      grandTotals.closing_balance += parseFloat(row.closing_balance || 0);
      grandTotals.issue_from_old_balance += parseFloat(row.issue_from_old_balance || 0);
      grandTotals.closing_balance_old += parseFloat(row.closing_balance_old || 0);
      grandTotals.issue_from_new_balance += parseFloat(row.issue_from_new_balance || 0);
      grandTotals.closing_balance_new += parseFloat(row.closing_balance_new || 0);
      if (includeCostAndExpense) {
        grandTotals.opening_balance_amount += parseFloat(row.opening_balance_amount || 0);
        grandTotals.opening_balance_expense_amount += parseFloat(row.opening_balance_expense_amount || 0);
        grandTotals.purchase_amount += parseFloat(row.purchase_amount || 0);
        grandTotals.purchase_expense_amount += parseFloat(row.purchase_expense_amount || 0);
        grandTotals.receipt_amount += parseFloat(row.receipt_amount || 0);
        grandTotals.receipt_expense_amount += parseFloat(row.receipt_expense_amount || 0);
        grandTotals.issue_amount += parseFloat(row.issue_amount || 0);
        grandTotals.issue_expense_amount += parseFloat(row.issue_expense_amount || 0);
        grandTotals.clipping_amount += parseFloat(row.clipping_amount || 0);
        grandTotals.clipping_expense_amount += parseFloat(row.clipping_expense_amount || 0);
        grandTotals.dyeing_amount += parseFloat(row.dyeing_amount || 0);
        grandTotals.dyeing_expense_amount += parseFloat(row.dyeing_expense_amount || 0);
        grandTotals.edgebanding_amount += parseFloat(row.edgebanding_amount || 0);
        grandTotals.edgebanding_expense_amount += parseFloat(row.edgebanding_expense_amount || 0);
        grandTotals.lipping_amount += parseFloat(row.lipping_amount || 0);
        grandTotals.lipping_expense_amount += parseFloat(row.lipping_expense_amount || 0);
        grandTotals.redressing_amount += parseFloat(row.redressing_amount || 0);
        grandTotals.redressing_expense_amount += parseFloat(row.redressing_expense_amount || 0);
        grandTotals.sale_amount += parseFloat(row.sale_amount || 0);
        grandTotals.sale_expense_amount += parseFloat(row.sale_expense_amount || 0);
        grandTotals.issue_from_old_balance_amount += parseFloat(row.issue_from_old_balance_amount || 0);
        grandTotals.issue_from_old_balance_expense_amount += parseFloat(row.issue_from_old_balance_expense_amount || 0);
        grandTotals.issue_from_new_balance_amount += parseFloat(row.issue_from_new_balance_amount || 0);
        grandTotals.issue_from_new_balance_expense_amount += parseFloat(row.issue_from_new_balance_expense_amount || 0);
      }
    });

    // Merge item_group_name and item_name cells for consecutive same group+item
    const dataStartRow = 4; // row 1 title, 2 empty, 3 header
    let mergeStartRow = null;
    let mergeKey = null;
    for (let i = 0; i <= rows.length; i++) {
      const key = i < rows.length ? groupKey(rows[i]) : null;
      const rowNum = dataStartRow + i;
      if (key !== mergeKey) {
        if (mergeStartRow != null && mergeKey != null) {
          const endRow = rowNum - 1;
          if (endRow > mergeStartRow) {
            worksheet.mergeCells(mergeStartRow, 1, endRow, 1);
            worksheet.mergeCells(mergeStartRow, 2, endRow, 2);
          }
        }
        mergeStartRow = i < rows.length ? rowNum : null;
        mergeKey = key;
      }
    }

    // One Total row at the end
    const totalRow = worksheet.addRow({
      item_group_name: 'Total',
      item_name: '',
      dressing_date: '',
      log_x: '',
      opening_balance: grandTotals.opening_balance.toFixed(2),
      purchase: grandTotals.purchase.toFixed(2),
      receipt: grandTotals.receipt.toFixed(2),
      issue_sq_mtr: grandTotals.issue_sq_mtr.toFixed(2),
      clipping: grandTotals.clipping.toFixed(2),
      dyeing: grandTotals.dyeing.toFixed(2),
      mixmatch: grandTotals.mixmatch.toFixed(2),
      edgebanding: grandTotals.edgebanding.toFixed(2),
      lipping: grandTotals.lipping.toFixed(2),
      redressing: grandTotals.redressing.toFixed(2),
      sale: grandTotals.sale.toFixed(2),
      closing_balance: grandTotals.closing_balance.toFixed(2),
      issue_from_old_balance: grandTotals.issue_from_old_balance.toFixed(2),
      closing_balance_old: grandTotals.closing_balance_old.toFixed(2),
      issue_from_new_balance: grandTotals.issue_from_new_balance.toFixed(2),
      closing_balance_new: grandTotals.closing_balance_new.toFixed(2),
      ...(includeCostAndExpense ? {
        edgebanding_amount: grandTotals.edgebanding_amount.toFixed(2),
        edgebanding_expense_amount: grandTotals.edgebanding_expense_amount.toFixed(2),
        lipping_amount: grandTotals.lipping_amount.toFixed(2),
        lipping_expense_amount: grandTotals.lipping_expense_amount.toFixed(2),
        redressing_amount: grandTotals.redressing_amount.toFixed(2),
        redressing_expense_amount: grandTotals.redressing_expense_amount.toFixed(2),
        sale_amount: grandTotals.sale_amount.toFixed(2),
        sale_expense_amount: grandTotals.sale_expense_amount.toFixed(2),
        opening_balance_amount: grandTotals.opening_balance_amount.toFixed(2),
        opening_balance_expense_amount: grandTotals.opening_balance_expense_amount.toFixed(2),
        purchase_amount: grandTotals.purchase_amount.toFixed(2),
        purchase_expense_amount: grandTotals.purchase_expense_amount.toFixed(2),
        receipt_amount: grandTotals.receipt_amount.toFixed(2),
        receipt_expense_amount: grandTotals.receipt_expense_amount.toFixed(2),
        issue_amount: grandTotals.issue_amount.toFixed(2),
        issue_expense_amount: grandTotals.issue_expense_amount.toFixed(2),
        clipping_amount: grandTotals.clipping_amount.toFixed(2),
        clipping_expense_amount: grandTotals.clipping_expense_amount.toFixed(2),
        dyeing_amount: grandTotals.dyeing_amount.toFixed(2),
        dyeing_expense_amount: grandTotals.dyeing_expense_amount.toFixed(2),
        issue_from_old_balance_amount: grandTotals.issue_from_old_balance_amount.toFixed(2),
        issue_from_old_balance_expense_amount: grandTotals.issue_from_old_balance_expense_amount.toFixed(2),
        issue_from_new_balance_amount: grandTotals.issue_from_new_balance_amount.toFixed(2),
        issue_from_new_balance_expense_amount: grandTotals.issue_from_new_balance_expense_amount.toFixed(2),
      } : {}),
    });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const timeStamp = new Date().getTime();
    const fileName = `Dressing-Stock-Register-LogX-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}/${filePath}`;
    console.log('Log wise dressing report generated => ', downloadLink);
    return downloadLink;
  } catch (error) {
    console.error('Error creating log wise dressing report:', error);
    throw new ApiError(500, error.message, error);
  }
};
