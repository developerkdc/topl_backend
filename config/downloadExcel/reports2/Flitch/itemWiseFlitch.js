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
 * Create Item Wise Flitch Report Excel
 * 16 columns with group headers:
 *   Round Log Detail CMT (Invoice=0, Indian=0, Actual)
 *   Flitch Details CMT (Issue for Flitch, Flitch Received, Flitch Diff)
 *   Slicing Details CMT (Issue for Slicing, Slicing Received, Slicing Diff)
 *   Sales, Rejected (includes slicing wastage), Closing Stock CMT
 *
 * @param {Array} aggregatedData - 16-field stock data by item_name
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

    // 16 columns (flitching-focused + slicing)
    const columnDefinitions = [
      { key: 'item_name',             width: 25 }, // 1.  ItemName
      { key: 'opening_stock_cmt',     width: 16 }, // 2.  Opening Stock CMT
      { key: 'invoice_cmt',           width: 12 }, // 3.  Invoice    ┐ Round Log Detail CMT
      { key: 'indian_cmt',            width: 12 }, // 4.  Indian     │
      { key: 'actual_cmt',            width: 12 }, // 5.  Actual     ┘
      { key: 'recover_from_rejected', width: 18 }, // 6.  Recover From rejected (standalone)
      { key: 'issue_for_flitch',     width: 15 }, // 7.  Issue for Flitch ┐ Flitch Details CMT
      { key: 'flitch_received',       width: 15 }, // 8.  Flitch Received │
      { key: 'flitch_diff',           width: 12 }, // 9.  Flitch Diff     ┘
      { key: 'issue_for_slicing',    width: 16 }, // 10. Issue for Slicing ┐ Slicing Details CMT
      { key: 'slicing_received',      width: 16 }, // 11. Slicing Received  │
      { key: 'slicing_diff',         width: 12 }, // 12. Slicing Diff     ┘
      { key: 'issue_for_sqedge',     width: 16 }, // 13. Issue for Sq.Edge (standalone)
      { key: 'sales',                 width: 12 }, // 14. Sales
      { key: 'rejected',              width: 12 }, // 15. Rejected
      { key: 'closing_stock_cmt',     width: 16 }, // 16. Closing Stock CMT
    ];

    worksheet.columns = columnDefinitions;

    const TOTAL_COLS = 16;

    // Row 1: Title merged across all 20 columns
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, TOTAL_COLS);

    // Row 2: Empty spacing
    worksheet.addRow([]);

    // Row 3: Group header row – Round Log Detail CMT, Flitch Details CMT, Slicing Details CMT, Sales, Rejected
    const groupHeaderRow = worksheet.addRow([
      '',                      // 1:  ItemName (standalone)
      '',                      // 2:  Opening Stock CMT (standalone)
      'Round Log Detail CMT',  // 3:  → merged 3–5 (Invoice, Indian, Actual)
      '',                      // 4
      '',                      // 5
      '',                      // 6:  Recover From rejected (standalone)
      'Flitch Details CMT',    // 7:  → merged 7–9
      '',                      // 8
      '',                      // 9
      'Slicing Details CMT',   // 10: → merged 10–12
      '',                      // 11
      '',                      // 12
      '',                      // 13: Issue for Sq.Edge (standalone)
      '',                      // 14: Sales (standalone)
      '',                      // 15: Rejected (standalone)
      '',                      // 16: Closing Stock CMT (standalone)
    ]);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    groupHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    applyRowBorders(groupHeaderRow, 1, TOTAL_COLS, { top: true, bottom: true });

    // Merge group header cells (row 3)
    worksheet.mergeCells(3, 3, 3, 5);   // Round Log Detail CMT
    worksheet.mergeCells(3, 7, 3, 9);   // Flitch Details CMT
    worksheet.mergeCells(3, 10, 3, 12); // Slicing Details CMT
    // Cols 18 and 19 are single-cell labels (no merge)

    // Row 4: Column headers
    const headerRow = worksheet.addRow([
      'ItemName',
      'Opening Stock CMT',
      'Invoice',
      'Indian',
      'Actual',
      'Recover From rejected',
      'Issue for Flitch',
      'Flitch Received',
      'Flitch Diff',
      'Issue for Slicing',
      'Slicing Received',
      'Slicing Diff',
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
    applyRowBorders(headerRow, 1, TOTAL_COLS, { top: true, bottom: true });

    // Grand totals accumulator (15 numeric columns)
    const grandTotals = {
      opening_stock_cmt:     0,
      invoice_cmt:           0,
      indian_cmt:            0,
      actual_cmt:            0,
      recover_from_rejected: 0,
      issue_for_flitch:      0,
      flitch_received:       0,
      flitch_diff:           0,
      issue_for_slicing:     0,
      slicing_received:      0,
      slicing_diff:          0,
      issue_for_sqedge:      0,
      sales:                 0,
      rejected:              0,
      closing_stock_cmt:     0,
    };

    const sortedData = [...aggregatedData].sort((a, b) =>
      (a.item_name || '').localeCompare(b.item_name || '')
    );

    sortedData.forEach((item) => {
      const dataRow = worksheet.addRow({
        item_name:             item.item_name || '',
        opening_stock_cmt:     parseFloat(item.opening_stock_cmt     || 0).toFixed(3),
        invoice_cmt:           parseFloat(item.invoice_cmt           || 0).toFixed(3),
        indian_cmt:            parseFloat(item.indian_cmt            || 0).toFixed(3),
        actual_cmt:            parseFloat(item.actual_cmt            || 0).toFixed(3),
        recover_from_rejected: parseFloat(item.recover_from_rejected || 0).toFixed(3),
        issue_for_flitch:      parseFloat(item.issue_for_flitch      || 0).toFixed(3),
        flitch_received:       parseFloat(item.flitch_received       || 0).toFixed(3),
        flitch_diff:           parseFloat(item.flitch_diff           || 0).toFixed(3),
        issue_for_slicing:     parseFloat(item.issue_for_slicing     || 0).toFixed(3),
        slicing_received:      parseFloat(item.slicing_received      || 0).toFixed(3),
        slicing_diff:          parseFloat(item.slicing_diff          || 0).toFixed(3),
        issue_for_sqedge:      parseFloat(item.issue_for_sqedge      || 0).toFixed(3),
        sales:                 parseFloat(item.sales                 || 0).toFixed(3),
        rejected:              parseFloat(item.rejected              || 0).toFixed(3),
        closing_stock_cmt:     parseFloat(item.closing_stock_cmt     || 0).toFixed(3),
      });
      applyRowBorders(dataRow, 1, TOTAL_COLS, { top: false, bottom: true });

      grandTotals.opening_stock_cmt     += parseFloat(item.opening_stock_cmt     || 0);
      grandTotals.invoice_cmt           += parseFloat(item.invoice_cmt           || 0);
      grandTotals.indian_cmt            += parseFloat(item.indian_cmt            || 0);
      grandTotals.actual_cmt            += parseFloat(item.actual_cmt            || 0);
      grandTotals.recover_from_rejected += parseFloat(item.recover_from_rejected || 0);
      grandTotals.issue_for_flitch      += parseFloat(item.issue_for_flitch      || 0);
      grandTotals.flitch_received       += parseFloat(item.flitch_received       || 0);
      grandTotals.flitch_diff           += parseFloat(item.flitch_diff           || 0);
      grandTotals.issue_for_slicing     += parseFloat(item.issue_for_slicing     || 0);
      grandTotals.slicing_received      += parseFloat(item.slicing_received      || 0);
      grandTotals.slicing_diff          += parseFloat(item.slicing_diff          || 0);
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
      issue_for_flitch:      grandTotals.issue_for_flitch.toFixed(3),
      flitch_received:       grandTotals.flitch_received.toFixed(3),
      flitch_diff:           grandTotals.flitch_diff.toFixed(3),
      issue_for_slicing:     grandTotals.issue_for_slicing.toFixed(3),
      slicing_received:      grandTotals.slicing_received.toFixed(3),
      slicing_diff:          grandTotals.slicing_diff.toFixed(3),
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
    applyRowBorders(totalRow, 1, TOTAL_COLS, { top: true, bottom: true });

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
