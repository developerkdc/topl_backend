import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Generate MDF Stock Report Excel for reports2.
 * Title: MDF Type [ filter ] stock in the period DD/MM/YYYY and DD/MM/YYYY
 * Columns: MDF Sub Type, Thickness, Size, Opening, Receive, Consume, Sales, Issue For Pressing, Closing (sheets + sqm).
 *
 * @param {Array} aggregatedData - Aggregated stock data per (mdf_sub_type, thickness, size)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filters - Optional filters (e.g. item_sub_category_name)
 * @returns {String} Download link for the generated Excel file
 */
export const GenerateMdfStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/MDF';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('MDF Stock Report');

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

    let title = 'MDF Type';
    if (filters && filters.item_sub_category_name) {
      title += ` [ ${filters.item_sub_category_name} ]`;
    } else {
      title += ' [ ALL ]';
    }
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    title += `   stock  in the period  ${formattedStartDate} and ${formattedEndDate}`;

    const columnDefinitions = [
      { key: 'mdf_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_sheets', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_sheets', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_sheets', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'sales_sheets', width: 12 },
      { key: 'sales_sqm', width: 12 },
      { key: 'issue_pressing_sheets', width: 20 },
      { key: 'issue_pressing_sqm', width: 20 },
      { key: 'closing_sheets', width: 12 },
      { key: 'closing_sqm', width: 12 },
    ];

    worksheet.columns = columnDefinitions;

    const filterRow = worksheet.addRow([title]);
    filterRow.font = { bold: true, size: 12 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    filterRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 15);

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'MDF Sub Type',
      'Thickness',
      'Size',
      'Opening',
      'Op Metres',
      'Receive',
      'Rec Mtrs',
      'Consume',
      'Cons Mtrs',
      'Sales',
      'Sales Mtrs',
      'Issue For Pressing',
      'Issue For Pressing Sq Met',
      'Closing',
      'Cl Metres',
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
      const subType = item.mdf_sub_type || 'OTHER';
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
      sales_sheets: 0,
      sales_sqm: 0,
      issue_pressing_sheets: 0,
      issue_pressing_sqm: 0,
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
              sales_sheets: 0,
              sales_sqm: 0,
              issue_pressing_sheets: 0,
              issue_pressing_sqm: 0,
              closing_sheets: 0,
              closing_sqm: 0,
            };

            items.forEach((item) => {
              const rowData = {
                mdf_sub_type: item.mdf_sub_type || '',
                thickness: item.thickness || 0,
                size: item.size || '',
                opening_sheets: item.opening_sheets || 0,
                opening_sqm: item.opening_sqm || 0,
                receive_sheets: item.receive_sheets || 0,
                receive_sqm: item.receive_sqm || 0,
                consume_sheets: item.consume_sheets || 0,
                consume_sqm: item.consume_sqm || 0,
                sales_sheets: item.sales_sheets || 0,
                sales_sqm: item.sales_sqm || 0,
                issue_pressing_sheets: item.issue_pressing_sheets || 0,
                issue_pressing_sqm: item.issue_pressing_sqm || 0,
                closing_sheets: item.closing_sheets || 0,
                closing_sqm: item.closing_sqm || 0,
              };
              worksheet.addRow(rowData);
              Object.keys(thicknessTotals).forEach((key) => {
                thicknessTotals[key] += rowData[key] || 0;
              });
            });

            const thicknessTotalRow = worksheet.addRow({
              mdf_sub_type: '',
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
      mdf_sub_type: 'Total',
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
    const fileName = `MDF-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    return downloadLink;
  } catch (error) {
    console.error('Error creating MDF stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};

/**
 * Generate MDF Stock Report Excel – Item-wise. Same columns + Item Name first; grouped by item_name then thickness.
 */
export const GenerateMdfItemWiseStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/MDF';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('MDF Stock Report Item Wise');

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

    let title = 'MDF Type (Item Wise)';
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
      { key: 'mdf_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_sheets', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_sheets', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_sheets', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'sales_sheets', width: 12 },
      { key: 'sales_sqm', width: 12 },
      { key: 'issue_pressing_sheets', width: 20 },
      { key: 'issue_pressing_sqm', width: 20 },
      { key: 'closing_sheets', width: 12 },
      { key: 'closing_sqm', width: 12 },
    ];

    worksheet.columns = columnDefinitions;

    const filterRow = worksheet.addRow([title]);
    filterRow.font = { bold: true, size: 12 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    filterRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 16);

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'Item Name',
      'MDF Sub Type',
      'Thickness',
      'Size',
      'Opening',
      'Op Metres',
      'Receive',
      'Rec Mtrs',
      'Consume',
      'Cons Mtrs',
      'Sales',
      'Sales Mtrs',
      'Issue For Pressing',
      'Issue For Pressing Sq Met',
      'Closing',
      'Cl Metres',
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
      sales_sheets: 0,
      sales_sqm: 0,
      issue_pressing_sheets: 0,
      issue_pressing_sqm: 0,
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
          sales_sheets: 0,
          sales_sqm: 0,
          issue_pressing_sheets: 0,
          issue_pressing_sqm: 0,
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
              sales_sheets: 0,
              sales_sqm: 0,
              issue_pressing_sheets: 0,
              issue_pressing_sqm: 0,
              closing_sheets: 0,
              closing_sqm: 0,
            };

            rows.forEach((item) => {
              const rowData = {
                item_name: item.item_name ?? '',
                mdf_sub_type: item.mdf_sub_type ?? '',
                thickness: item.thickness ?? 0,
                size: item.size ?? '',
                opening_sheets: item.opening_sheets ?? 0,
                opening_sqm: item.opening_sqm ?? 0,
                receive_sheets: item.receive_sheets ?? 0,
                receive_sqm: item.receive_sqm ?? 0,
                consume_sheets: item.consume_sheets ?? 0,
                consume_sqm: item.consume_sqm ?? 0,
                sales_sheets: item.sales_sheets ?? 0,
                sales_sqm: item.sales_sqm ?? 0,
                issue_pressing_sheets: item.issue_pressing_sheets ?? 0,
                issue_pressing_sqm: item.issue_pressing_sqm ?? 0,
                closing_sheets: item.closing_sheets ?? 0,
                closing_sqm: item.closing_sqm ?? 0,
              };
              worksheet.addRow(rowData);
              Object.keys(thicknessTotals).forEach((key) => {
                thicknessTotals[key] += rowData[key] ?? 0;
              });
            });

            const thicknessTotalRow = worksheet.addRow({
              item_name: '',
              mdf_sub_type: '',
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
          mdf_sub_type: '',
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
      mdf_sub_type: '',
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
    const fileName = `MDF-Stock-Report-ItemWise-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    return `${process.env.APP_URL}${filePath}`;
  } catch (error) {
    console.error('Error creating MDF item-wise stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};
