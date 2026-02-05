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
 * Derive numeric Clipping Id from ObjectId (e.g. last 6 hex chars as number)
 */
const clippingIdFromObjectId = (id) => {
  if (!id) return 0;
  const str = id.toString();
  return parseInt(str.slice(-6), 16) || 0;
};

/**
 * Group flattened rows by item_name for main table; collect unique other_details for Clipping ID table.
 */
const groupData = (data) => {
  const byItem = {};
  const dimensionSummary = {};
  const clippingBatches = new Map();

  data.forEach((record) => {
    const item = record.items;
    const itemName = item?.item_name || 'UNKNOWN';

    if (!byItem[itemName]) {
      byItem[itemName] = [];
    }
    byItem[itemName].push({
      log_no_code: item?.log_no_code ?? '',
      length: Number(item?.length) || 0,
      width: Number(item?.width) || 0,
      no_of_sheets: Number(item?.no_of_sheets) || 0,
      sqm: Number(item?.sqm) || 0,
      character_name: item?.character_name ?? '-',
      pattern_name: item?.pattern_name ?? '-',
      series_name: item?.series_name ?? '-',
      remark: item?.remark ?? '',
    });

    const key = `${Number(item?.length) || 0}_${Number(item?.width) || 0}`;
    if (!dimensionSummary[key]) {
      dimensionSummary[key] = { length: Number(item?.length) || 0, width: Number(item?.width) || 0, sheets: 0, sqm: 0 };
    }
    dimensionSummary[key].sheets += Number(item?.no_of_sheets) || 0;
    dimensionSummary[key].sqm += Number(item?.sqm) || 0;

    const batchId = record._id?.toString();
    if (batchId && !clippingBatches.has(batchId)) {
      clippingBatches.set(batchId, {
        _id: record._id,
        shift: record.shift ?? '',
        no_of_working_hours: record.no_of_working_hours ?? '',
        tapping_person_name: record.tapping_person_name ?? '',
      });
    }
  });

  return { byItem, dimensionSummary, clippingBatches: Array.from(clippingBatches.values()) };
};

/**
 * Generate Clipping Details Report Excel per plan:
 * Main table (15 cols), item subtotals + grand total, summary by length/width, Clipping ID table.
 */
const GenerateClippingDailyReportExcel = async (details, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Clipping Report');

  const formattedDate = formatDate(reportDate);
  let currentRow = 1;

  const { byItem, dimensionSummary, clippingBatches } = groupData(details);

  // Title
  worksheet.mergeCells(currentRow, 1, currentRow, 15);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Clipping Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow += 2;

  // Main table headers (15 columns)
  const mainHeaders = [
    'Item Name',
    'LogX',
    'Length',
    'Width',
    'Sheets',
    'Sq Mtr',
    'Interno Length',
    'Interno Width',
    'Interno Sheets',
    'Interno SQMtr',
    'Customer Name',
    'Character',
    'Pattern',
    'Series',
    'Remarks',
  ];

  const headerRow = worksheet.getRow(currentRow);
  mainHeaders.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  currentRow++;

  const numFmt = '0.00';
  let grandSheets = 0;
  let grandSqm = 0;

  Object.keys(byItem)
    .sort()
    .forEach((itemName) => {
      const rows = byItem[itemName];
      let itemSheets = 0;
      let itemSqm = 0;

      rows.forEach((r, idx) => {
        const row = worksheet.getRow(currentRow);
        if (idx === 0) {
          row.getCell(1).value = itemName;
        }
        row.getCell(2).value = r.log_no_code;
        row.getCell(3).value = r.length;
        row.getCell(4).value = r.width;
        row.getCell(5).value = r.no_of_sheets;
        row.getCell(6).value = r.sqm;
        row.getCell(7).value = 0;
        row.getCell(8).value = 0;
        row.getCell(9).value = 0;
        row.getCell(10).value = 0;
        row.getCell(11).value = 'TOPL';
        row.getCell(12).value = r.character_name;
        row.getCell(13).value = r.pattern_name;
        row.getCell(14).value = r.series_name;
        row.getCell(15).value = r.remark;
        [3, 4, 5, 6, 7, 8, 9, 10].forEach((col) => {
          const cell = row.getCell(col);
          if (cell.value != null && typeof cell.value === 'number') {
            cell.numFmt = numFmt;
          }
        });
        itemSheets += r.no_of_sheets;
        itemSqm += r.sqm;
        currentRow++;
      });

      // Total row for this item
      const totalRow = worksheet.getRow(currentRow);
      totalRow.getCell(2).value = 'Total';
      totalRow.getCell(2).font = { bold: true };
      totalRow.getCell(5).value = itemSheets;
      totalRow.getCell(6).value = itemSqm;
      totalRow.getCell(5).font = { bold: true };
      totalRow.getCell(6).font = { bold: true };
      totalRow.getCell(5).numFmt = numFmt;
      totalRow.getCell(6).numFmt = numFmt;
      currentRow++;

      grandSheets += itemSheets;
      grandSqm += itemSqm;
    });

  // Grand total row
  const grandRow = worksheet.getRow(currentRow);
  grandRow.getCell(1).value = 'Total';
  grandRow.getCell(2).value = '-';
  grandRow.getCell(5).value = grandSheets;
  grandRow.getCell(6).value = grandSqm;
  grandRow.getCell(1).font = { bold: true };
  grandRow.getCell(5).font = { bold: true };
  grandRow.getCell(6).font = { bold: true };
  grandRow.getCell(5).numFmt = numFmt;
  grandRow.getCell(6).numFmt = numFmt;
  currentRow += 2;

  // Summary table by dimensions: Length | Width | Sheets | SQ Mtr
  const summaryHeaderRow = worksheet.getRow(currentRow);
  summaryHeaderRow.getCell(1).value = 'Length';
  summaryHeaderRow.getCell(2).value = 'Width';
  summaryHeaderRow.getCell(3).value = 'Sheets';
  summaryHeaderRow.getCell(4).value = 'SQ Mtr';
  summaryHeaderRow.font = { bold: true };
  [1, 2, 3, 4].forEach((col) => {
    const cell = summaryHeaderRow.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  currentRow++;

  const dimKeys = Object.keys(dimensionSummary).sort((a, b) => {
    const da = dimensionSummary[a];
    const db = dimensionSummary[b];
    const diffLen = (da.length || 0) - (db.length || 0);
    if (diffLen !== 0) return diffLen;
    return (da.width || 0) - (db.width || 0);
  });
  dimKeys.forEach((key) => {
    const d = dimensionSummary[key];
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = d.length;
    row.getCell(2).value = d.width;
    row.getCell(3).value = d.sheets;
    row.getCell(4).value = d.sqm;
    [1, 2, 3, 4].forEach((col) => {
      const cell = row.getCell(col);
      if (typeof cell.value === 'number') cell.numFmt = numFmt;
    });
    currentRow++;
  });

  const summaryTotalRow = worksheet.getRow(currentRow);
  summaryTotalRow.getCell(1).value = 'Total';
  summaryTotalRow.getCell(2).value = '';
  summaryTotalRow.getCell(3).value = grandSheets;
  summaryTotalRow.getCell(4).value = grandSqm;
  summaryTotalRow.font = { bold: true };
  summaryTotalRow.getCell(3).numFmt = numFmt;
  summaryTotalRow.getCell(4).numFmt = numFmt;
  currentRow += 2;

  // Clipping ID table: Clipping Id | Shift | Work Hours | Worker | Machine Id
  const clipHeaderRow = worksheet.getRow(currentRow);
  clipHeaderRow.getCell(1).value = 'Clipping Id';
  clipHeaderRow.getCell(2).value = 'Shift';
  clipHeaderRow.getCell(3).value = 'Work Hours';
  clipHeaderRow.getCell(4).value = 'Worker';
  clipHeaderRow.getCell(5).value = 'Machine Id';
  clipHeaderRow.font = { bold: true };
  [1, 2, 3, 4, 5].forEach((col) => {
    const cell = clipHeaderRow.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  currentRow++;

  clippingBatches.forEach((batch) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = clippingIdFromObjectId(batch._id);
    row.getCell(2).value = batch.shift ?? '';
    row.getCell(3).value = batch.no_of_working_hours ?? '';
    row.getCell(4).value = batch.tapping_person_name ?? '';
    row.getCell(5).value = 0;
    currentRow++;
  });

  worksheet.columns = [
    { width: 28 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
  ];

  const timestamp = new Date().getTime();
  const fileName = `clipping_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/TappingORClipping';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  return `${process.env.APP_URL}${filePath}`;
};

export { GenerateClippingDailyReportExcel };
