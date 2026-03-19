import ExcelJS from 'exceljs';
import fs from 'fs/promises';

/**
 * Format date to DD/MM/YYYY
 */
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Group data by item name and log number (same shape as existing config for controller compatibility)
 */
const groupData = (data) => {
  const grouped = {};

  data.forEach((record) => {
    const itemName = record.item_name || 'UNKNOWN';
    const logNo = record.log_no || 'UNKNOWN';

    if (!grouped[itemName]) {
      grouped[itemName] = {};
    }

    if (!grouped[itemName][logNo]) {
      grouped[itemName][logNo] = {
        original_log: {
          log_no: logNo,
          length: record.original_log?.physical_length || 0,
          girth: record.original_log?.physical_diameter || 0,
          inward_cmt: record.original_log?.physical_cmt || 0,
        },
        pieces: [],
      };
    }

    grouped[itemName][logNo].pieces.push({
      code: record.code,
      log_no_code: record.log_no_code,
      length: record.length,
      girth: record.girth,
      cc_cmt: record.crosscut_cmt,
    });
  });

  return grouped;
};

/**
 * Generate CrossCut Daily Report with two-row-per-log layout per image:
 * Row 1 (Log): Item Name, LogNo, Length, Girth, Inward CMT; cols 6-9 empty
 * Row 2 (LogX): cols 1-5 empty; LogX, Length, Girth, CC CMT
 * Row 3: "Total" in LogX column, CC CMT subtotal only
 */
const GenerateCrosscutDailyReportExcel = async (details, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('CrossCut Report');

  const formattedDate = formatDate(reportDate);
  let currentRow = 1;

  // Row 1: Title
  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `CrossCut Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  currentRow += 2;

  // Main data headers
  const headers = [
    'Item Name',
    'LogNo',
    'Length',
    'Girth',
    'Inward CMT',
    'LogX',
    'Length',
    'Girth',
    'CC CMT',
  ];

  const thinBorder = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    cell.border = thinBorder;
  });
  currentRow++;

  worksheet.columns = [
    { width: 15 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
  ];

  const groupedData = groupData(details);
  const itemTotals = {};
  let grandTotalInward = 0;
  let grandTotalCC = 0;

  Object.keys(groupedData)
    .sort()
    .forEach((itemName) => {
      const itemStartRow = currentRow;
      let itemInwardTotal = 0;
      let itemCCTotal = 0;
      const logs = groupedData[itemName];

      Object.keys(logs)
        .sort()
        .forEach((logNo) => {
          const logData = logs[logNo];
          let logCCTotal = 0;

          logData.pieces.forEach((piece, pieceIndex) => {
            const row = worksheet.getRow(currentRow);

            if (pieceIndex === 0) {
              // First piece: Log info + LogX on same row (no empty row)
              if (currentRow === itemStartRow) {
                row.getCell(1).value = itemName;
              }
              row.getCell(2).value = logData.original_log.log_no;
              row.getCell(3).value = logData.original_log.length;
              row.getCell(4).value = logData.original_log.girth;
              row.getCell(5).value = logData.original_log.inward_cmt;
            }

            // LogX columns (6-9): LogX, Length, Girth, CC CMT
            row.getCell(6).value = piece.log_no_code || piece.code;
            row.getCell(7).value = piece.length;
            row.getCell(8).value = piece.girth;
            row.getCell(9).value = piece.cc_cmt;

            [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((colNum) => {
              const cell = row.getCell(colNum);
              cell.border = thinBorder;
              if (cell.value != null && typeof cell.value === 'number') {
                cell.numFmt = '0.000';
              }
            });
            logCCTotal += piece.cc_cmt || 0;
            currentRow++;
          });

          // Row 3: Total in LogX column, CC CMT only
          const totalRow = worksheet.getRow(currentRow);
          totalRow.getCell(6).value = 'Total';
          totalRow.getCell(6).font = { bold: true };
          totalRow.getCell(9).value = logCCTotal;
          totalRow.getCell(9).font = { bold: true };
          totalRow.getCell(9).numFmt = '0.000';
          [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((colNum) => {
            totalRow.getCell(colNum).border = thinBorder;
          });
          currentRow++;

          itemInwardTotal += logData.original_log.inward_cmt || 0;
          itemCCTotal += logCCTotal;
        });

      // Item-level total: one "Total" row under LogNo column with CC CMT
      const itemTotalRow = worksheet.getRow(currentRow);
      itemTotalRow.getCell(2).value = 'Total';
      itemTotalRow.getCell(2).font = { bold: true };
      itemTotalRow.getCell(9).value = itemCCTotal;
      itemTotalRow.getCell(9).font = { bold: true };
      itemTotalRow.getCell(9).numFmt = '0.000';
      [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((colNum) => {
        itemTotalRow.getCell(colNum).border = thinBorder;
      });
      currentRow++;

      itemTotals[itemName] = { inward: itemInwardTotal, cc: itemCCTotal };
      grandTotalInward += itemInwardTotal;
      grandTotalCC += itemCCTotal;
    });

  // Summary section
  currentRow++;
  const summaryHeaderRow = worksheet.getRow(currentRow);
  summaryHeaderRow.getCell(1).value = 'Item Name';
  summaryHeaderRow.getCell(2).value = 'Inward CMT';
  summaryHeaderRow.getCell(3).value = 'CC CMT';
  summaryHeaderRow.font = { bold: true };
  summaryHeaderRow.eachCell({ includeEmpty: false }, (cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });
  currentRow++;

  Object.keys(itemTotals)
    .sort()
    .forEach((itemName) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = itemName;
      row.getCell(2).value = itemTotals[itemName].inward;
      row.getCell(2).numFmt = '0.000';
      row.getCell(3).value = itemTotals[itemName].cc;
      row.getCell(3).numFmt = '0.000';
      [1, 2, 3].forEach((colNum) => {
        row.getCell(colNum).border = thinBorder;
      });
      currentRow++;
    });

  const summaryTotalRow = worksheet.getRow(currentRow);
  summaryTotalRow.getCell(1).value = 'Total';
  summaryTotalRow.getCell(2).value = grandTotalInward;
  summaryTotalRow.getCell(3).value = grandTotalCC;
  summaryTotalRow.font = { bold: true };
  summaryTotalRow.getCell(2).numFmt = '0.000';
  summaryTotalRow.getCell(3).numFmt = '0.000';
  [1, 2, 3].forEach((colNum) => {
    summaryTotalRow.getCell(colNum).border = thinBorder;
  });

  const timestamp = new Date().getTime();
  const fileName = `crosscutting_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/CrossCutting';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  return `${process.env.APP_URL}${filePath}`;
};

export { GenerateCrosscutDailyReportExcel };
