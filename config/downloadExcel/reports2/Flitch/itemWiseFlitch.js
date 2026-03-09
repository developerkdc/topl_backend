import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Item Wise Flitch Report Excel
 * 20 columns with group headers:
 *   Round Log Detail CMT (Invoice, Indian, Actual)
 *   Cross Cut Details CMT (Issue for CC, CC Received, CC Issue, CC Diff)
 *   Flitch Details CMT (Issue for Flitch, Flitch Received, Flitch Diff)
 *   Peeling Details CMT (Issue for Peeling, Peeling Received, Peeling Diff)
 *   Round log +Cross Cut (Sales)
 *   (Cc+Flitch+Peeling) (Rejected)
 *
 * @param {Array} aggregatedData - 20-field stock data by item_name
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

    try {
      await fs.access(folderPath);
    } catch {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Item Wise Flitch Report');

    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return 'N/A';
      }
    };

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    let title = `Inward Item Wise Report From ${formattedStartDate} to ${formattedEndDate}`;
    if (filter?.item_name) {
      title = `Inward Item Wise Report [ ${filter.item_name} ] From ${formattedStartDate} to ${formattedEndDate}`;
    }

    console.log('Generated item wise flitch report title:', title);

    // 20 columns
    const columnDefinitions = [
      { key: 'item_name',             width: 25 }, // 1.  ItemName
      { key: 'opening_stock_cmt',     width: 16 }, // 2.  Opening Stock CMT
      { key: 'invoice_cmt',           width: 12 }, // 3.  Invoice    ┐ Round Log Detail CMT
      { key: 'indian_cmt',            width: 12 }, // 4.  Indian     │
      { key: 'actual_cmt',            width: 12 }, // 5.  Actual     ┘
      { key: 'recover_from_rejected', width: 18 }, // 6.  Recover From rejected (standalone)
      { key: 'issue_for_cc',         width: 14 }, // 7.  Issue for CC   ┐ Cross Cut Details CMT
      { key: 'cc_received',           width: 14 }, // 8.  CC Received   │
      { key: 'cc_issued',             width: 12 }, // 9.  CC Issue      │
      { key: 'cc_diff',               width: 12 }, // 10. CC Diff       ┘
      { key: 'issue_for_flitch',     width: 15 }, // 11. Issue for Flitch ┐ Flitch Details CMT
      { key: 'flitch_received',       width: 15 }, // 12. Flitch Received │
      { key: 'flitch_diff',           width: 12 }, // 13. Flitch Diff     ┘
      { key: 'issue_for_peeling',    width: 16 }, // 14. Issue for Peeling ┐ Peeling Details CMT
      { key: 'peeling_received',      width: 16 }, // 15. Peeling Received  │
      { key: 'peeling_diff',         width: 12 }, // 16. Peeling Diff     ┘
      { key: 'issue_for_sqedge',     width: 16 }, // 17. Issue for Sq.Edge (standalone)
      { key: 'sales',                 width: 12 }, // 18. Sales (Round log +Cross Cut)
      { key: 'rejected',              width: 12 }, // 19. Rejected ((Cc+Flitch+Peeling))
      { key: 'closing_stock_cmt',     width: 16 }, // 20. Closing Stock CMT
    ];

    worksheet.columns = columnDefinitions;

    const TOTAL_COLS = 20;

    // Row 1: Title merged across all 20 columns
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, TOTAL_COLS);

    // Row 2: Empty spacing
    worksheet.addRow([]);

    // Row 3: Group header row – Round Log Detail CMT, Cross Cut Details CMT, Flitch Details CMT, Peeling Details CMT, Round log +Cross Cut (Sales), (Cc+Flitch+Peeling) (Rejected)
    const groupHeaderRow = worksheet.addRow([
      '',                      // 1:  ItemName (standalone)
      '',                      // 2:  Opening Stock CMT (standalone)
      'Round Log Detail CMT',  // 3:  → merged 3–5 (Invoice, Indian, Actual)
      '',                      // 4
      '',                      // 5
      '',                      // 6:  Recover From rejected (standalone)
      'Cross Cut Details CMT', // 7:  → merged 7–10 (Issue for CC, CC Received, CC Issue, CC Diff)
      '',                      // 8
      '',                      // 9
      '',                      // 10
      'Flitch Details CMT',    // 11: → merged 11–13
      '',                      // 12
      '',                      // 13
      'Peeling Details CMT',   // 14: → merged 14–16
      '',                      // 15
      '',                      // 16
      '',                      // 17: Issue for Sq.Edge (standalone)
      'Round log +Cross Cut',  // 18: Sales (standalone group label)
      '(Cc+Flitch+Peeling)',   // 19: Rejected (standalone group label)
      '',                      // 20: Closing Stock CMT (standalone)
    ]);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    groupHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Merge group header cells (row 3)
    worksheet.mergeCells(3, 3, 3, 5);   // Round Log Detail CMT
    worksheet.mergeCells(3, 7, 3, 10);  // Cross Cut Details CMT
    worksheet.mergeCells(3, 11, 3, 13);  // Flitch Details CMT
    worksheet.mergeCells(3, 14, 3, 16);  // Peeling Details CMT
    // Cols 18 and 19 are single-cell labels (no merge)

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

    // Grand totals accumulator
    const grandTotals = {
      opening_stock_cmt:     0,
      invoice_cmt:           0,
      indian_cmt:            0,
      actual_cmt:            0,
      recover_from_rejected: 0,
      issue_for_cc:          0,
      cc_received:           0,
      cc_issued:             0,
      cc_diff:               0,
      issue_for_flitch:      0,
      flitch_received:       0,
      flitch_diff:           0,
      issue_for_peeling:     0,
      peeling_received:      0,
      peeling_diff:          0,
      issue_for_sqedge:      0,
      sales:                 0,
      rejected:              0,
      closing_stock_cmt:     0,
    };

    const sortedData = [...aggregatedData].sort((a, b) =>
      (a.item_name || '').localeCompare(b.item_name || '')
    );

    sortedData.forEach((item) => {
      worksheet.addRow({
        item_name:             item.item_name || '',
        opening_stock_cmt:     parseFloat(item.opening_stock_cmt     || 0).toFixed(3),
        invoice_cmt:           parseFloat(item.invoice_cmt           || 0).toFixed(3),
        indian_cmt:            parseFloat(item.indian_cmt            || 0).toFixed(3),
        actual_cmt:            parseFloat(item.actual_cmt            || 0).toFixed(3),
        recover_from_rejected: parseFloat(item.recover_from_rejected || 0).toFixed(3),
        issue_for_cc:          parseFloat(item.issue_for_cc          || 0).toFixed(3),
        cc_received:           parseFloat(item.cc_received           || 0).toFixed(3),
        cc_issued:             parseFloat(item.cc_issued             || 0).toFixed(3),
        cc_diff:               parseFloat(item.cc_diff               || 0).toFixed(3),
        issue_for_flitch:      parseFloat(item.issue_for_flitch      || 0).toFixed(3),
        flitch_received:       parseFloat(item.flitch_received       || 0).toFixed(3),
        flitch_diff:           parseFloat(item.flitch_diff           || 0).toFixed(3),
        issue_for_peeling:     parseFloat(item.issue_for_peeling     || 0).toFixed(3),
        peeling_received:      parseFloat(item.peeling_received      || 0).toFixed(3),
        peeling_diff:          parseFloat(item.peeling_diff          || 0).toFixed(3),
        issue_for_sqedge:      parseFloat(item.issue_for_sqedge      || 0).toFixed(3),
        sales:                 parseFloat(item.sales                 || 0).toFixed(3),
        rejected:              parseFloat(item.rejected              || 0).toFixed(3),
        closing_stock_cmt:     parseFloat(item.closing_stock_cmt     || 0).toFixed(3),
      });

      grandTotals.opening_stock_cmt     += parseFloat(item.opening_stock_cmt     || 0);
      grandTotals.invoice_cmt           += parseFloat(item.invoice_cmt           || 0);
      grandTotals.indian_cmt            += parseFloat(item.indian_cmt            || 0);
      grandTotals.actual_cmt            += parseFloat(item.actual_cmt            || 0);
      grandTotals.recover_from_rejected += parseFloat(item.recover_from_rejected || 0);
      grandTotals.issue_for_cc          += parseFloat(item.issue_for_cc          || 0);
      grandTotals.cc_received           += parseFloat(item.cc_received           || 0);
      grandTotals.cc_issued             += parseFloat(item.cc_issued             || 0);
      grandTotals.cc_diff               += parseFloat(item.cc_diff               || 0);
      grandTotals.issue_for_flitch      += parseFloat(item.issue_for_flitch      || 0);
      grandTotals.flitch_received       += parseFloat(item.flitch_received       || 0);
      grandTotals.flitch_diff           += parseFloat(item.flitch_diff           || 0);
      grandTotals.issue_for_peeling     += parseFloat(item.issue_for_peeling     || 0);
      grandTotals.peeling_received      += parseFloat(item.peeling_received      || 0);
      grandTotals.peeling_diff          += parseFloat(item.peeling_diff          || 0);
      grandTotals.issue_for_sqedge      += parseFloat(item.issue_for_sqedge      || 0);
      grandTotals.sales                 += parseFloat(item.sales                 || 0);
      grandTotals.rejected              += parseFloat(item.rejected              || 0);
      grandTotals.closing_stock_cmt     += parseFloat(item.closing_stock_cmt     || 0);
    });

    const totalRow = worksheet.addRow({
      item_name:             'Total',
      opening_stock_cmt:     grandTotals.opening_stock_cmt.toFixed(3),
      invoice_cmt:           grandTotals.invoice_cmt.toFixed(3),
      indian_cmt:            grandTotals.indian_cmt.toFixed(3),
      actual_cmt:            grandTotals.actual_cmt.toFixed(3),
      recover_from_rejected: grandTotals.recover_from_rejected.toFixed(3),
      issue_for_cc:          grandTotals.issue_for_cc.toFixed(3),
      cc_received:           grandTotals.cc_received.toFixed(3),
      cc_issued:             grandTotals.cc_issued.toFixed(3),
      cc_diff:               grandTotals.cc_diff.toFixed(3),
      issue_for_flitch:      grandTotals.issue_for_flitch.toFixed(3),
      flitch_received:       grandTotals.flitch_received.toFixed(3),
      flitch_diff:           grandTotals.flitch_diff.toFixed(3),
      issue_for_peeling:     grandTotals.issue_for_peeling.toFixed(3),
      peeling_received:      grandTotals.peeling_received.toFixed(3),
      peeling_diff:          grandTotals.peeling_diff.toFixed(3),
      issue_for_sqedge:      grandTotals.issue_for_sqedge.toFixed(3),
      sales:                 grandTotals.sales.toFixed(3),
      rejected:              grandTotals.rejected.toFixed(3),
      closing_stock_cmt:     grandTotals.closing_stock_cmt.toFixed(3),
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
