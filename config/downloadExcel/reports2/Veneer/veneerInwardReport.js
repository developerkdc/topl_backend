import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Create Veneer Inward Report Excel
 * One row per item: Item Name, Opening, Purchase, Issue Total,
 * Smoking (Issue to Smoke, Smoke Done), Grouping (Issue to group, Issue to group Done),
 * Sales, Job Work Challan, Damage, Closing.
 * Total row at end.
 *
 * @param {Array} rowData - Array of item data with calculated metrics
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createVeneerInwardReportExcel = async (
  rowData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Veneer';

    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Veneer Inward Report');

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
    const title = `Veneer Inward Report From ${formattedStartDate} to ${formattedEndDate}`;

    const columnDefinitions = [
      { key: 'item_name', width: 22 },
      { key: 'opening', width: 12 },
      { key: 'purchase', width: 12 },
      { key: 'issue_total', width: 12 },
      { key: 'issue_to_smoke', width: 14 },
      { key: 'smoke_done', width: 12 },
      { key: 'issue_to_group', width: 14 },
      { key: 'group_done', width: 14 },
      { key: 'sales', width: 12 },
      { key: 'job_work_challan', width: 16 },
      { key: 'damage', width: 12 },
      { key: 'closing', width: 12 },
    ];

    worksheet.columns = columnDefinitions;

    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 12);

    worksheet.addRow([]);

    // Header row 1: parent headers for Smoking and Grouping (merged)
    const headerRow1 = worksheet.addRow([
      'Item Name',
      'Opening',
      'Purchase',
      'Issue Total',
      'Smoking',
      '', // merged with Smoking
      'Grouping',
      '', // merged with Grouping
      'Sales',
      'Job Work Challan',
      'Damage',
      'Closing',
    ]);
    headerRow1.font = { bold: true };
    headerRow1.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    headerRow1.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    worksheet.mergeCells(3, 5, 3, 6); // Smoking
    worksheet.mergeCells(3, 7, 3, 8); // Grouping

    // Header row 2: sub-column labels under Smoking and Grouping
    const headerRow2 = worksheet.addRow([
      '',
      '',
      '',
      '',
      'Issue to Smoke',
      'Smoke Done',
      'Issue to group',
      'Issue to group Done',
      '',
      '',
      '',
      '',
    ]);
    headerRow2.font = { bold: true };
    headerRow2.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    headerRow2.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const grandTotals = {
      opening: 0,
      purchase: 0,
      issue_total: 0,
      issue_to_smoke: 0,
      smoke_done: 0,
      issue_to_group: 0,
      group_done: 0,
      sales: 0,
      job_work_challan: 0,
      damage: 0,
      closing: 0,
    };

    rowData.forEach((row) => {
      const dataRow = worksheet.addRow({
        item_name: row.item_name || '',
        opening: parseFloat(row.opening || 0).toFixed(3),
        purchase: parseFloat(row.purchase || 0).toFixed(3),
        issue_total: parseFloat(row.issue_total || 0).toFixed(3),
        issue_to_smoke: parseFloat(row.issue_to_smoke || 0).toFixed(3),
        smoke_done: parseFloat(row.smoke_done || 0).toFixed(3),
        issue_to_group: parseFloat(row.issue_to_group || 0).toFixed(3),
        group_done: parseFloat(row.group_done || 0).toFixed(3),
        sales: parseFloat(row.sales || 0).toFixed(3),
        job_work_challan: parseFloat(row.job_work_challan || 0).toFixed(3),
        damage: parseFloat(row.damage || 0).toFixed(3),
        closing: parseFloat(row.closing || 0).toFixed(3),
      });
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      grandTotals.opening += parseFloat(row.opening || 0);
      grandTotals.purchase += parseFloat(row.purchase || 0);
      grandTotals.issue_total += parseFloat(row.issue_total || 0);
      grandTotals.issue_to_smoke += parseFloat(row.issue_to_smoke || 0);
      grandTotals.smoke_done += parseFloat(row.smoke_done || 0);
      grandTotals.issue_to_group += parseFloat(row.issue_to_group || 0);
      grandTotals.group_done += parseFloat(row.group_done || 0);
      grandTotals.sales += parseFloat(row.sales || 0);
      grandTotals.job_work_challan += parseFloat(row.job_work_challan || 0);
      grandTotals.damage += parseFloat(row.damage || 0);
      grandTotals.closing += parseFloat(row.closing || 0);
    });

    // Total row
    const totalRow = worksheet.addRow({
      item_name: 'Total',
      opening: grandTotals.opening.toFixed(3),
      purchase: grandTotals.purchase.toFixed(3),
      issue_total: grandTotals.issue_total.toFixed(3),
      issue_to_smoke: grandTotals.issue_to_smoke.toFixed(3),
      smoke_done: grandTotals.smoke_done.toFixed(3),
      issue_to_group: grandTotals.issue_to_group.toFixed(3),
      group_done: grandTotals.group_done.toFixed(3),
      sales: grandTotals.sales.toFixed(3),
      job_work_challan: grandTotals.job_work_challan.toFixed(3),
      damage: grandTotals.damage.toFixed(3),
      closing: grandTotals.closing.toFixed(3),
    });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFCC00' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const timeStamp = new Date().getTime();
    const fileName = `VeneerInwardReport_${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}/${filePath}`;
    console.log('Veneer inward report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating veneer inward report:', error);
    throw new ApiError(500, error.message, error);
  }
};
