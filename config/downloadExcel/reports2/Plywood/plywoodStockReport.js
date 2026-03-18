import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Generate Plywood Stock Report Excel for reports2.
 * Title: Plywood Type [ filter ] stock in the period DD/MM/YYYY and DD/MM/YYYY
 * Columns: Plywood Sub Category, Thickness, Size, Opening, Received, Consumed, Sales, Issue For Ply Resizing, Issue For Pressing, Closing (sheets + sqm).
 *
 * @param {Array} aggregatedData - Aggregated stock data per (plywood_sub_type, thickness, size)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filters - Optional filters (e.g. item_sub_category_name)
 * @returns {String} Download link for the generated Excel file
 */
export const GeneratePlywoodStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Plywood';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Plywood Stock Report');

    const formatDate = (dateStr) => {
      try {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (error) {
        return dateStr || 'N/A';
      }
    };

    let title = 'Plywood Type';
    if (filters && filters.item_sub_category_name) {
      title += ` [ ${filters.item_sub_category_name} ]`;
    } else {
      title += ' [ ALL ]';
    }
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    title += `   stock  in the period  ${formattedStartDate} and ${formattedEndDate}`;

    const columnDefinitions = [
      { key: 'plywood_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_sheets', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_sheets', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_sheets', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'challan_sheets', width: 14 },
      { key: 'challan_sqm', width: 14 },
      { key: 'order_sheets', width: 12 },
      { key: 'order_sqm', width: 12 },
      { key: 'issue_for_ply_resizing_sheets', width: 22 },
      { key: 'issue_for_ply_resizing_sqm', width: 22 },
      { key: 'issue_for_pressing_sheets', width: 18 },
      { key: 'issue_for_pressing_sqm', width: 20 },
      { key: 'closing_sheets', width: 12 },
      { key: 'closing_sqm', width: 12 },
    ];

    worksheet.columns = columnDefinitions;

    const filterRow = worksheet.addRow([title]);
    filterRow.font = { bold: true, size: 12 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    filterRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 19);

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'Plywood Sub Category',
      'Thickness',
      'Size',
      'Opening Sheets',
      'Opening Metres',
      'Received Sheets',
      'Received Mtrs',
      'Consumed Sheets',
      'Consumed Mtrs',
      'Challan Sheets',
      'Challan Mtrs',
      'Order Sheets',
      'Order Mtrs',
      'Issue For Ply Resizing Sheet',
      'Issue For Ply Resizing Sq Met',
      'Issue For Pressing',
      'Issue For Pressing Sq Met',
      'Closing sheets',
      'Closing Metres',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    const groupedData = {};
    aggregatedData.forEach((item) => {
      const subType = item.plywood_sub_type || 'OTHER';
      const thickness = item.thickness || 0;
      if (!groupedData[subType]) {
        groupedData[subType] = {};
      }
      if (!groupedData[subType][thickness]) {
        groupedData[subType][thickness] = [];
      }
      groupedData[subType][thickness].push(item);
    });

    const grandTotals = {
      opening_sheets: 0,
      opening_sqm: 0,
      receive_sheets: 0,
      receive_sqm: 0,
      consume_sheets: 0,
      consume_sqm: 0,
      challan_sheets: 0,
      challan_sqm: 0,
      order_sheets: 0,
      order_sqm: 0,
      issue_for_ply_resizing_sheets: 0,
      issue_for_ply_resizing_sqm: 0,
      issue_for_pressing_sheets: 0,
      issue_for_pressing_sqm: 0,
      closing_sheets: 0,
      closing_sqm: 0,
    };

    Object.keys(groupedData)
      .sort()
      .forEach((subType) => {
        const thicknesses = groupedData[subType];
        Object.keys(thicknesses)
          .sort((a, b) => parseFloat(a) - parseFloat(b))
          .forEach((thickness) => {
            const items = thicknesses[thickness];
            const thicknessTotals = {
              opening_sheets: 0,
              opening_sqm: 0,
              receive_sheets: 0,
              receive_sqm: 0,
              consume_sheets: 0,
              consume_sqm: 0,
              challan_sheets: 0,
              challan_sqm: 0,
              order_sheets: 0,
              order_sqm: 0,
              issue_for_ply_resizing_sheets: 0,
              issue_for_ply_resizing_sqm: 0,
              issue_for_pressing_sheets: 0,
              issue_for_pressing_sqm: 0,
              closing_sheets: 0,
              closing_sqm: 0,
            };

            items.forEach((item) => {
              const rowData = {
                plywood_sub_type: item.plywood_sub_type || '',
                thickness: item.thickness || 0,
                size: item.size || '',
                opening_sheets: item.opening_sheets || 0,
                opening_sqm: item.opening_sqm || 0,
                receive_sheets: item.receive_sheets || 0,
                receive_sqm: item.receive_sqm || 0,
                consume_sheets: item.consume_sheets || 0,
                consume_sqm: item.consume_sqm || 0,
                challan_sheets: item.challan_sheets || 0,
                challan_sqm: item.challan_sqm || 0,
                order_sheets: item.order_sheets || 0,
                order_sqm: item.order_sqm || 0,
                issue_for_ply_resizing_sheets: item.issue_for_ply_resizing_sheets || 0,
                issue_for_ply_resizing_sqm: item.issue_for_ply_resizing_sqm || 0,
                issue_for_pressing_sheets: item.issue_for_pressing_sheets || 0,
                issue_for_pressing_sqm: item.issue_for_pressing_sqm || 0,
                closing_sheets: item.closing_sheets || 0,
                closing_sqm: item.closing_sqm || 0,
              };
              worksheet.addRow(rowData);
              thicknessTotals.opening_sheets += item.opening_sheets || 0;
              thicknessTotals.opening_sqm += item.opening_sqm || 0;
              thicknessTotals.receive_sheets += item.receive_sheets || 0;
              thicknessTotals.receive_sqm += item.receive_sqm || 0;
              thicknessTotals.consume_sheets += item.consume_sheets || 0;
              thicknessTotals.consume_sqm += item.consume_sqm || 0;
              thicknessTotals.challan_sheets += item.challan_sheets || 0;
              thicknessTotals.challan_sqm += item.challan_sqm || 0;
              thicknessTotals.order_sheets += item.order_sheets || 0;
              thicknessTotals.order_sqm += item.order_sqm || 0;
              thicknessTotals.issue_for_ply_resizing_sheets += item.issue_for_ply_resizing_sheets || 0;
              thicknessTotals.issue_for_ply_resizing_sqm += item.issue_for_ply_resizing_sqm || 0;
              thicknessTotals.issue_for_pressing_sheets += item.issue_for_pressing_sheets || 0;
              thicknessTotals.issue_for_pressing_sqm += item.issue_for_pressing_sqm || 0;
              thicknessTotals.closing_sheets += item.closing_sheets || 0;
              thicknessTotals.closing_sqm += item.closing_sqm || 0;
            });

            const thicknessTotalRow = worksheet.addRow({
              plywood_sub_type: '',
              thickness: '',
              size: 'Total',
              ...thicknessTotals,
            });
            thicknessTotalRow.eachCell((cell) => {
              cell.font = { bold: true };
            });

            Object.keys(grandTotals).forEach((key) => {
              grandTotals[key] += thicknessTotals[key];
            });
          });
      });

    const grandTotalRow = worksheet.addRow({
      plywood_sub_type: 'Total',
      thickness: '',
      size: '',
      ...grandTotals,
    });
    grandTotalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    const timeStamp = new Date().getTime();
    const fileName = `Plywood-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    return downloadLink;
  } catch (error) {
    console.error('Error creating plywood stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};

/**
 * Generate Plywood Stock Report Excel – Item-wise. Same columns + Item Name first; grouped by item_name then thickness.
 */
export const GeneratePlywoodItemWiseStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Plywood';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Plywood Stock Report Item Wise');

    const formatDate = (dateStr) => {
      try {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (error) {
        return dateStr || 'N/A';
      }
    };

    let title = 'Plywood Type (Item Wise)';
    if (filters?.item_sub_category_name) {
      title += ` [ ${filters.item_sub_category_name} ]`;
    } else {
      title += ' [ ALL ]';
    }
    if (filters?.item_name) {
      title += ` [ Item: ${filters.item_name} ]`;
    }
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    title += `   stock  in the period  ${formattedStartDate} and ${formattedEndDate}`;

    const columnDefinitions = [
      { key: 'item_name', width: 22 },
      { key: 'plywood_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_sheets', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_sheets', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_sheets', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'challan_sheets', width: 14 },
      { key: 'challan_sqm', width: 14 },
      { key: 'order_sheets', width: 12 },
      { key: 'order_sqm', width: 12 },
      { key: 'issue_for_ply_resizing_sheets', width: 22 },
      { key: 'issue_for_ply_resizing_sqm', width: 22 },
      { key: 'issue_for_pressing_sheets', width: 18 },
      { key: 'issue_for_pressing_sqm', width: 20 },
      { key: 'closing_sheets', width: 12 },
      { key: 'closing_sqm', width: 12 },
    ];

    worksheet.columns = columnDefinitions;

    const filterRow = worksheet.addRow([title]);
    filterRow.font = { bold: true, size: 12 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    filterRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 20);

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'Item Name',
      'Plywood Sub Category',
      'Thickness',
      'Size',
      'Opening Sheets',
      'Opening Metres',
      'Received Sheets',
      'Received Mtrs',
      'Consumed Sheets',
      'Consumed Mtrs',
      'Challan Sheets',
      'Challan Mtrs',
      'Order Sheets',
      'Order Mtrs',
      'Issue For Ply Resizing Sheet',
      'Issue For Ply Resizing Sq Met',
      'Issue For Pressing',
      'Issue For Pressing Sq Met',
      'Closing sheets',
      'Closing Metres',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    const groupedByItem = {};
    aggregatedData.forEach((item) => {
      const itemName = item.item_name ?? 'OTHER';
      if (!groupedByItem[itemName]) {
        groupedByItem[itemName] = {};
      }
      const thickness = item.thickness ?? 0;
      if (!groupedByItem[itemName][thickness]) {
        groupedByItem[itemName][thickness] = [];
      }
      groupedByItem[itemName][thickness].push(item);
    });

    const grandTotals = {
      opening_sheets: 0,
      opening_sqm: 0,
      receive_sheets: 0,
      receive_sqm: 0,
      consume_sheets: 0,
      consume_sqm: 0,
      challan_sheets: 0,
      challan_sqm: 0,
      order_sheets: 0,
      order_sqm: 0,
      issue_for_ply_resizing_sheets: 0,
      issue_for_ply_resizing_sqm: 0,
      issue_for_pressing_sheets: 0,
      issue_for_pressing_sqm: 0,
      closing_sheets: 0,
      closing_sqm: 0,
    };

    Object.keys(groupedByItem)
      .sort()
      .forEach((itemName) => {
        const thicknesses = groupedByItem[itemName];
        const itemTotals = {
          opening_sheets: 0,
          opening_sqm: 0,
          receive_sheets: 0,
          receive_sqm: 0,
          consume_sheets: 0,
          consume_sqm: 0,
          challan_sheets: 0,
          challan_sqm: 0,
          order_sheets: 0,
          order_sqm: 0,
          issue_for_ply_resizing_sheets: 0,
          issue_for_ply_resizing_sqm: 0,
          issue_for_pressing_sheets: 0,
          issue_for_pressing_sqm: 0,
          closing_sheets: 0,
          closing_sqm: 0,
        };

        Object.keys(thicknesses)
          .sort((a, b) => parseFloat(a) - parseFloat(b))
          .forEach((thickness) => {
            const rows = thicknesses[thickness];
            const thicknessTotals = {
              opening_sheets: 0,
              opening_sqm: 0,
              receive_sheets: 0,
              receive_sqm: 0,
              consume_sheets: 0,
              consume_sqm: 0,
              challan_sheets: 0,
              challan_sqm: 0,
              order_sheets: 0,
              order_sqm: 0,
              issue_for_ply_resizing_sheets: 0,
              issue_for_ply_resizing_sqm: 0,
              issue_for_pressing_sheets: 0,
              issue_for_pressing_sqm: 0,
              closing_sheets: 0,
              closing_sqm: 0,
            };

            rows.forEach((item) => {
              const rowData = {
                item_name: item.item_name ?? '',
                plywood_sub_type: item.plywood_sub_type ?? '',
                thickness: item.thickness ?? 0,
                size: item.size ?? '',
                opening_sheets: item.opening_sheets ?? 0,
                opening_sqm: item.opening_sqm ?? 0,
                receive_sheets: item.receive_sheets ?? 0,
                receive_sqm: item.receive_sqm ?? 0,
                consume_sheets: item.consume_sheets ?? 0,
                consume_sqm: item.consume_sqm ?? 0,
                challan_sheets: item.challan_sheets ?? 0,
                challan_sqm: item.challan_sqm ?? 0,
                order_sheets: item.order_sheets ?? 0,
                order_sqm: item.order_sqm ?? 0,
                issue_for_ply_resizing_sheets: item.issue_for_ply_resizing_sheets ?? 0,
                issue_for_ply_resizing_sqm: item.issue_for_ply_resizing_sqm ?? 0,
                issue_for_pressing_sheets: item.issue_for_pressing_sheets ?? 0,
                issue_for_pressing_sqm: item.issue_for_pressing_sqm ?? 0,
                closing_sheets: item.closing_sheets ?? 0,
                closing_sqm: item.closing_sqm ?? 0,
              };
              worksheet.addRow(rowData);
              thicknessTotals.opening_sheets += item.opening_sheets ?? 0;
              thicknessTotals.opening_sqm += item.opening_sqm ?? 0;
              thicknessTotals.receive_sheets += item.receive_sheets ?? 0;
              thicknessTotals.receive_sqm += item.receive_sqm ?? 0;
              thicknessTotals.consume_sheets += item.consume_sheets ?? 0;
              thicknessTotals.consume_sqm += item.consume_sqm ?? 0;
              thicknessTotals.challan_sheets += item.challan_sheets ?? 0;
              thicknessTotals.challan_sqm += item.challan_sqm ?? 0;
              thicknessTotals.order_sheets += item.order_sheets ?? 0;
              thicknessTotals.order_sqm += item.order_sqm ?? 0;
              thicknessTotals.issue_for_ply_resizing_sheets += item.issue_for_ply_resizing_sheets ?? 0;
              thicknessTotals.issue_for_ply_resizing_sqm += item.issue_for_ply_resizing_sqm ?? 0;
              thicknessTotals.issue_for_pressing_sheets += item.issue_for_pressing_sheets ?? 0;
              thicknessTotals.issue_for_pressing_sqm += item.issue_for_pressing_sqm ?? 0;
              thicknessTotals.closing_sheets += item.closing_sheets ?? 0;
              thicknessTotals.closing_sqm += item.closing_sqm ?? 0;
            });

            const thicknessTotalRow = worksheet.addRow({
              item_name: '',
              plywood_sub_type: '',
              thickness: '',
              size: 'Total',
              ...thicknessTotals,
            });
            thicknessTotalRow.eachCell((cell) => {
              cell.font = { bold: true };
            });

            Object.keys(itemTotals).forEach((key) => {
              itemTotals[key] += thicknessTotals[key];
            });
          });

        const itemTotalRow = worksheet.addRow({
          item_name: itemName,
          plywood_sub_type: '',
          thickness: '',
          size: 'Item Total',
          ...itemTotals,
        });
        itemTotalRow.eachCell((cell) => {
          cell.font = { bold: true };
        });

        Object.keys(grandTotals).forEach((key) => {
          grandTotals[key] += itemTotals[key];
        });
      });

    const grandTotalRow = worksheet.addRow({
      item_name: 'Total',
      plywood_sub_type: '',
      thickness: '',
      size: '',
      ...grandTotals,
    });
    grandTotalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    const timeStamp = new Date().getTime();
    const fileName = `Plywood-Stock-Report-ItemWise-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    return `${process.env.APP_URL}${filePath}`;
  } catch (error) {
    console.error('Error creating plywood item-wise stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};

/**
 * Generate Plywood Stock Report Excel – By Pellet No. Pellet No. as first column; grouped by Plywood Sub Category.
 *
 * @param {Array} aggregatedData - Stock data per pellet (pallet_number)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filters - Optional filters (e.g. item_sub_category_name)
 * @returns {String} Download link for the generated Excel file
 */
export const GeneratePlywoodStockReportByPelletExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Plywood';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Plywood Stock Report (By Pellet No.)');

    const formatDate = (dateStr) => {
      try {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (error) {
        return dateStr || 'N/A';
      }
    };

    let title = 'Plywood Type';
    if (filters && filters.item_sub_category_name) {
      title += ` [ ${filters.item_sub_category_name} ]`;
    } else {
      title += ' [ ALL ]';
    }
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    title += `   stock  in the period  ${formattedStartDate} and ${formattedEndDate}`;

    const columnDefinitions = [
      { key: 'pellet_no', width: 12 },
      { key: 'plywood_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_sheets', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_sheets', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_sheets', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'challan_sheets', width: 14 },
      { key: 'challan_sqm', width: 14 },
      { key: 'order_sheets', width: 12 },
      { key: 'order_sqm', width: 12 },
      { key: 'issue_for_ply_resizing_sheets', width: 22 },
      { key: 'issue_for_ply_resizing_sqm', width: 22 },
      { key: 'issue_for_pressing_sheets', width: 18 },
      { key: 'issue_for_pressing_sqm', width: 20 },
      { key: 'closing_sheets', width: 12 },
      { key: 'closing_sqm', width: 12 },
    ];

    worksheet.columns = columnDefinitions;

    const filterRow = worksheet.addRow([title]);
    filterRow.font = { bold: true, size: 12 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    filterRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 20);

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'Pellet No.',
      'Plywood Sub Category',
      'Thickness',
      'Size',
      'Opening Sheets',
      'Opening Metres',
      'Received Sheets',
      'Received Mtrs',
      'Consumed Sheets',
      'Consumed Mtrs',
      'Challan Sheets',
      'Challan Mtrs',
      'Order Sheets',
      'Order Mtrs',
      'Issue For Ply Resizing Sheet',
      'Issue For Ply Resizing Sq Met',
      'Issue For Pressing',
      'Issue For Pressing Sq Met',
      'Closing sheets',
      'Closing Metres',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    const groupedBySubCategory = {};
    aggregatedData.forEach((item) => {
      const subType = item.plywood_sub_type || 'OTHER';
      if (!groupedBySubCategory[subType]) {
        groupedBySubCategory[subType] = [];
      }
      groupedBySubCategory[subType].push(item);
    });

    const grandTotals = {
      opening_sheets: 0,
      opening_sqm: 0,
      receive_sheets: 0,
      receive_sqm: 0,
      consume_sheets: 0,
      consume_sqm: 0,
      challan_sheets: 0,
      challan_sqm: 0,
      order_sheets: 0,
      order_sqm: 0,
      issue_for_ply_resizing_sheets: 0,
      issue_for_ply_resizing_sqm: 0,
      issue_for_pressing_sheets: 0,
      issue_for_pressing_sqm: 0,
      closing_sheets: 0,
      closing_sqm: 0,
    };

    Object.keys(groupedBySubCategory)
      .sort()
      .forEach((subType) => {
        const items = groupedBySubCategory[subType];
        const categoryTotals = {
          opening_sheets: 0,
          opening_sqm: 0,
          receive_sheets: 0,
          receive_sqm: 0,
          consume_sheets: 0,
          consume_sqm: 0,
          challan_sheets: 0,
          challan_sqm: 0,
          order_sheets: 0,
          order_sqm: 0,
          issue_for_ply_resizing_sheets: 0,
          issue_for_ply_resizing_sqm: 0,
          issue_for_pressing_sheets: 0,
          issue_for_pressing_sqm: 0,
          closing_sheets: 0,
          closing_sqm: 0,
        };

        items.forEach((item) => {
          const rowData = {
            pellet_no: item.pellet_no ?? '',
            plywood_sub_type: item.plywood_sub_type ?? '',
            thickness: item.thickness ?? 0,
            size: item.size ?? '',
            opening_sheets: item.opening_sheets ?? 0,
            opening_sqm: item.opening_sqm ?? 0,
            receive_sheets: item.receive_sheets ?? 0,
            receive_sqm: item.receive_sqm ?? 0,
            consume_sheets: item.consume_sheets ?? 0,
            consume_sqm: item.consume_sqm ?? 0,
            challan_sheets: item.challan_sheets ?? 0,
            challan_sqm: item.challan_sqm ?? 0,
            order_sheets: item.order_sheets ?? 0,
            order_sqm: item.order_sqm ?? 0,
            issue_for_ply_resizing_sheets: item.issue_for_ply_resizing_sheets ?? 0,
            issue_for_ply_resizing_sqm: item.issue_for_ply_resizing_sqm ?? 0,
            issue_for_pressing_sheets: item.issue_for_pressing_sheets ?? 0,
            issue_for_pressing_sqm: item.issue_for_pressing_sqm ?? 0,
            closing_sheets: item.closing_sheets ?? 0,
            closing_sqm: item.closing_sqm ?? 0,
          };
          worksheet.addRow(rowData);
          categoryTotals.opening_sheets += item.opening_sheets ?? 0;
          categoryTotals.opening_sqm += item.opening_sqm ?? 0;
          categoryTotals.receive_sheets += item.receive_sheets ?? 0;
          categoryTotals.receive_sqm += item.receive_sqm ?? 0;
          categoryTotals.consume_sheets += item.consume_sheets ?? 0;
          categoryTotals.consume_sqm += item.consume_sqm ?? 0;
          categoryTotals.challan_sheets += item.challan_sheets ?? 0;
          categoryTotals.challan_sqm += item.challan_sqm ?? 0;
          categoryTotals.order_sheets += item.order_sheets ?? 0;
          categoryTotals.order_sqm += item.order_sqm ?? 0;
          categoryTotals.issue_for_ply_resizing_sheets += item.issue_for_ply_resizing_sheets ?? 0;
          categoryTotals.issue_for_ply_resizing_sqm += item.issue_for_ply_resizing_sqm ?? 0;
          categoryTotals.issue_for_pressing_sheets += item.issue_for_pressing_sheets ?? 0;
          categoryTotals.issue_for_pressing_sqm += item.issue_for_pressing_sqm ?? 0;
          categoryTotals.closing_sheets += item.closing_sheets ?? 0;
          categoryTotals.closing_sqm += item.closing_sqm ?? 0;
        });

        const categoryTotalRow = worksheet.addRow({
          pellet_no: '',
          plywood_sub_type: '',
          thickness: '',
          size: 'Total',
          ...categoryTotals,
        });
        categoryTotalRow.eachCell((cell) => {
          cell.font = { bold: true };
        });

        Object.keys(grandTotals).forEach((key) => {
          grandTotals[key] += categoryTotals[key];
        });
      });

    const grandTotalRow = worksheet.addRow({
      pellet_no: '',
      plywood_sub_type: 'Total',
      thickness: '',
      size: '',
      ...grandTotals,
    });
    grandTotalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    const timeStamp = new Date().getTime();
    const fileName = `Plywood-Stock-Report-ByPellet-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    return `${process.env.APP_URL}${filePath}`;
  } catch (error) {
    console.error('Error creating plywood stock report by pellet:', error);
    throw new ApiError(500, error.message, error);
  }
};
