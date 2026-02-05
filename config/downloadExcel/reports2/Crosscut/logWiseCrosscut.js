import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Create Log Wise Crosscut Report Excel
 * One row per log grouped by Item Name. Columns: Invoice CMT, Indian CMT, Physical CMT,
 * Op Bal, CC Received, CC Issued, CC Closing, Physical Length, CC Length,
 * Flitch Received, SQ Received, UN Received, Peel Received.
 * Totals row after each item group and grand total at end.
 *
 * @param {Array} logData - Array of log data with calculated metrics
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createLogWiseCrosscutReportExcel = async (
  logData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Crosscut';

    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Log Wise Crosscut Report');

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
    const title = `Logwise Crosscut between ${formattedStartDate} and ${formattedEndDate}`;

    // 15 columns
    const columnDefinitions = [
      { key: 'item_name', width: 22 },
      { key: 'log_no', width: 12 },
      { key: 'invoice_cmt', width: 12 },
      { key: 'indian_cmt', width: 12 },
      { key: 'physical_cmt', width: 12 },
      { key: 'op_bal', width: 12 },
      { key: 'cc_received', width: 12 },
      { key: 'cc_issued', width: 12 },
      { key: 'cc_closing', width: 12 },
      { key: 'physical_length', width: 14 },
      { key: 'cc_length', width: 12 },
      { key: 'flitch_received', width: 14 },
      { key: 'sq_received', width: 12 },
      { key: 'un_received', width: 12 },
      { key: 'peel_received', width: 12 },
    ];

    worksheet.columns = columnDefinitions;

    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 15);

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'Item Name',
      'Log No',
      'Invoice CMT',
      'Indian CMT',
      'Physical CMT',
      'Op Bal',
      'CC Received',
      'CC Issued',
      'CC Closing',
      'Physical Length',
      'CC Length',
      'Flitch Received',
      'SQ Received',
      'UN Received',
      'Peel Received',
    ]);
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

    const groupedData = {};
    logData.forEach((log) => {
      const itemName = log.item_name || 'UNKNOWN';
      if (!groupedData[itemName]) groupedData[itemName] = [];
      groupedData[itemName].push(log);
    });

    const grandTotals = {
      invoice_cmt: 0,
      indian_cmt: 0,
      physical_cmt: 0,
      op_bal: 0,
      cc_received: 0,
      cc_issued: 0,
      cc_closing: 0,
      physical_length: 0,
      cc_length: 0,
      flitch_received: 0,
      sq_received: 0,
      un_received: 0,
      peel_received: 0,
    };

    const sortedItemNames = Object.keys(groupedData).sort();

    sortedItemNames.forEach((itemName) => {
      const logs = groupedData[itemName];
      const itemStartRow = worksheet.lastRow.number + 1;

      const itemTotals = {
        invoice_cmt: 0,
        indian_cmt: 0,
        physical_cmt: 0,
        op_bal: 0,
        cc_received: 0,
        cc_issued: 0,
        cc_closing: 0,
        physical_length: 0,
        cc_length: 0,
        flitch_received: 0,
        sq_received: 0,
        un_received: 0,
        peel_received: 0,
      };

      logs.forEach((log, index) => {
        const rowData = {
          item_name: index === 0 ? itemName : '',
          log_no: log.log_no || '',
          invoice_cmt: parseFloat(log.invoice_cmt || 0).toFixed(3),
          indian_cmt: parseFloat(log.indian_cmt || 0).toFixed(3),
          physical_cmt: parseFloat(log.physical_cmt || 0).toFixed(3),
          op_bal: parseFloat(log.op_bal || 0).toFixed(3),
          cc_received: parseFloat(log.cc_received || 0).toFixed(3),
          cc_issued: parseFloat(log.cc_issued || 0).toFixed(3),
          cc_closing: parseFloat(log.cc_closing || 0).toFixed(3),
          physical_length: parseFloat(log.physical_length || 0).toFixed(3),
          cc_length: parseFloat(log.cc_length || 0).toFixed(3),
          flitch_received: parseFloat(log.flitch_received || 0).toFixed(3),
          sq_received: parseFloat(log.sq_received || 0).toFixed(3),
          un_received: parseFloat(log.un_received || 0).toFixed(3),
          peel_received: parseFloat(log.peel_received || 0).toFixed(3),
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

        itemTotals.invoice_cmt += parseFloat(log.invoice_cmt || 0);
        itemTotals.indian_cmt += parseFloat(log.indian_cmt || 0);
        itemTotals.physical_cmt += parseFloat(log.physical_cmt || 0);
        itemTotals.op_bal += parseFloat(log.op_bal || 0);
        itemTotals.cc_received += parseFloat(log.cc_received || 0);
        itemTotals.cc_issued += parseFloat(log.cc_issued || 0);
        itemTotals.cc_closing += parseFloat(log.cc_closing || 0);
        itemTotals.physical_length += parseFloat(log.physical_length || 0);
        itemTotals.cc_length += parseFloat(log.cc_length || 0);
        itemTotals.flitch_received += parseFloat(log.flitch_received || 0);
        itemTotals.sq_received += parseFloat(log.sq_received || 0);
        itemTotals.un_received += parseFloat(log.un_received || 0);
        itemTotals.peel_received += parseFloat(log.peel_received || 0);
      });

      if (logs.length > 1) {
        const itemEndRow = worksheet.lastRow.number;
        worksheet.mergeCells(itemStartRow, 1, itemEndRow, 1);
        const mergedCell = worksheet.getCell(itemStartRow, 1);
        mergedCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }

      // Totals row for this item
      const itemTotalRow = worksheet.addRow({
        item_name: '',
        log_no: 'Totals',
        invoice_cmt: itemTotals.invoice_cmt.toFixed(3),
        indian_cmt: itemTotals.indian_cmt.toFixed(3),
        physical_cmt: itemTotals.physical_cmt.toFixed(3),
        op_bal: itemTotals.op_bal.toFixed(3),
        cc_received: itemTotals.cc_received.toFixed(3),
        cc_issued: itemTotals.cc_issued.toFixed(3),
        cc_closing: itemTotals.cc_closing.toFixed(3),
        physical_length: itemTotals.physical_length.toFixed(3),
        cc_length: itemTotals.cc_length.toFixed(3),
        flitch_received: itemTotals.flitch_received.toFixed(3),
        sq_received: itemTotals.sq_received.toFixed(3),
        un_received: itemTotals.un_received.toFixed(3),
        peel_received: itemTotals.peel_received.toFixed(3),
      });
      itemTotalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      grandTotals.invoice_cmt += itemTotals.invoice_cmt;
      grandTotals.indian_cmt += itemTotals.indian_cmt;
      grandTotals.physical_cmt += itemTotals.physical_cmt;
      grandTotals.op_bal += itemTotals.op_bal;
      grandTotals.cc_received += itemTotals.cc_received;
      grandTotals.cc_issued += itemTotals.cc_issued;
      grandTotals.cc_closing += itemTotals.cc_closing;
      grandTotals.physical_length += itemTotals.physical_length;
      grandTotals.cc_length += itemTotals.cc_length;
      grandTotals.flitch_received += itemTotals.flitch_received;
      grandTotals.sq_received += itemTotals.sq_received;
      grandTotals.un_received += itemTotals.un_received;
      grandTotals.peel_received += itemTotals.peel_received;
    });

    // Grand total row
    const grandTotalRow = worksheet.addRow({
      item_name: 'Total',
      log_no: '',
      invoice_cmt: grandTotals.invoice_cmt.toFixed(3),
      indian_cmt: grandTotals.indian_cmt.toFixed(3),
      physical_cmt: grandTotals.physical_cmt.toFixed(3),
      op_bal: grandTotals.op_bal.toFixed(3),
      cc_received: grandTotals.cc_received.toFixed(3),
      cc_issued: grandTotals.cc_issued.toFixed(3),
      cc_closing: grandTotals.cc_closing.toFixed(3),
      physical_length: grandTotals.physical_length.toFixed(3),
      cc_length: grandTotals.cc_length.toFixed(3),
      flitch_received: grandTotals.flitch_received.toFixed(3),
      sq_received: grandTotals.sq_received.toFixed(3),
      un_received: grandTotals.un_received.toFixed(3),
      peel_received: grandTotals.peel_received.toFixed(3),
    });
    grandTotalRow.eachCell((cell) => {
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
    const fileName = `LogWiseCrosscut_${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}/${filePath}`;
    console.log('Log wise crosscut report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating log wise crosscut report:', error);
    throw new ApiError(500, error.message, error);
  }
};
