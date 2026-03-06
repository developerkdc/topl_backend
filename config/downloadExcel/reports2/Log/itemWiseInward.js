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

    // Define columns (21 columns) matching screenshot order
    const columnDefinitions = [
      { key: 'item_name', width: 25 },            // 1. ItemName
      { key: 'opening_stock_cmt', width: 15 },    // 2. Opening Stock CMT
      { key: 'invoice_cmt', width: 12 },          // 3. Invoice
      { key: 'indian_cmt', width: 12 },           // 4. Indian
      { key: 'actual_cmt', width: 12 },           // 5. Actual
      { key: 'recover_from_rejected', width: 15 },// 6. Recover From rejected (empty)
      { key: 'issue_for_cc', width: 15 },         // 7. Issue for CC
      { key: 'cc_received', width: 15 },          // 8. CC Received
      { key: 'cc_issued', width: 15 },            // 9. CC Issue
      { key: 'cc_diff', width: 12 },              // 10. CC Diff
      { key: 'issue_for_flitch', width: 15 },     // 11. Issue for Flitch
      { key: 'flitch_received', width: 15 },      // 12. Flitch Received
      { key: 'flitch_diff', width: 12 },          // 13. Flitch Diff
      { key: 'peeling_issued', width: 15 },       // 14. Issue for Peeling
      { key: 'peeling_received', width: 15 },     // 15. Peeling Received
      { key: 'peeling_diff', width: 12 },         // 16. Peeling Diff
      { key: 'issue_for_sqedge', width: 15 },     // 17. Issue for Sq.Edge
      { key: 'sales', width: 12 },                // 18. Sales (Round log + Cross Cut)
      { key: 'job_work_challan', width: 15 },     // 19. Job Work Challan
      { key: 'rejected', width: 12 },             // 20. Rejected (Cc+Flitch+Peeling)
      { key: 'closing_stock_cmt', width: 15 },    // 21. Closing Stock CMT
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all columns)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 21);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Group headers (merged cells for grouped columns)
    const groupHeaderRow = worksheet.addRow([
      '', // col 1: ItemName
      '', // col 2: Opening Stock CMT
      'ROUND LOG DETAIL CMT', // col 3: Invoice (merged 3-5)
      '', // col 4: Indian (inside merge)
      '', // col 5: Actual (inside merge)
      '', // col 6: Recover From rejected
      'Cross Cut Details CMT', // col 7: Issue for CC (merged 7-10)
      '', // col 8: CC Received (inside merge)
      '', // col 9: CC Issue (inside merge)
      '', // col 10: CC Diff (inside merge)
      'Flitch Details CMT', // col 11: Issue for Flitch (merged 11-13)
      '', // col 12: Flitch Received (inside merge)
      '', // col 13: Flitch Diff (inside merge)
      'Peeling Details CMT', // col 14: Issue for Peeling (merged 14-16)
      '', // col 15: Peeling Received (inside merge)
      '', // col 16: Peeling Diff (inside merge)
      '', // col 17: Issue for Sq.Edge
      'Round log +Cross Cut', // col 18: Sales
      '', // col 19: Job Work Challan
      '(Cc+Flitch+Peeling)', // col 20: Rejected
      '', // col 21: Closing Stock CMT
    ]);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    groupHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Merge group headers
    worksheet.mergeCells(3, 3, 3, 5);   // ROUND LOG DETAIL CMT (cols 3-5: Invoice, Indian, Actual)
    worksheet.mergeCells(3, 7, 3, 10);  // Cross Cut Details CMT (cols 7-10: Issue for CC, CC Received, CC Issue, CC Diff)
    worksheet.mergeCells(3, 11, 3, 13); // Flitch Details CMT (cols 11-13: Issue for Flitch, Flitch Received, Flitch Diff)
    worksheet.mergeCells(3, 14, 3, 16); // Peeling Details CMT (cols 14-16: Issue for Peeling, Peeling Received, Peeling Diff)
    // col 17: Issue for Sq.Edge (standalone)
    // col 18: Round log +Cross Cut / Sales (standalone label)
    // col 19: Job Work Challan (standalone)
    // col 20: (Cc+Flitch+Peeling) / Rejected (standalone label)
    // col 21: Closing Stock CMT (standalone)

    // Row 4: Column headers
    const headerRow = worksheet.addRow([
      'ItemName',
      'Opening Stock CMT',
      'Invoice',
      'Indian',
      'Actual',
      'Recover From rejected',
      'Issue for CC',
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

    // Initialize grand totals
    const grandTotals = {
      opening_stock_cmt: 0,
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
        recover_from_rejected: parseFloat(item.recover_from_rejected || 0).toFixed(3),
        issue_for_cc: parseFloat(item.issue_for_cc || 0).toFixed(3),
        cc_received: parseFloat(item.cc_received || 0).toFixed(3),
        cc_issued: parseFloat(item.cc_issued || 0).toFixed(3),
        cc_diff: parseFloat(item.cc_diff || 0).toFixed(3),
        issue_for_flitch: parseFloat(item.issue_for_flitch || 0).toFixed(3),
        flitch_received: parseFloat(item.flitch_received || 0).toFixed(3),
        flitch_diff: parseFloat(item.flitch_diff || 0).toFixed(3),
        issue_for_sqedge: parseFloat(item.issue_for_sqedge || 0).toFixed(3),
        peeling_issued: parseFloat(item.peeling_issued || 0).toFixed(3),
        peeling_received: parseFloat(item.peeling_received || 0).toFixed(3),
        peeling_diff: parseFloat(item.peeling_diff || 0).toFixed(3),
        sales: parseFloat(item.sales || 0).toFixed(3),
        job_work_challan: parseFloat(item.job_work_challan || 0).toFixed(3),
        rejected: parseFloat(item.rejected || 0).toFixed(3),
        closing_stock_cmt: parseFloat(item.closing_stock_cmt || 0).toFixed(3),
      };

      worksheet.addRow(rowData);

      // Accumulate grand totals
      grandTotals.opening_stock_cmt += parseFloat(item.opening_stock_cmt || 0);
      grandTotals.invoice_cmt += parseFloat(item.invoice_cmt || 0);
      grandTotals.indian_cmt += parseFloat(item.indian_cmt || 0);
      grandTotals.actual_cmt += parseFloat(item.actual_cmt || 0);
      grandTotals.recover_from_rejected += parseFloat(item.recover_from_rejected || 0);
      grandTotals.issue_for_cc += parseFloat(item.issue_for_cc || 0);
      grandTotals.cc_received += parseFloat(item.cc_received || 0);
      grandTotals.cc_issued += parseFloat(item.cc_issued || 0);
      grandTotals.cc_diff += parseFloat(item.cc_diff || 0);
      grandTotals.issue_for_flitch += parseFloat(item.issue_for_flitch || 0);
      grandTotals.flitch_received += parseFloat(item.flitch_received || 0);
      grandTotals.flitch_diff += parseFloat(item.flitch_diff || 0);
      grandTotals.issue_for_sqedge += parseFloat(item.issue_for_sqedge || 0);
      grandTotals.peeling_issued += parseFloat(item.peeling_issued || 0);
      grandTotals.peeling_received += parseFloat(item.peeling_received || 0);
      grandTotals.peeling_diff += parseFloat(item.peeling_diff || 0);
      grandTotals.sales += parseFloat(item.sales || 0);
      grandTotals.job_work_challan += parseFloat(item.job_work_challan || 0);
      grandTotals.rejected += parseFloat(item.rejected || 0);
      grandTotals.closing_stock_cmt += parseFloat(item.closing_stock_cmt || 0);
    });

    // Add grand total row
    const totalRow = worksheet.addRow({
      item_name: 'Total',
      opening_stock_cmt: grandTotals.opening_stock_cmt.toFixed(3),
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
