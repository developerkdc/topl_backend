import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Generate Fleece Stock Report Excel for reports2.
 * Title: Fleece Paper Type [ filter ] stock in the period DD/MM/YYYY and DD/MM/YYYY
 * Columns: Fleece Paper Sub Category, Thickness, Size, Opening Rolls, Received, Consumed, Sales, Issue For Pressing, Closing (rolls + sqm).
 *
 * @param {Array} aggregatedData - Aggregated stock data per (fleece_sub_type, thickness, size)
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filters - Optional filters (e.g. item_sub_category_name)
 * @returns {String} Download link for the generated Excel file
 */
export const GenerateFleeceStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Fleece';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Fleece Stock Report');

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

    let title = 'Fleece Paper Type';
    if (filters && filters.item_sub_category_name) {
      title += ` [ ${filters.item_sub_category_name} ]`;
    } else {
      title += ' [ ALL ]';
    }
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    title += `   stock  in the period  ${formattedStartDate} and ${formattedEndDate}`;

    const columnDefinitions = [
      { key: 'fleece_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_rolls', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_rolls', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_rolls', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'order_rolls', width: 12 },
      { key: 'order_sqm', width: 12 },
      { key: 'issue_pressing_rolls', width: 20 },
      { key: 'issue_pressing_sqm', width: 20 },
      { key: 'closing_rolls', width: 12 },
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
      'Fleece Paper Sub Category',
      'Thickness',
      'Size',
      'Opening Rolls',
      'Opening Metres',
      'Received Rolls',
      'Received Mtrs',
      'Consumed Rolls',
      'Consumed Mtrs',
      'Order Rolls',
      'Order Mtrs',
      'Issue For Pressing',
      'Issue For Pressing Sq Met',
      'Closing Rolls',
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
      const subType = item.fleece_sub_type || 'OTHER';
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
      opening_rolls: 0,
      opening_sqm: 0,
      receive_rolls: 0,
      receive_sqm: 0,
      consume_rolls: 0,
      consume_sqm: 0,
      challan_rolls: 0,
      challan_sqm: 0,
      order_rolls: 0,
      order_sqm: 0,
      issue_pressing_rolls: 0,
      issue_pressing_sqm: 0,
      closing_rolls: 0,
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
              opening_rolls: 0,
              opening_sqm: 0,
              receive_rolls: 0,
              receive_sqm: 0,
              consume_rolls: 0,
              consume_sqm: 0,
              challan_rolls: 0,
              challan_sqm: 0,
              order_rolls: 0,
              order_sqm: 0,
              issue_pressing_rolls: 0,
              issue_pressing_sqm: 0,
              closing_rolls: 0,
              closing_sqm: 0,
            };

            items.forEach((item) => {
              const fullRowData = {
                fleece_sub_type: item.fleece_sub_type || '',
                thickness: item.thickness || 0,
                size: item.size || '',
                opening_rolls: item.opening_rolls || 0,
                opening_sqm: item.opening_sqm || 0,
                receive_rolls: item.receive_rolls || 0,
                receive_sqm: item.receive_sqm || 0,
                consume_rolls: item.consume_rolls || 0,
                consume_sqm: item.consume_sqm || 0,
                challan_rolls: item.challan_rolls || 0,
                challan_sqm: item.challan_sqm || 0,
                order_rolls: item.order_rolls || 0,
                order_sqm: item.order_sqm || 0,
                issue_pressing_rolls: item.issue_pressing_rolls || 0,
                issue_pressing_sqm: item.issue_pressing_sqm || 0,
                closing_rolls: item.closing_rolls || 0,
                closing_sqm: item.closing_sqm || 0,
              };
              const { challan_rolls, challan_sqm, ...rowData } = fullRowData;
              worksheet.addRow(rowData);
              Object.keys(thicknessTotals).forEach((key) => {
                thicknessTotals[key] += fullRowData[key] || 0;
              });
            });

            const { challan_rolls: _cs1, challan_sqm: _csq1, ...displayTotals } = thicknessTotals;
            const thicknessTotalRow = worksheet.addRow({
              fleece_sub_type: '',
              thickness: '',
              size: 'Total',
              ...displayTotals,
            });
            thicknessTotalRow.eachCell((cell) => {
              cell.font = { bold: true };
            });

            Object.keys(grandTotals).forEach((key) => {
              grandTotals[key] += thicknessTotals[key];
            });
          });
      });

    const { challan_rolls: _cs2, challan_sqm: _csq2, ...displayGrandTotals } = grandTotals;
    const grandTotalRow = worksheet.addRow({
      fleece_sub_type: 'Total',
      thickness: '',
      size: '',
      ...displayGrandTotals,
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
    const fileName = `Fleece-Paper-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    return `${process.env.APP_URL}${filePath}`;
  } catch (error) {
    console.error('Error creating fleece stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};

/**
 * Generate Fleece Stock Report Excel – Item-wise. Same columns + Item Name first; grouped by item_name then thickness.
 */
export const GenerateFleeceItemWiseStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Fleece';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Fleece Stock Report Item Wise');

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

    let title = 'Fleece Paper Type (Item Wise)';
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
      { key: 'fleece_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_rolls', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_rolls', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_rolls', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'order_rolls', width: 12 },
      { key: 'order_sqm', width: 12 },
      { key: 'issue_pressing_rolls', width: 20 },
      { key: 'issue_pressing_sqm', width: 20 },
      { key: 'closing_rolls', width: 12 },
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
      'Fleece Paper Sub Category',
      'Thickness',
      'Size',
      'Opening Rolls',
      'Opening Metres',
      'Received Rolls',
      'Received Mtrs',
      'Consumed Rolls',
      'Consumed Mtrs',
      'Order Rolls',
      'Order Mtrs',
      'Issue For Pressing',
      'Issue For Pressing Sq Met',
      'Closing Rolls',
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
      opening_rolls: 0,
      opening_sqm: 0,
      receive_rolls: 0,
      receive_sqm: 0,
      consume_rolls: 0,
      consume_sqm: 0,
      challan_rolls: 0,
      challan_sqm: 0,
      order_rolls: 0,
      order_sqm: 0,
      issue_pressing_rolls: 0,
      issue_pressing_sqm: 0,
      closing_rolls: 0,
      closing_sqm: 0,
    };

    Object.keys(groupedByItem)
      .sort()
      .forEach((itemName) => {
        const thicknesses = groupedByItem[itemName];
        const itemTotals = {
          opening_rolls: 0,
          opening_sqm: 0,
          receive_rolls: 0,
          receive_sqm: 0,
          consume_rolls: 0,
          consume_sqm: 0,
          challan_rolls: 0,
          challan_sqm: 0,
          order_rolls: 0,
          order_sqm: 0,
          issue_pressing_rolls: 0,
          issue_pressing_sqm: 0,
          closing_rolls: 0,
          closing_sqm: 0,
        };

        Object.keys(thicknesses)
          .sort((a, b) => parseFloat(a) - parseFloat(b))
          .forEach((thickness) => {
            const rows = thicknesses[thickness];
            const thicknessTotals = {
              opening_rolls: 0,
              opening_sqm: 0,
              receive_rolls: 0,
              receive_sqm: 0,
              consume_rolls: 0,
              consume_sqm: 0,
              challan_rolls: 0,
              challan_sqm: 0,
              order_rolls: 0,
              order_sqm: 0,
              issue_pressing_rolls: 0,
              issue_pressing_sqm: 0,
              closing_rolls: 0,
              closing_sqm: 0,
            };

            rows.forEach((item) => {
              const fullRowData = {
                item_name: item.item_name ?? '',
                fleece_sub_type: item.fleece_sub_type ?? '',
                thickness: item.thickness ?? 0,
                size: item.size ?? '',
                opening_rolls: item.opening_rolls ?? 0,
                opening_sqm: item.opening_sqm ?? 0,
                receive_rolls: item.receive_rolls ?? 0,
                receive_sqm: item.receive_sqm ?? 0,
                consume_rolls: item.consume_rolls ?? 0,
                consume_sqm: item.consume_sqm ?? 0,
                challan_rolls: item.challan_rolls ?? 0,
                challan_sqm: item.challan_sqm ?? 0,
                order_rolls: item.order_rolls ?? 0,
                order_sqm: item.order_sqm ?? 0,
                issue_pressing_rolls: item.issue_pressing_rolls ?? 0,
                issue_pressing_sqm: item.issue_pressing_sqm ?? 0,
                closing_rolls: item.closing_rolls ?? 0,
                closing_sqm: item.closing_sqm ?? 0,
              };
              const { challan_rolls, challan_sqm, ...rowData } = fullRowData;
              worksheet.addRow(rowData);
              Object.keys(thicknessTotals).forEach((key) => {
                thicknessTotals[key] += fullRowData[key] ?? 0;
              });
            });

            const { challan_rolls: _cs1, challan_sqm: _csq1, ...displayTotals } = thicknessTotals;
            const thicknessTotalRow = worksheet.addRow({
              item_name: '',
              fleece_sub_type: '',
              thickness: '',
              size: 'Total',
              ...displayTotals,
            });
            thicknessTotalRow.eachCell((cell) => {
              cell.font = { bold: true };
            });

            Object.keys(itemTotals).forEach((key) => {
              itemTotals[key] += thicknessTotals[key];
            });
          });

        const { challan_rolls: _cs2, challan_sqm: _csq2, ...displayItemTotals } = itemTotals;
        const itemTotalRow = worksheet.addRow({
          item_name: itemName,
          fleece_sub_type: '',
          thickness: '',
          size: 'Item Total',
          ...displayItemTotals,
        });
        itemTotalRow.eachCell((cell) => {
          cell.font = { bold: true };
        });

        Object.keys(grandTotals).forEach((key) => {
          grandTotals[key] += itemTotals[key];
        });
      });

    const { challan_rolls: _cs3, challan_sqm: _csq3, ...displayGrandTotals } = grandTotals;
    const grandTotalRow = worksheet.addRow({
      item_name: 'Total',
      fleece_sub_type: '',
      thickness: '',
      size: '',
      ...displayGrandTotals,
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
    const fileName = `Fleece-Paper-Stock-Report-ItemWise-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    return `${process.env.APP_URL}${filePath}`;
  } catch (error) {
    console.error('Error creating fleece item-wise stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};

/**
 * Generate Fleece Stock Report Excel – By Inward Number. One row per inward per (sub_category, thickness, size).
 * Multiple items in same inward = multiple rows when specs differ.
 *
 * @param {Array} aggregatedData - Stock data per inward per spec
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filters - Optional filters (e.g. item_sub_category_name)
 * @returns {String} Download link for the generated Excel file
 */
export const GenerateFleeceStockReportByInwardExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Fleece';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Fleece Stock Report (By Inward No.)');

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

    let title = 'Fleece Paper Type';
    if (filters && filters.item_sub_category_name) {
      title += ` [ ${filters.item_sub_category_name} ]`;
    } else {
      title += ' [ ALL ]';
    }
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    title += `   stock  in the period  ${formattedStartDate} and ${formattedEndDate}`;

    const columnDefinitions = [
      { key: 'inward_no', width: 12 },
      { key: 'fleece_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_rolls', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_rolls', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_rolls', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'order_rolls', width: 12 },
      { key: 'order_sqm', width: 12 },
      { key: 'issue_pressing_rolls', width: 20 },
      { key: 'issue_pressing_sqm', width: 20 },
      { key: 'closing_rolls', width: 12 },
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
      'Inward No.',
      'Fleece Paper Sub Category',
      'Thickness',
      'Size',
      'Opening Rolls',
      'Opening Metres',
      'Received Rolls',
      'Received Mtrs',
      'Consumed Rolls',
      'Consumed Mtrs',
      'Order Rolls',
      'Order Mtrs',
      'Issue For Pressing',
      'Issue For Pressing Sq Met',
      'Closing Rolls',
      'Closing Metres',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    const grandTotals = {
      opening_rolls: 0,
      opening_sqm: 0,
      receive_rolls: 0,
      receive_sqm: 0,
      consume_rolls: 0,
      consume_sqm: 0,
      challan_rolls: 0,
      challan_sqm: 0,
      order_rolls: 0,
      order_sqm: 0,
      issue_pressing_rolls: 0,
      issue_pressing_sqm: 0,
      closing_rolls: 0,
      closing_sqm: 0,
    };

    const groupedByInward = {};
    aggregatedData.forEach((item) => {
      const key = item.inward_no ?? '';
      if (!groupedByInward[key]) groupedByInward[key] = [];
      groupedByInward[key].push(item);
    });

    const inwardOrder = [...new Set(aggregatedData.map((i) => i.inward_no ?? ''))];
    let currentRow = 4;

    inwardOrder.forEach((inwardNo) => {
      const items = groupedByInward[inwardNo] || [];
      const inwardStartRow = currentRow;

      const inwardTotals = {
        opening_rolls: 0,
        opening_sqm: 0,
        receive_rolls: 0,
        receive_sqm: 0,
        consume_rolls: 0,
        consume_sqm: 0,
        challan_rolls: 0,
        challan_sqm: 0,
        order_rolls: 0,
        order_sqm: 0,
        issue_pressing_rolls: 0,
        issue_pressing_sqm: 0,
        closing_rolls: 0,
        closing_sqm: 0,
      };

      items.forEach((item, idx) => {
        const fullRowData = {
          inward_no: idx === 0 ? (item.inward_no ?? '') : '',
          fleece_sub_type: item.fleece_sub_type ?? '',
          thickness: item.thickness ?? '',
          size: item.size ?? '',
          opening_rolls: item.opening_rolls ?? 0,
          opening_sqm: item.opening_sqm ?? 0,
          receive_rolls: item.receive_rolls ?? 0,
          receive_sqm: item.receive_sqm ?? 0,
          consume_rolls: item.consume_rolls ?? 0,
          consume_sqm: item.consume_sqm ?? 0,
          challan_rolls: item.challan_rolls ?? 0,
          challan_sqm: item.challan_sqm ?? 0,
          order_rolls: item.order_rolls ?? 0,
          order_sqm: item.order_sqm ?? 0,
          issue_pressing_rolls: item.issue_pressing_rolls ?? 0,
          issue_pressing_sqm: item.issue_pressing_sqm ?? 0,
          closing_rolls: item.closing_rolls ?? 0,
          closing_sqm: item.closing_sqm ?? 0,
        };
        const { challan_rolls, challan_sqm, ...rowData } = fullRowData;
        worksheet.addRow(rowData);
        Object.keys(inwardTotals).forEach((key) => {
          inwardTotals[key] += fullRowData[key] ?? 0;
        });
        Object.keys(grandTotals).forEach((key) => {
          grandTotals[key] += fullRowData[key] ?? 0;
        });
        currentRow++;
      });

      const { challan_rolls: _ci, challan_sqm: _csi, ...displayInwardTotals } = inwardTotals;
      const inwardTotalRow = worksheet.addRow({
        inward_no: '',
        fleece_sub_type: '',
        thickness: '',
        size: 'Total',
        ...displayInwardTotals,
      });
      inwardTotalRow.eachCell((cell) => {
        cell.font = { bold: true };
      });
      currentRow++;

      if (currentRow > inwardStartRow) {
        worksheet.mergeCells(inwardStartRow, 1, currentRow - 1, 1);
        const mergedCell = worksheet.getCell(inwardStartRow, 1);
        mergedCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    const { challan_rolls: _cs2, challan_sqm: _csq2, ...displayGrandTotals } = grandTotals;
    const grandTotalRow = worksheet.addRow({
      inward_no: 'Total',
      fleece_sub_type: '',
      thickness: '',
      size: '',
      ...displayGrandTotals,
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
    const fileName = `Fleece-Paper-Stock-Report-ByInward-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;
    await workbook.xlsx.writeFile(filePath);

    return `${process.env.APP_URL}${filePath}`;
  } catch (error) {
    console.error('Error creating fleece stock report by inward:', error);
    throw new ApiError(500, error.message, error);
  }
};
