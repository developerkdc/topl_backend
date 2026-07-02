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
  filter = {},
  includeCostAndExpense
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
      ...(includeCostAndExpense ? [{ key: 'opening_amount', width: 12 }, { key: 'opening_expense_amount', width: 12 }] : []),
      { key: 'purchase', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'purchase_amount', width: 12 }, { key: 'purchase_expense_amount', width: 12 }] : []),
      { key: 'issue_total', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'issue_total_amount', width: 12 }] : []),
      { key: 'issue_to_smoke', width: 14 },
      ...(includeCostAndExpense ? [{ key: 'issue_to_smoke_amount', width: 12 }, { key: 'issue_to_smoke_expense_amount', width: 12 }] : []),
      { key: 'smoke_done', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'smoke_done_amount', width: 12 }, { key: 'smoke_done_expense_amount', width: 12 }] : []),
      { key: 'issue_to_group', width: 14 },
      ...(includeCostAndExpense ? [{ key: 'issue_to_group_amount', width: 12 }, { key: 'issue_to_group_expense_amount', width: 12 }] : []),
      { key: 'group_done', width: 14 },
      ...(includeCostAndExpense ? [{ key: 'group_done_amount', width: 12 }, { key: 'group_done_expense_amount', width: 12 }] : []),
      { key: 'sales', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'sales_amount', width: 12 }, { key: 'sales_expense_amount', width: 12 }] : []),
      { key: 'job_work_challan', width: 16 },
      ...(includeCostAndExpense ? [{ key: 'job_work_challan_amount', width: 12 }, { key: 'job_work_challan_expense_amount', width: 12 }] : []),
      { key: 'damage', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'damage_amount', width: 12 }, { key: 'damage_expense_amount', width: 12 }] : []),
      { key: 'closing', width: 12 },
      ...(includeCostAndExpense ? [{ key: 'closing_amount', width: 12 }] : []),
    ];

    worksheet.columns = columnDefinitions;
    const totalCols = columnDefinitions.length;
    const colIndex = (key) => columnDefinitions.findIndex(c => c.key === key) + 1;

    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, totalCols);

    worksheet.addRow([]);

    // Header row 1: parent headers for Smoking and Grouping (merged)
    // const headerRow1 = worksheet.addRow([
    //   'Item Name',
    //   'Opening',
    //   'Purchase',
    //   'Issue Total',
    //   'Smoking',
    //   '', // merged with Smoking
    //   'Grouping',
    //   '', // merged with Grouping
    //   'Sales',
    //   'Job Work Challan',
    //   'Damage',
    //   'Closing',
    // ]);
    // headerRow1.font = { bold: true };
    // headerRow1.alignment = { vertical: 'middle', horizontal: 'center' };
    // headerRow1.fill = {
    //   type: 'pattern',
    //   pattern: 'solid',
    //   fgColor: { argb: 'FFD3D3D3' },
    // };
    // headerRow1.eachCell((cell) => {
    //   cell.border = {
    //     top: { style: 'thin' },
    //     left: { style: 'thin' },
    //     bottom: { style: 'thin' },
    //     right: { style: 'thin' },
    //   };
    // });

    // // Header row 2: sub-column labels under Smoking and Grouping
    // const headerRow2 = worksheet.addRow([
    //   '',
    //   '',
    //   '',
    //   '',
    //   'Issue to Smoke',
    //   'Smoke Done',
    //   'Issue to group',
    //   'Issue to group Done',
    //   '',
    //   '',
    //   '',
    //   '',
    // ]);
    // headerRow2.font = { bold: true };
    // headerRow2.alignment = { vertical: 'middle', horizontal: 'center' };
    // headerRow2.fill = {
    //   type: 'pattern',
    //   pattern: 'solid',
    //   fgColor: { argb: 'FFD3D3D3' },
    // };
    // headerRow2.eachCell((cell) => {
    //   cell.border = {
    //     top: { style: 'thin' },
    //     left: { style: 'thin' },
    //     bottom: { style: 'thin' },
    //     right: { style: 'thin' },
    //   };
    // });

    const header1 = [];
    const header2 = [];

    columnDefinitions.forEach(({ key }) => {
      switch (key) {
        // Item Name
        case 'item_name':
          header1.push('Item Name');
          header2.push('');
          break;

        // Opening
        case 'opening':
          header1.push('Opening');
          header2.push('Qty');
          break;
        case 'opening_amount':
          header1.push('');
          header2.push('Amount');
          break;
        case 'opening_expense_amount':
          header1.push('');
          header2.push('Expense');
          break;

        // Purchase
        case 'purchase':
          header1.push('Purchase');
          header2.push('Qty');
          break;
        case 'purchase_amount':
          header1.push('');
          header2.push('Amount');
          break;
        case 'purchase_expense_amount':
          header1.push('');
          header2.push('Expense');
          break;

        // Issue Total
        case 'issue_total':
          header1.push('Issue Total');
          header2.push('Qty');
          break;
        case 'issue_total_amount':
          header1.push('');
          header2.push('Amount');
          break;

        // Smoking
        case 'issue_to_smoke':
          header1.push('Smoking');
          header2.push('Issue to Smoke');
          break;
        case 'issue_to_smoke_amount':
          header1.push('');
          header2.push('Amount');
          break;
        case 'issue_to_smoke_expense_amount':
          header1.push('');
          header2.push('Expense');
          break;

        case 'smoke_done':
          header1.push('');
          header2.push('Smoke Done');
          break;
        case 'smoke_done_amount':
          header1.push('');
          header2.push('Amount');
          break;
        case 'smoke_done_expense_amount':
          header1.push('');
          header2.push('Expense');
          break;

        // Grouping
        case 'issue_to_group':
          header1.push('Grouping');
          header2.push('Issue to Group');
          break;
        case 'issue_to_group_amount':
          header1.push('');
          header2.push('Amount');
          break;
        case 'issue_to_group_expense_amount':
          header1.push('');
          header2.push('Expense');
          break;

        case 'group_done':
          header1.push('');
          header2.push('Group Done');
          break;
        case 'group_done_amount':
          header1.push('');
          header2.push('Amount');
          break;
        case 'group_done_expense_amount':
          header1.push('');
          header2.push('Expense');
          break;

        // Sales
        case 'sales':
          header1.push('Sales');
          header2.push('Qty');
          break;
        case 'sales_amount':
          header1.push('');
          header2.push('Amount');
          break;
        case 'sales_expense_amount':
          header1.push('');
          header2.push('Expense');
          break;

        // Job Work Challan
        case 'job_work_challan':
          header1.push('Job Work Challan');
          header2.push('Qty');
          break;
        case 'job_work_challan_amount':
          header1.push('');
          header2.push('Amount');
          break;
        case 'job_work_challan_expense_amount':
          header1.push('');
          header2.push('Expense');
          break;

        // Damage
        case 'damage':
          header1.push('Damage');
          header2.push('Qty');
          break;
        case 'damage_amount':
          header1.push('');
          header2.push('Amount');
          break;
        case 'damage_expense_amount':
          header1.push('');
          header2.push('Expense');
          break;

        // Closing
        case 'closing':
          header1.push('Closing');
          header2.push('Qty');
          break;
        case 'closing_amount':
          header1.push('');
          header2.push('Amount');
          break;

        default:
          header1.push('');
          header2.push('');
      }
    });

    const headerRow1 = worksheet.addRow(header1);
    const headerRow2 = worksheet.addRow(header2);

    const mergeGroup = (startKey, endKey) => {
      const start = colIndex(startKey);
      const end = colIndex(endKey);

      if (start && end) {
        worksheet.mergeCells(
          headerRow1.number,
          start,
          headerRow1.number,
          end
        );
      }
    };

    mergeGroup(
      'opening',
      includeCostAndExpense
        ? 'opening_expense_amount'
        : 'opening'
    );

    mergeGroup(
      'purchase',
      includeCostAndExpense
        ? 'purchase_expense_amount'
        : 'purchase'
    );

    mergeGroup(
      'issue_total',
      includeCostAndExpense
        ? 'issue_total_amount'
        : 'issue_total'
    );

    mergeGroup(
      'issue_to_smoke',
      includeCostAndExpense
        ? 'smoke_done_expense_amount'
        : 'smoke_done'
    );

    mergeGroup(
      'issue_to_group',
      includeCostAndExpense
        ? 'group_done_expense_amount'
        : 'group_done'
    );

    mergeGroup(
      'sales',
      includeCostAndExpense
        ? 'sales_expense_amount'
        : 'sales'
    );

    mergeGroup(
      'job_work_challan',
      includeCostAndExpense
        ? 'job_work_challan_expense_amount'
        : 'job_work_challan'
    );

    mergeGroup(
      'damage',
      includeCostAndExpense
        ? 'damage_expense_amount'
        : 'damage'
    );

    mergeGroup(
      'closing',
      includeCostAndExpense
        ? 'closing_amount'
        : 'closing'
    );

    [
      'item_name'
    ].forEach((key) => {
      const col = colIndex(key);
      worksheet.mergeCells(
        headerRow1.number,
        col,
        headerRow2.number,
        col
      );
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
      ...(includeCostAndExpense ? {
        opening_amount: 0,
        opening_expense_amount: 0,
        purchase_amount: 0,
        purchase_expense_amount: 0,
        issue_total_amount: 0,
        issue_to_smoke_amount: 0,
        issue_to_smoke_expense_amount: 0,
        smoke_done_amount: 0,
        smoke_done_expense_amount: 0,
        issue_to_group_amount: 0,
        issue_to_group_expense_amount: 0,
        group_done_amount: 0,
        group_done_expense_amount: 0,
        sales_amount: 0,
        sales_expense_amount: 0,
        job_work_challan_amount: 0,
        job_work_challan_expense_amount: 0,
        damage_amount: 0,
        damage_expense_amount: 0,
        closing_amount: 0,
      } : {}),
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
        ...(includeCostAndExpense ? {
          opening_amount: parseFloat(row.opening_amount || 0).toFixed(2),
          opening_expense_amount: parseFloat(row.opening_expense_amount || 0).toFixed(2),
          purchase_amount: parseFloat(row.purchase_amount || 0).toFixed(2),
          purchase_expense_amount: parseFloat(row.purchase_expense_amount || 0).toFixed(2),
          issue_total_amount: parseFloat(row.issue_total_amount || 0).toFixed(2),
          issue_to_smoke_amount: parseFloat(row.issue_to_smoke_amount || 0).toFixed(2),
          issue_to_smoke_expense_amount: parseFloat(row.issue_to_smoke_expense_amount || 0).toFixed(2),
          smoke_done_amount: parseFloat(row.smoke_done_amount || 0).toFixed(2),
          smoke_done_expense_amount: parseFloat(row.smoke_done_expense_amount || 0).toFixed(2),
          issue_to_group_amount: parseFloat(row.issue_to_group_amount || 0).toFixed(2),
          issue_to_group_expense_amount: parseFloat(row.issue_to_group_expense_amount || 0).toFixed(2),
          group_done_amount: parseFloat(row.group_done_amount || 0).toFixed(2),
          group_done_expense_amount: parseFloat(row.group_done_expense_amount || 0).toFixed(2),
          sales_amount: parseFloat(row.sales_amount || 0).toFixed(2),
          sales_expense_amount: parseFloat(row.sales_expense_amount || 0).toFixed(2),
          job_work_challan_amount: parseFloat(row.job_work_challan_amount || 0).toFixed(2),
          job_work_challan_expense_amount: parseFloat(row.job_work_challan_expense_amount || 0).toFixed(2),
          damage_amount: parseFloat(row.damage_amount || 0).toFixed(2),
          damage_expense_amount: parseFloat(row.damage_expense_amount || 0).toFixed(2),
          closing_amount: parseFloat(row.closing_amount || 0).toFixed(2),
        } : {}),
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
      if (includeCostAndExpense) {
        grandTotals.opening_amount += parseFloat(row.opening_amount || 0);
        grandTotals.opening_expense_amount += parseFloat(row.opening_expense_amount || 0);
        grandTotals.purchase_amount += parseFloat(row.purchase_amount || 0);
        grandTotals.purchase_expense_amount += parseFloat(row.purchase_expense_amount || 0);
        grandTotals.issue_total_amount += parseFloat(row.issue_total_amount || 0);
        grandTotals.issue_to_smoke_amount += parseFloat(row.issue_to_smoke_amount || 0);
        grandTotals.issue_to_smoke_expense_amount += parseFloat(row.issue_to_smoke_expense_amount || 0);
        grandTotals.smoke_done_amount += parseFloat(row.smoke_done_amount || 0);
        grandTotals.smoke_done_expense_amount += parseFloat(row.smoke_done_expense_amount || 0);
        grandTotals.issue_to_group_amount += parseFloat(row.issue_to_group_amount || 0);
        grandTotals.issue_to_group_expense_amount += parseFloat(row.issue_to_group_expense_amount || 0);
        grandTotals.group_done_amount += parseFloat(row.group_done_amount || 0);
        grandTotals.group_done_expense_amount += parseFloat(row.group_done_expense_amount || 0);
        grandTotals.sales_amount += parseFloat(row.sales_amount || 0);
        grandTotals.sales_expense_amount += parseFloat(row.sales_expense_amount || 0);
        grandTotals.job_work_challan_amount += parseFloat(row.job_work_challan_amount || 0);
        grandTotals.job_work_challan_expense_amount += parseFloat(row.job_work_challan_expense_amount || 0);
        grandTotals.damage_amount += parseFloat(row.damage_amount || 0);
        grandTotals.damage_expense_amount += parseFloat(row.damage_expense_amount || 0);
        grandTotals.closing_amount += parseFloat(row.closing_amount || 0);
      }
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
      ...(includeCostAndExpense ? {
        opening_amount: grandTotals.opening_amount.toFixed(2),
        opening_expense_amount: grandTotals.opening_expense_amount.toFixed(2),
        purchase_amount: grandTotals.purchase_amount.toFixed(2),
        purchase_expense_amount: grandTotals.purchase_expense_amount.toFixed(2),
        issue_total_amount: grandTotals.issue_total_amount.toFixed(2),
        issue_to_smoke_amount: grandTotals.issue_to_smoke_amount.toFixed(2),
        issue_to_smoke_expense_amount: grandTotals.issue_to_smoke_expense_amount.toFixed(2),
        smoke_done_amount: grandTotals.smoke_done_amount.toFixed(2),
        smoke_done_expense_amount: grandTotals.smoke_done_expense_amount.toFixed(2),
        issue_to_group_amount: grandTotals.issue_to_group_amount.toFixed(2),
        issue_to_group_expense_amount: grandTotals.issue_to_group_expense_amount.toFixed(2),
        group_done_amount: grandTotals.group_done_amount.toFixed(2),
        group_done_expense_amount: grandTotals.group_done_expense_amount.toFixed(2),
        sales_amount: grandTotals.sales_amount.toFixed(2),
        sales_expense_amount: grandTotals.sales_expense_amount.toFixed(2),
        job_work_challan_amount: grandTotals.job_work_challan_amount.toFixed(2),
        job_work_challan_expense_amount: grandTotals.job_work_challan_expense_amount.toFixed(2),
        damage_amount: grandTotals.damage_amount.toFixed(2),
        damage_expense_amount: grandTotals.damage_expense_amount.toFixed(2),
        closing_amount: grandTotals.closing_amount.toFixed(2),
      } : {}),
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
