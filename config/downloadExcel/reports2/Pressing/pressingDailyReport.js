import ExcelJS from 'exceljs';
import fs from 'fs/promises';

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

const BASE_TYPE_TO_CATEGORY = {
  MDF: 'Decorative Mdf',
  PLYWOOD: 'Decorative Plywood',
  FLEECE_PAPER: 'Fleece Back Veneer',
};

const BASE_TYPE_TO_BASE_LABEL = {
  MDF: 'MDF',
  PLYWOOD: 'PLYWOOD',
  FLEECE_PAPER: 'PAPER',
};

/** Side not in schema; use placeholder per category or leave blank */
const SIDE_PLACEHOLDER = '';

/** Format length/width as raw "L X W" (no unit conversion) */
function formatSize(length, width) {
  if (length == null || width == null) return '';
  const l = Number(length);
  const w = Number(width);
  if (Number.isNaN(l) || Number.isNaN(w)) return '';
  return `${l} X ${w}`;
}

/** Return sqm; if 0 or missing, calculate from length*width (assume cm: /10000) */
function getSqm(sqm, length, width) {
  const s = Number(sqm);
  if (s != null && !Number.isNaN(s) && s > 0) return s;
  const l = Number(length);
  const w = Number(width);
  if (l == null || w == null || Number.isNaN(l) || Number.isNaN(w)) return 0;
  return (l * w) / 10000;
}

const headerStyle = {
  font: { bold: true },
  alignment: { horizontal: 'center', vertical: 'middle' },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  },
  border: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  },
};

/**
 * Generate Pressing Daily Report Excel with 3 sections:
 * 1) Pressing Details: Category, Base, Item Name, Thick., Side, Size, Sheets, Sq Mtr (from base_details)
 * 2) Core - Face Consumption Sq.Mtr.
 * 3) Plywood Consumption Sq.Mtr.
 */
const GeneratePressingDailyReportExcel = async (pressingData, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pressing Daily Report');

  const formattedDate = formatDate(reportDate);
  let currentRow = 1;

  const sectionHeaderStyle = {
    font: { bold: true, size: 12 },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };

  // ---- Section 1 header: Pressing Details Report Date ----
  worksheet.mergeCells(currentRow, 1, currentRow, 8);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Pressing Details Report Date: ${formattedDate}`;
  Object.assign(titleCell, sectionHeaderStyle);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // ---- Section 1: Pressing Details table (Category, Base, Item Name, Thick., Side, Size, Sheets, Sq Mtr) ----
  const pressingDetailsHeaders = [
    'Category',
    'Base',
    'Item Name',
    'Thick.',
    'Side',
    'Size',
    'Sheets',
    'Sq Mtr',
  ];
  const pressingDetailsHeaderRow = worksheet.getRow(currentRow);
  pressingDetailsHeaders.forEach((h, i) => {
    const cell = pressingDetailsHeaderRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });
  currentRow++;

  const pressingDetailsRows = [];
  pressingData.forEach((doc) => {
    const consumed = doc.consumed || {};
    const baseDetails = consumed.base_details || [];
    // Thickness, Size and Sheets come from the pressing_done_details record (doc),
    // not from the individual base_details item.
    const docThick = doc.thickness ?? 0;
    const docSheets = doc.no_of_sheets ?? 0;
    const docSqm = getSqm(doc.sqm, doc.length, doc.width);
    const docSize = formatSize(doc.length, doc.width);
    baseDetails.forEach((bd) => {
      const baseType = (bd.base_type || '').toUpperCase();
      pressingDetailsRows.push({
        category: BASE_TYPE_TO_CATEGORY[baseType] || baseType,
        base: BASE_TYPE_TO_BASE_LABEL[baseType] || baseType,
        itemName: bd.item_name || '',
        thick: docThick,
        side: SIDE_PLACEHOLDER,
        size: docSize,
        sheets: docSheets,
        sqm: docSqm,
      });
    });
  });

  const pressingDetailsByCategory = {};
  pressingDetailsRows.forEach((r) => {
    const key = r.category;
    if (!pressingDetailsByCategory[key]) pressingDetailsByCategory[key] = [];
    pressingDetailsByCategory[key].push(r);
  });

  let pressingDetailsTotalSheets = 0;
  let pressingDetailsTotalSqm = 0;
  const categoryOrder = [
    'Decorative Mdf',
    'Decorative Plywood',
    'Fleece Back Veneer',
  ];
  categoryOrder.forEach((cat) => {
    const rows = pressingDetailsByCategory[cat] || [];
    if (rows.length === 0) return;
    let catSheets = 0;
    let catSqm = 0;
    const byThickSideSize = {};
    rows.forEach((r) => {
      const key = `${r.thick}_${r.side}_${r.size}_${r.itemName}`;
      if (!byThickSideSize[key]) byThickSideSize[key] = { ...r, sheets: 0, sqm: 0 };
      byThickSideSize[key].sheets += r.sheets;
      byThickSideSize[key].sqm += r.sqm;
    });
    Object.values(byThickSideSize).forEach((r, idx) => {
      const row = worksheet.getRow(currentRow);
      if (idx === 0) row.getCell(1).value = cat;
      row.getCell(2).value = r.base;
      row.getCell(3).value = r.itemName;
      row.getCell(4).value = r.thick;
      row.getCell(5).value = r.side;
      row.getCell(6).value = r.size;
      row.getCell(7).value = r.sheets;
      row.getCell(8).value = Math.round(r.sqm * 1000) / 1000;
      row.getCell(4).numFmt = '0.000';
      row.getCell(8).numFmt = '0.000';
      catSheets += r.sheets;
      catSqm += r.sqm;
      currentRow++;
    });
    const catTotalRow = worksheet.getRow(currentRow);
    catTotalRow.getCell(1).value = 'Total';
    catTotalRow.getCell(1).font = { bold: true };
    catTotalRow.getCell(7).value = catSheets;
    catTotalRow.getCell(8).value = Math.round(catSqm * 1000) / 1000;
    catTotalRow.getCell(7).font = { bold: true };
    catTotalRow.getCell(8).font = { bold: true };
    catTotalRow.getCell(8).numFmt = '0.000';
    currentRow++;
    pressingDetailsTotalSheets += catSheets;
    pressingDetailsTotalSqm += catSqm;
  });

  const pressingDetailsGrandRow = worksheet.getRow(currentRow);
  pressingDetailsGrandRow.getCell(1).value = 'Total';
  pressingDetailsGrandRow.getCell(1).font = { bold: true };
  pressingDetailsGrandRow.getCell(7).value = pressingDetailsTotalSheets;
  pressingDetailsGrandRow.getCell(8).value = Math.round(pressingDetailsTotalSqm * 1000) / 1000;
  pressingDetailsGrandRow.getCell(7).font = { bold: true };
  pressingDetailsGrandRow.getCell(8).font = { bold: true };
  pressingDetailsGrandRow.getCell(8).numFmt = '0.000';
  currentRow += 2;

  // ---- Section 2 header: Core - Face Consumption Sq.Mtr. ----
  worksheet.mergeCells(currentRow, 1, currentRow, 5);
  const faceTitleCell = worksheet.getCell(currentRow, 1);
  faceTitleCell.value = 'Core - Face Consumption Sq.Mtr.';
  Object.assign(faceTitleCell, sectionHeaderStyle);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // ---- Section 2: Core - Face Consumption table column headers ----
  const faceHeaders = ['Item Name', 'Thick.', 'Size', 'Sheets', 'Sq Mtr'];
  const faceHeaderRow = worksheet.getRow(currentRow);
  faceHeaders.forEach((h, i) => {
    const cell = faceHeaderRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });
  currentRow++;

  const faceRows = [];
  pressingData.forEach((doc) => {
    const consumed = doc.consumed || {};
    const faceDetails = consumed.face_details || [];
    faceDetails.forEach((fd) => {
      faceRows.push({
        itemName: fd.item_name || '',
        thick: fd.thickness ?? 0,
        size: formatSize(fd.length, fd.width),
        sheets: fd.no_of_sheets ?? 0,
        sqm: getSqm(fd.sqm, fd.length, fd.width),
      });
    });
  });

  const faceByItem = {};
  faceRows.forEach((r) => {
    const key = r.itemName || 'UNKNOWN';
    if (!faceByItem[key]) faceByItem[key] = { sheets: 0, sqm: 0, rows: [] };
    faceByItem[key].sheets += r.sheets;
    faceByItem[key].sqm += r.sqm;
    faceByItem[key].rows.push(r);
  });

  let faceTotalSheets = 0;
  let faceTotalSqm = 0;
  Object.keys(faceByItem)
    .sort()
    .forEach((itemName) => {
      const data = faceByItem[itemName];
      const bySize = {};
      data.rows.forEach((r) => {
        const key = `${r.thick}_${r.size}`;
        if (!bySize[key]) bySize[key] = { ...r, sheets: 0, sqm: 0 };
        bySize[key].sheets += r.sheets;
        bySize[key].sqm += r.sqm;
      });
      Object.values(bySize).forEach((r, idx) => {
        const row = worksheet.getRow(currentRow);
        if (idx === 0) row.getCell(1).value = itemName;
        row.getCell(2).value = r.thick;
        row.getCell(3).value = r.size;
        row.getCell(4).value = r.sheets;
        row.getCell(5).value = Math.round(r.sqm * 1000) / 1000;
        row.getCell(5).numFmt = '0.000';
        currentRow++;
      });
      faceTotalSheets += data.sheets;
      faceTotalSqm += data.sqm;
    });

  const faceTotalRow = worksheet.getRow(currentRow);
  faceTotalRow.getCell(1).value = 'Total';
  faceTotalRow.getCell(1).font = { bold: true };
  faceTotalRow.getCell(4).value = faceTotalSheets;
  faceTotalRow.getCell(5).value = Math.round(faceTotalSqm * 1000) / 1000;
  faceTotalRow.getCell(4).font = { bold: true };
  faceTotalRow.getCell(5).font = { bold: true };
  faceTotalRow.getCell(5).numFmt = '0.000';
  currentRow += 2;

  // ---- Section 3 header: Plywood Consumption Sq.Mtr. ----
  worksheet.mergeCells(currentRow, 1, currentRow, 5);
  const plywoodTitleCell = worksheet.getCell(currentRow, 1);
  plywoodTitleCell.value = 'Plywood Consumption Sq.Mtr.';
  Object.assign(plywoodTitleCell, sectionHeaderStyle);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // ---- Section 3: Plywood Consumption table column headers ----
  const plywoodHeaders = ['Item Name', 'Thick.', 'Size', 'Sheets', 'Sq Mtr'];
  const plywoodHeaderRow = worksheet.getRow(currentRow);
  plywoodHeaders.forEach((h, i) => {
    const cell = plywoodHeaderRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });
  currentRow++;

  const plywoodRows = [];
  pressingData.forEach((doc) => {
    const consumed = doc.consumed || {};
    const baseDetails = consumed.base_details || [];
    baseDetails.forEach((bd) => {
      plywoodRows.push({
        itemName: bd.item_name || '',
        thick: bd.thickness ?? 0,
        size: formatSize(bd.length, bd.width),
        sheets: bd.no_of_sheets ?? 0,
        sqm: getSqm(bd.sqm, bd.length, bd.width),
      });
    });
  });

  const plywoodByItem = {};
  plywoodRows.forEach((r) => {
    const key = r.itemName || 'UNKNOWN';
    if (!plywoodByItem[key]) plywoodByItem[key] = { sheets: 0, sqm: 0, bySize: {} };
    const sizeKey = `${r.thick}_${r.size}`;
    if (!plywoodByItem[key].bySize[sizeKey]) {
      plywoodByItem[key].bySize[sizeKey] = { size: r.size, thick: r.thick, sheets: 0, sqm: 0 };
    }
    plywoodByItem[key].bySize[sizeKey].sheets += r.sheets;
    plywoodByItem[key].bySize[sizeKey].sqm += r.sqm;
    plywoodByItem[key].sheets += r.sheets;
    plywoodByItem[key].sqm += r.sqm;
  });

  let plywoodTotalSheets = 0;
  let plywoodTotalSqm = 0;
  Object.keys(plywoodByItem)
    .sort()
    .forEach((itemName) => {
      const data = plywoodByItem[itemName];
      Object.values(data.bySize).forEach((r, idx) => {
        const row = worksheet.getRow(currentRow);
        if (idx === 0) row.getCell(1).value = itemName;
        row.getCell(2).value = r.thick;
        row.getCell(3).value = r.size;
        row.getCell(4).value = r.sheets;
        row.getCell(5).value = Math.round(r.sqm * 1000) / 1000;
        row.getCell(5).numFmt = '0.000';
        currentRow++;
      });
      plywoodTotalSheets += data.sheets;
      plywoodTotalSqm += data.sqm;
    });

  const plywoodTotalRow = worksheet.getRow(currentRow);
  plywoodTotalRow.getCell(1).value = 'Total';
  plywoodTotalRow.getCell(1).font = { bold: true };
  plywoodTotalRow.getCell(4).value = plywoodTotalSheets;
  plywoodTotalRow.getCell(5).value = Math.round(plywoodTotalSqm * 1000) / 1000;
  plywoodTotalRow.getCell(4).font = { bold: true };
  plywoodTotalRow.getCell(5).font = { bold: true };
  plywoodTotalRow.getCell(5).numFmt = '0.000';
  currentRow += 2;

  worksheet.columns = [
    { width: 18 },
    { width: 14 },
    { width: 16 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 10 },
    { width: 12 },
  ];

  const dirPath = 'public/upload/reports/reports2/Pressing';
  const fileName = `pressing_daily_report_${new Date().getTime()}.xlsx`;
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  return `${process.env.APP_URL}${filePath}`;
};

export { GeneratePressingDailyReportExcel };
