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
 * Create Item Wise Inward Report Excel
 * Generates comprehensive inventory report tracking complete journey of logs
 * from inward receipt through crosscutting, flitching, peeling, and sales
 * 
 * @param {Array} aggregatedData - Aggregated stock data by item_name
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @param {boolean} includeCostAndExpense - Whether to include cost and expense columns
 * @returns {String} Download link for the generated Excel file
 */
export const createItemWiseInwardReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {},
  includeCostAndExpense = false
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

    const columnDefinitions = [];
    const groupHeaderValues = [];
    const headerValues = [];

    const addCol = (key, width, header, groupHeader = '') => {
      columnDefinitions.push({ key, width });
      groupHeaderValues.push(groupHeader);
      headerValues.push(header);
    };

    // Item Info
    addCol('item_name', 25, 'ItemName');
    addCol('opening_stock_cmt', 15, 'Opening Stock CMT');
    if (includeCostAndExpense) {
      addCol('opening_amount', 15, 'Opening Amount');
      addCol('opening_expense', 15, 'Opening Expense');
    }

    // ROUND LOG DETAIL CMT
    addCol('invoice_cmt', 12, 'Invoice', 'ROUND LOG DETAIL CMT');
    addCol('indian_cmt', 12, 'Indian', 'ROUND LOG DETAIL CMT');
    addCol('actual_cmt', 12, 'Actual', 'ROUND LOG DETAIL CMT');
    if (includeCostAndExpense) {
      addCol('amount', 12, 'Amount', 'ROUND LOG DETAIL CMT');
      addCol('expense_amount', 12, 'Expense Amount', 'ROUND LOG DETAIL CMT');
      addCol('total_amount', 12, 'Total Amount', 'ROUND LOG DETAIL CMT');
    }
    addCol('recover_from_rejected', 15, 'Recover From rejected', 'ROUND LOG DETAIL CMT');

    // Cross Cut Details CMT
    addCol('issue_for_cc', 15, 'Issue for CC', 'Cross Cut Details CMT');
    addCol('cc_received', 15, 'CC Received', 'Cross Cut Details CMT');
    addCol('cc_issued', 15, 'CC Issue', 'Cross Cut Details CMT');
    addCol('cc_diff', 12, 'CC Diff', 'Cross Cut Details CMT');
    if (includeCostAndExpense) {
      addCol('cc_cost_amount', 12, 'CC Cost Amount', 'Cross Cut Details CMT');
      addCol('cc_expense_amount', 12, 'CC Expense Amount', 'Cross Cut Details CMT');
      addCol('cc_total_amount', 12, 'CC Total Amount', 'Cross Cut Details CMT');
    }

    // Flitch Details CMT
    addCol('issue_for_flitch', 15, 'Issue for Flitch', 'Flitch Details CMT');
    addCol('flitch_received', 15, 'Flitch Received', 'Flitch Details CMT');
    addCol('flitch_diff', 12, 'Flitch Diff', 'Flitch Details CMT');
    if (includeCostAndExpense) {
      addCol('flitch_cost_amount', 12, 'Flitch Cost Amount', 'Flitch Details CMT');
      addCol('flitch_expense_amount', 12, 'Flitch Expense Amount', 'Flitch Details CMT');
      addCol('flitch_total_amount', 12, 'Flitch Total Amount', 'Flitch Details CMT');
    }

    // Peeling Details CMT
    addCol('peeling_issued', 15, 'Issue for Peeling', 'Peeling Details CMT');
    addCol('peeling_received', 15, 'Peeling Received', 'Peeling Details CMT');
    addCol('peeling_diff', 12, 'Peeling Diff', 'Peeling Details CMT');
    if (includeCostAndExpense) {
      addCol('peeling_cost_amount', 12, 'Peeling Cost Amount', 'Peeling Details CMT');
      addCol('peeling_expense_amount', 12, 'Peeling Expense Amount', 'Peeling Details CMT');
      addCol('peeling_total_amount', 12, 'Peeling Total Amount', 'Peeling Details CMT');
    }

    // Standalone detail columns
    addCol('issue_for_sqedge', 15, 'Issue for Sq.Edge');
    addCol('sales', 12, 'Sales', 'Round log +Cross Cut');
    addCol('job_work_challan', 15, 'Job Work Challan');
    addCol('rejected', 12, 'Rejected', '(Cc+Flitch+Peeling)');
    addCol('closing_stock_cmt', 15, 'Closing Stock CMT');
    if (includeCostAndExpense) {
      addCol('closing_amount', 15, 'Closing Amount');
      addCol('closing_expense', 15, 'Closing Expense');
    }

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all columns)
    const titleRow = worksheet.addRow([title]);
    const totalCols = columnDefinitions.length;
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, totalCols);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Group headers (merged cells for grouped columns)
    const groupHeaderRow = worksheet.addRow(groupHeaderValues);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    groupHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    applyRowBorders(groupHeaderRow, 1, totalCols, { top: true, bottom: true });

    // Merge group headers dynamically
    let startCol = 1;
    while (startCol <= totalCols) {
      const headerName = groupHeaderValues[startCol - 1];
      if (headerName !== '') {
        let endCol = startCol;
        while (endCol < totalCols && groupHeaderValues[endCol] === headerName) {
          endCol++;
        }
        if (endCol > startCol) {
          worksheet.mergeCells(3, startCol, 3, endCol);
        }
        startCol = endCol + 1;
      } else {
        startCol++;
      }
    }

    // Row 4: Column headers
    const headerRow = worksheet.addRow(headerValues);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    applyRowBorders(headerRow, 1, totalCols, { top: true, bottom: true });

    // Initialize grand totals
    const grandTotals = {
      opening_stock_cmt: 0,
      opening_amount: 0,
      opening_expense: 0,
      invoice_cmt: 0,
      indian_cmt: 0,
      actual_cmt: 0,
      amount: 0,
      expense_amount: 0,
      total_amount: 0,
      recover_from_rejected: 0,
      issue_for_cc: 0,
      cc_received: 0,
      cc_issued: 0,
      cc_diff: 0,
      cc_cost_amount: 0,
      cc_expense_amount: 0,
      cc_total_amount: 0,
      issue_for_flitch: 0,
      flitch_received: 0,
      flitch_diff: 0,
      flitch_cost_amount: 0,
      flitch_expense_amount: 0,
      flitch_total_amount: 0,
      issue_for_sqedge: 0,
      peeling_issued: 0,
      peeling_received: 0,
      peeling_diff: 0,
      peeling_cost_amount: 0,
      peeling_expense_amount: 0,
      peeling_total_amount: 0,
      sales: 0,
      job_work_challan: 0,
      rejected: 0,
      closing_stock_cmt: 0,
      closing_amount: 0,
      closing_expense: 0,
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
        ...(includeCostAndExpense ? {
          opening_amount: parseFloat(item.opening_amount || 0).toFixed(3),
          opening_expense: parseFloat(item.opening_expense || 0).toFixed(3),
        } : {}),
        invoice_cmt: parseFloat(item.invoice_cmt || 0).toFixed(3),
        indian_cmt: parseFloat(item.indian_cmt || 0).toFixed(3),
        actual_cmt: parseFloat(item.actual_cmt || 0).toFixed(3),
        ...(includeCostAndExpense ? {
          amount: parseFloat(item.amount || 0).toFixed(3),
          expense_amount: parseFloat(item.amount_expense || 0).toFixed(3),
          total_amount: (parseFloat(item.amount || 0) + parseFloat(item.amount_expense || 0)).toFixed(3),
        } : {}),
        recover_from_rejected: parseFloat(item.recover_from_rejected || 0).toFixed(3),
        issue_for_cc: parseFloat(item.issue_for_cc || 0).toFixed(3),
        cc_received: parseFloat(item.cc_received || 0).toFixed(3),
        cc_issued: parseFloat(item.cc_issued || 0).toFixed(3),
        cc_diff: parseFloat(item.cc_diff || 0).toFixed(3),
        ...(includeCostAndExpense ? {
          cc_cost_amount: parseFloat(item.cc_received_cost || 0).toFixed(3),
          cc_expense_amount: parseFloat(item.cc_received_expense || 0).toFixed(3),
          cc_total_amount: (parseFloat(item.cc_received_cost || 0) + parseFloat(item.cc_received_expense || 0)).toFixed(3),
        } : {}),
        issue_for_flitch: parseFloat(item.issue_for_flitch || 0).toFixed(3),
        flitch_received: parseFloat(item.flitch_received || 0).toFixed(3),
        flitch_diff: parseFloat(item.flitch_diff || 0).toFixed(3),
        ...(includeCostAndExpense ? {
          flitch_cost_amount: parseFloat(item.flitch_received_cost || 0).toFixed(3),
          flitch_expense_amount: parseFloat(item.flitch_received_expense || 0).toFixed(3),
          flitch_total_amount: (
            parseFloat(item.flitch_received_cost || 0) +
            parseFloat(item.flitch_received_expense || 0)
          ).toFixed(3),
        } : {}),
        issue_for_sqedge: parseFloat(item.issue_for_sqedge || 0).toFixed(3),
        peeling_issued: parseFloat(item.peeling_issued || 0).toFixed(3),
        peeling_received: parseFloat(item.peeling_received || 0).toFixed(3),
        peeling_diff: parseFloat(item.peeling_diff || 0).toFixed(3),
        ...(includeCostAndExpense ? {
          peeling_cost_amount: parseFloat(item.peeling_issued_cost || 0).toFixed(3),
          peeling_expense_amount: parseFloat(item.peeling_issued_expense || 0).toFixed(3),
          peeling_total_amount: (
            parseFloat(item.peeling_issued_cost || 0) +
            parseFloat(item.peeling_issued_expense || 0)
          ).toFixed(3),
        } : {}),
        sales: parseFloat(item.sales || 0).toFixed(3),
        job_work_challan: parseFloat(item.job_work_challan || 0).toFixed(3),
        rejected: parseFloat(item.rejected || 0).toFixed(3),
        closing_stock_cmt: parseFloat(item.closing_stock_cmt || 0).toFixed(3),
        ...(includeCostAndExpense ? {
          closing_amount: parseFloat(item.closing_amount || 0).toFixed(3),
          closing_expense: parseFloat(item.closing_expense || 0).toFixed(3),
        } : {}),
      };

      const dataRow = worksheet.addRow(rowData);
      applyRowBorders(dataRow, 1, totalCols, { top: false, bottom: true });

      // Accumulate grand totals
      grandTotals.opening_stock_cmt += parseFloat(item.opening_stock_cmt || 0);
      grandTotals.opening_amount += parseFloat(item.opening_amount || 0);
      grandTotals.opening_expense += parseFloat(item.opening_expense || 0);
      grandTotals.invoice_cmt += parseFloat(item.invoice_cmt || 0);
      grandTotals.indian_cmt += parseFloat(item.indian_cmt || 0);
      grandTotals.actual_cmt += parseFloat(item.actual_cmt || 0);
      grandTotals.amount += parseFloat(item.amount || 0);
      grandTotals.expense_amount += parseFloat(item.amount_expense || 0);
      grandTotals.total_amount += parseFloat(item.amount || 0) + parseFloat(item.amount_expense || 0);
      grandTotals.recover_from_rejected += parseFloat(item.recover_from_rejected || 0);
      grandTotals.issue_for_cc += parseFloat(item.issue_for_cc || 0);
      grandTotals.cc_received += parseFloat(item.cc_received || 0);
      grandTotals.cc_issued += parseFloat(item.cc_issued || 0);
      grandTotals.cc_diff += parseFloat(item.cc_diff || 0);
      grandTotals.cc_cost_amount += parseFloat(item.cc_received_cost || 0);
      grandTotals.cc_expense_amount += parseFloat(item.cc_received_expense || 0);
      grandTotals.cc_total_amount += parseFloat(item.cc_received_cost || 0) + parseFloat(item.cc_received_expense || 0);
      grandTotals.issue_for_flitch += parseFloat(item.issue_for_flitch || 0);
      grandTotals.flitch_received += parseFloat(item.flitch_received || 0);
      grandTotals.flitch_diff += parseFloat(item.flitch_diff || 0);
      grandTotals.flitch_cost_amount += parseFloat(item.flitch_received_cost || 0);
      grandTotals.flitch_expense_amount += parseFloat(item.flitch_received_expense || 0);
      grandTotals.flitch_total_amount += parseFloat(item.flitch_received_cost || 0) + parseFloat(item.flitch_received_expense || 0);
      grandTotals.issue_for_sqedge += parseFloat(item.issue_for_sqedge || 0);
      grandTotals.peeling_issued += parseFloat(item.peeling_issued || 0);
      grandTotals.peeling_received += parseFloat(item.peeling_received || 0);
      grandTotals.peeling_diff += parseFloat(item.peeling_diff || 0);
      grandTotals.peeling_cost_amount += parseFloat(item.peeling_issued_cost || 0);
      grandTotals.peeling_expense_amount += parseFloat(item.peeling_issued_expense || 0);
      grandTotals.peeling_total_amount += parseFloat(item.peeling_issued_cost || 0) + parseFloat(item.peeling_issued_expense || 0);
      grandTotals.sales += parseFloat(item.sales || 0);
      grandTotals.job_work_challan += parseFloat(item.job_work_challan || 0);
      grandTotals.rejected += parseFloat(item.rejected || 0);
      grandTotals.closing_stock_cmt += parseFloat(item.closing_stock_cmt || 0);
      grandTotals.closing_amount += parseFloat(item.closing_amount || 0);
      grandTotals.closing_expense += parseFloat(item.closing_expense || 0);
    });

    // Add grand total row
    const totalRow = worksheet.addRow({
      item_name: 'Total',
      opening_stock_cmt: grandTotals.opening_stock_cmt.toFixed(3),
      opening_amount: grandTotals.opening_amount.toFixed(3),
      opening_expense: grandTotals.opening_expense.toFixed(3),
      invoice_cmt: grandTotals.invoice_cmt.toFixed(3),
      indian_cmt: grandTotals.indian_cmt.toFixed(3),
      actual_cmt: grandTotals.actual_cmt.toFixed(3),
      amount: grandTotals.amount.toFixed(3),
      expense_amount: grandTotals.expense_amount.toFixed(3),
      total_amount: grandTotals.total_amount.toFixed(3),
      recover_from_rejected: grandTotals.recover_from_rejected.toFixed(3),
      issue_for_cc: grandTotals.issue_for_cc.toFixed(3),
      cc_received: grandTotals.cc_received.toFixed(3),
      cc_issued: grandTotals.cc_issued.toFixed(3),
      cc_diff: grandTotals.cc_diff.toFixed(3),
      cc_cost_amount: grandTotals.cc_cost_amount.toFixed(3),
      cc_expense_amount: grandTotals.cc_expense_amount.toFixed(3),
      cc_total_amount: grandTotals.cc_total_amount.toFixed(3),
      issue_for_flitch: grandTotals.issue_for_flitch.toFixed(3),
      flitch_received: grandTotals.flitch_received.toFixed(3),
      flitch_diff: grandTotals.flitch_diff.toFixed(3),
      flitch_cost_amount: grandTotals.flitch_cost_amount.toFixed(3),
      flitch_expense_amount: grandTotals.flitch_expense_amount.toFixed(3),
      flitch_total_amount: grandTotals.flitch_total_amount.toFixed(3),
      issue_for_sqedge: grandTotals.issue_for_sqedge.toFixed(3),
      peeling_issued: grandTotals.peeling_issued.toFixed(3),
      peeling_received: grandTotals.peeling_received.toFixed(3),
      peeling_diff: grandTotals.peeling_diff.toFixed(3),
      peeling_cost_amount: grandTotals.peeling_cost_amount.toFixed(3),
      peeling_expense_amount: grandTotals.peeling_expense_amount.toFixed(3),
      peeling_total_amount: grandTotals.peeling_total_amount.toFixed(3),
      sales: grandTotals.sales.toFixed(3),
      job_work_challan: grandTotals.job_work_challan.toFixed(3),
      rejected: grandTotals.rejected.toFixed(3),
      closing_stock_cmt: grandTotals.closing_stock_cmt.toFixed(3),
      closing_amount: grandTotals.closing_amount.toFixed(3),
      closing_expense: grandTotals.closing_expense.toFixed(3),
    });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });
    applyRowBorders(totalRow, 1, totalCols, { top: true, bottom: true });

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
