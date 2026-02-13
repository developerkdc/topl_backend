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

/** Format length/width (meters) to size string e.g. "10 X 4", "8X4" */
function formatSize(length, width) {
  if (length == null || width == null) return '';
  const l = Number(length);
  const w = Number(width);
  if (Number.isNaN(l) || Number.isNaN(w)) return '';
  const lFt = Math.round(l * 3.28084);
  const wFt = Math.round(w * 3.28084);
  return `${lFt} X ${wFt}`;
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
 * Generate Pressing Daily Report Excel with 5 sections:
 * 1) Top: item-wise rows with totals and grand total
 * 2) Ply Details: Category, Base, Thick., Side, Size, Sheets, Sq Mtr
 * 3) Core - Face Consumption Sq.Mtr.
 * 4) Plywood Consumption Sq.Mtr.
 * 5) Pressing Operation: Pressing Id, Shift, Work Hours, Worker, Machine Id
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
  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Pressing Details Report Date: ${formattedDate}`;
  Object.assign(titleCell, sectionHeaderStyle);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // ---- Section 1: Top table column headers ----
  const topHeaders = [
    'Item Code',
    'Sub-code/Type',
    'Date/Batch',
    'Dimension 1',
    'Dimension 2',
    'Quantity',
    'Area/Metric',
    'Notes',
  ];
  const topHeaderRow = worksheet.getRow(currentRow);
  topHeaders.forEach((h, i) => {
    const cell = topHeaderRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });
  currentRow++;

  const topRows = [];
  pressingData.forEach((doc) => {
    const consumed = doc.consumed || {};
    const groupDetails = consumed.group_details || [];
    const pressingId = doc.pressing_id || '';
    const flowProcess = (doc.flow_process && doc.flow_process[0]) || '';
    const remark = doc.remark || '';

    if (groupDetails.length > 0) {
      groupDetails.forEach((gd) => {
        topRows.push({
          itemName: gd.item_name || doc.product_type || '',
          subCode: gd.log_no_code || '',
          batch: pressingId,
          dim1: gd.length ?? doc.length ?? 0,
          dim2: gd.width ?? doc.width ?? 0,
          quantity: gd.no_of_sheets ?? doc.no_of_sheets ?? 0,
          area: gd.sqm ?? doc.sqm ?? 0,
          notes: flowProcess || remark || '',
        });
      });
    } else {
      topRows.push({
        itemName: doc.product_type || '',
        subCode: '',
        batch: pressingId,
        dim1: doc.length ?? 0,
        dim2: doc.width ?? 0,
        quantity: doc.no_of_sheets ?? 0,
        area: doc.sqm ?? 0,
        notes: doc.remark || (doc.flow_process && doc.flow_process[0]) || '',
      });
    }
  });

  const topByItem = {};
  let grandSheets = 0;
  let grandSqm = 0;
  topRows.forEach((r) => {
    const key = r.itemName || 'UNKNOWN';
    if (!topByItem[key]) topByItem[key] = [];
    topByItem[key].push(r);
    grandSheets += r.quantity;
    grandSqm += r.area;
  });

  Object.keys(topByItem)
    .sort()
    .forEach((itemName) => {
      const rows = topByItem[itemName];
      let itemSheets = 0;
      let itemSqm = 0;
      rows.forEach((r, idx) => {
        const row = worksheet.getRow(currentRow);
        if (idx === 0) row.getCell(1).value = itemName;
        row.getCell(2).value = r.subCode;
        row.getCell(3).value = r.batch;
        row.getCell(4).value = r.dim1;
        row.getCell(5).value = r.dim2;
        row.getCell(6).value = r.quantity;
        row.getCell(7).value = r.area;
        row.getCell(8).value = r.notes;
        row.getCell(4).numFmt = '0.00';
        row.getCell(5).numFmt = '0.00';
        row.getCell(7).numFmt = '0.00';
        itemSheets += r.quantity;
        itemSqm += r.area;
        currentRow++;
      });
      const totalRow = worksheet.getRow(currentRow);
      totalRow.getCell(2).value = 'Total';
      totalRow.getCell(2).font = { bold: true };
      totalRow.getCell(6).value = itemSheets;
      totalRow.getCell(7).value = itemSqm;
      totalRow.getCell(6).font = { bold: true };
      totalRow.getCell(7).font = { bold: true };
      totalRow.getCell(7).numFmt = '0.00';
      currentRow++;
    });

  const grandTotalRow = worksheet.getRow(currentRow);
  grandTotalRow.getCell(1).value = 'Total';
  grandTotalRow.getCell(1).font = { bold: true };
  grandTotalRow.getCell(6).value = grandSheets;
  grandTotalRow.getCell(7).value = Math.round(grandSqm * 100) / 100;
  grandTotalRow.getCell(6).font = { bold: true };
  grandTotalRow.getCell(7).font = { bold: true };
  grandTotalRow.getCell(7).numFmt = '0.00';
  currentRow += 2;

  // ---- Section 2 header: Ply Details ----
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  const plyDetailsTitleCell = worksheet.getCell(currentRow, 1);
  plyDetailsTitleCell.value = 'Ply Details';
  Object.assign(plyDetailsTitleCell, sectionHeaderStyle);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // ---- Section 2: Ply Details table column headers ----
  const plyHeaders = [
    'Category',
    'Base',
    'Thick.',
    'Side',
    'Size',
    'Sheets',
    'Sq Mtr',
  ];
  const plyHeaderRow = worksheet.getRow(currentRow);
  plyHeaders.forEach((h, i) => {
    const cell = plyHeaderRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });
  currentRow++;

  const plyRows = [];
  pressingData.forEach((doc) => {
    const consumed = doc.consumed || {};
    const baseDetails = consumed.base_details || [];
    baseDetails.forEach((bd) => {
      const baseType = (bd.base_type || '').toUpperCase();
      plyRows.push({
        category: BASE_TYPE_TO_CATEGORY[baseType] || baseType,
        base: BASE_TYPE_TO_BASE_LABEL[baseType] || baseType,
        thick: bd.thickness ?? 0,
        side: SIDE_PLACEHOLDER,
        size: formatSize(bd.length, bd.width),
        sheets: bd.no_of_sheets ?? 0,
        sqm: bd.sqm ?? 0,
      });
    });
  });

  const plyByCategory = {};
  plyRows.forEach((r) => {
    const key = r.category;
    if (!plyByCategory[key]) plyByCategory[key] = [];
    plyByCategory[key].push(r);
  });

  let plyTotalSheets = 0;
  let plyTotalSqm = 0;
  const categoryOrder = [
    'Decorative Mdf',
    'Decorative Plywood',
    'Fleece Back Veneer',
  ];
  categoryOrder.forEach((cat) => {
    const rows = plyByCategory[cat] || [];
    if (rows.length === 0) return;
    let catSheets = 0;
    let catSqm = 0;
    const byThickSideSize = {};
    rows.forEach((r) => {
      const key = `${r.thick}_${r.side}_${r.size}`;
      if (!byThickSideSize[key]) byThickSideSize[key] = { ...r, sheets: 0, sqm: 0 };
      byThickSideSize[key].sheets += r.sheets;
      byThickSideSize[key].sqm += r.sqm;
    });
    Object.values(byThickSideSize).forEach((r, idx) => {
      const row = worksheet.getRow(currentRow);
      if (idx === 0) row.getCell(1).value = cat;
      row.getCell(2).value = r.base;
      row.getCell(3).value = r.thick;
      row.getCell(4).value = r.side;
      row.getCell(5).value = r.size;
      row.getCell(6).value = r.sheets;
      row.getCell(7).value = Math.round(r.sqm * 100) / 100;
      row.getCell(7).numFmt = '0.00';
      catSheets += r.sheets;
      catSqm += r.sqm;
      currentRow++;
    });
    const catTotalRow = worksheet.getRow(currentRow);
    catTotalRow.getCell(1).value = 'Total';
    catTotalRow.getCell(1).font = { bold: true };
    catTotalRow.getCell(6).value = catSheets;
    catTotalRow.getCell(7).value = Math.round(catSqm * 100) / 100;
    catTotalRow.getCell(6).font = { bold: true };
    catTotalRow.getCell(7).font = { bold: true };
    catTotalRow.getCell(7).numFmt = '0.00';
    currentRow++;
    plyTotalSheets += catSheets;
    plyTotalSqm += catSqm;
  });

  const plyGrandRow = worksheet.getRow(currentRow);
  plyGrandRow.getCell(1).value = 'Total';
  plyGrandRow.getCell(1).font = { bold: true };
  plyGrandRow.getCell(6).value = plyTotalSheets;
  plyGrandRow.getCell(7).value = Math.round(plyTotalSqm * 100) / 100;
  plyGrandRow.getCell(6).font = { bold: true };
  plyGrandRow.getCell(7).font = { bold: true };
  plyGrandRow.getCell(7).numFmt = '0.00';
  currentRow += 2;

  // ---- Section 3 header: Core - Face Consumption Sq.Mtr. ----
  worksheet.mergeCells(currentRow, 1, currentRow, 5);
  const faceTitleCell = worksheet.getCell(currentRow, 1);
  faceTitleCell.value = 'Core - Face Consumption Sq.Mtr.';
  Object.assign(faceTitleCell, sectionHeaderStyle);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // ---- Section 3: Core - Face Consumption table column headers ----
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
        sqm: fd.sqm ?? 0,
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
        row.getCell(5).value = Math.round(r.sqm * 100) / 100;
        row.getCell(5).numFmt = '0.00';
        currentRow++;
      });
      faceTotalSheets += data.sheets;
      faceTotalSqm += data.sqm;
    });

  const faceTotalRow = worksheet.getRow(currentRow);
  faceTotalRow.getCell(1).value = 'Total';
  faceTotalRow.getCell(1).font = { bold: true };
  faceTotalRow.getCell(4).value = faceTotalSheets;
  faceTotalRow.getCell(5).value = Math.round(faceTotalSqm * 100) / 100;
  faceTotalRow.getCell(4).font = { bold: true };
  faceTotalRow.getCell(5).font = { bold: true };
  faceTotalRow.getCell(5).numFmt = '0.00';
  currentRow += 2;

  // ---- Section 4 header: Plywood Consumption Sq.Mtr. ----
  worksheet.mergeCells(currentRow, 1, currentRow, 5);
  const plywoodTitleCell = worksheet.getCell(currentRow, 1);
  plywoodTitleCell.value = 'Plywood Consumption Sq.Mtr.';
  Object.assign(plywoodTitleCell, sectionHeaderStyle);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // ---- Section 4: Plywood Consumption table column headers ----
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
        sqm: bd.sqm ?? 0,
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
        row.getCell(5).value = Math.round(r.sqm * 100) / 100;
        row.getCell(5).numFmt = '0.00';
        currentRow++;
      });
      plywoodTotalSheets += data.sheets;
      plywoodTotalSqm += data.sqm;
    });

  const plywoodTotalRow = worksheet.getRow(currentRow);
  plywoodTotalRow.getCell(1).value = 'Total';
  plywoodTotalRow.getCell(1).font = { bold: true };
  plywoodTotalRow.getCell(4).value = plywoodTotalSheets;
  plywoodTotalRow.getCell(5).value = Math.round(plywoodTotalSqm * 100) / 100;
  plywoodTotalRow.getCell(4).font = { bold: true };
  plywoodTotalRow.getCell(5).font = { bold: true };
  plywoodTotalRow.getCell(5).numFmt = '0.00';
  currentRow += 2;

  // ---- Section 5: Pressing Operation ----
  const opHeaders = [
    'Pressing Id',
    'Shift',
    'Work Hours',
    'Worker',
    'Machine Id',
  ];
  const opHeaderRow = worksheet.getRow(currentRow);
  opHeaders.forEach((h, i) => {
    const cell = opHeaderRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle);
  });
  currentRow++;

  pressingData.forEach((doc) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = doc.pressing_id ?? '';
    row.getCell(2).value = doc.shift ?? '';
    row.getCell(3).value = doc.no_of_working_hours ?? '';
    row.getCell(4).value = doc.workerName ?? '';
    row.getCell(5).value = doc.machine_name ?? doc.machine_id ?? '';
    currentRow++;
  });

  worksheet.columns = [
    { width: 18 },
    { width: 16 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 20 },
  ];

  const dirPath = 'public/upload/reports/reports2/Pressing';
  const fileName = `pressing_daily_report_${new Date().getTime()}.xlsx`;
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  return `${process.env.APP_URL}${filePath}`;
};

export { GeneratePressingDailyReportExcel };
