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
 * Group rows by item_name for main table and summary; collect session info.
 */
const groupRows = (rows) => {
  const byItem = {};
  const sessions = [];

  rows.forEach((r) => {
    const itemName = r.item_name || 'UNKNOWN';
    if (!byItem[itemName]) {
      byItem[itemName] = {
        rows: [],
        flitch_cmt: 0,
        rej_cmt: 0,
        leaves: 0,
      };
    }
    const cmt = Number(r.cmt) || 0;
    const rejCmt = Number(r.rej_cmt) || 0;
    const leaves = Number(r.leaves) || 0;
    byItem[itemName].rows.push({
      item_name: itemName,
      flitch_no: r.flitch_no,
      thickness: r.thickness,
      length: r.length,
      width: r.width1 ?? 0,
      height: r.height,
      cmt,
      leaves,
      sq_mtr: 0,
      rej_height: r.rej_height,
      rej_width: r.rej_width,
      rej_cmt: rejCmt,
      remarks: r.remarks || 'COMPLETE',
    });
    byItem[itemName].flitch_cmt += cmt;
    byItem[itemName].rej_cmt += rejCmt;
    byItem[itemName].leaves += leaves;

    if (r.slicing_id && !sessions.find((s) => s.slicing_id?.toString() === r.slicing_id?.toString())) {
      sessions.push({
        slicing_id: r.slicing_id,
        shift: r.shift || '',
        work_hours: r.no_of_working_hours ?? '',
        worker: (r.worker || '').trim(),
      });
    }
  });

  return { byItem, sessions };
};

const setCellStyle = (cell, bold = false) => {
  if (bold) cell.font = { bold: true };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
};

/**
 * Generate Slicing Daily Report matching the provided layout:
 * - Main Slicing Details (Item Name, Flitch No, Thickness, Length, Width, Height, CMT, Leaves, Sq Mtr) + Total
 * - Rejection Details (Rej. Hight, Rej. Width, Rej. CMT, Remarks) + Total Rej. CMT
 * - Summary (Item name, Flitch CMT, Rej. CMT, Slice CMT, Leaves) + Total
 * - Slicing Session Details (Slicing Id, Shift, Work Hours, Worker)
 */
const GenerateSlicingDailyReport = async (rows, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Slicing Details Report');

  const formattedDate = formatDate(reportDate);
  const { byItem, sessions } = groupRows(rows);

  const itemNames = Object.keys(byItem).sort();
  let currentRow = 1;

  // Title
  worksheet.mergeCells(currentRow, 1, currentRow, 13);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Slicing Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow += 2;

  // Main table: Item Name, Flitch No, Thickness, Length, Width, Height, CMT, Leaves, Sq Mtr
  // Rejection table to the right: Rej. Hight, Rej. Width, Rej. CMT, Remarks
  const mainHeaders = [
    'Item Name',
    'Flitch No',
    'Thickness',
    'Length',
    'Width',
    'Height',
    'CMT',
    'Leaves',
    'Sq Mtr',
  ];
  const rejHeaders = ['Rej. Hight', 'Rej. Width', 'Rej. CMT', 'Remarks'];
  const mainColCount = mainHeaders.length;
  const rejStartCol = mainColCount + 1;

  const headerRow = worksheet.getRow(currentRow);
  mainHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    setCellStyle(cell);
  });
  rejHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(rejStartCol + i);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    setCellStyle(cell);
  });
  currentRow++;

  let grandFlitchCmt = 0;
  let grandRejCmt = 0;
  let grandLeaves = 0;

  itemNames.forEach((itemName) => {
    const itemData = byItem[itemName];
    const itemRows = itemData.rows;
    let itemStartRow = currentRow;
    let totalCmt = 0;
    let totalLeaves = 0;
    let totalSqMtr = 0;
    let totalRejCmt = 0;

    itemRows.forEach((r, idx) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = idx === 0 ? itemName : '';
      row.getCell(2).value = r.flitch_no;
      row.getCell(3).value = r.thickness;
      row.getCell(4).value = r.length;
      row.getCell(5).value = r.width;
      row.getCell(6).value = r.height;
      row.getCell(7).value = r.cmt;
      row.getCell(8).value = r.leaves;
      row.getCell(9).value = r.sq_mtr;
      row.getCell(rejStartCol).value = r.rej_height;
      row.getCell(rejStartCol + 1).value = r.rej_width;
      row.getCell(rejStartCol + 2).value = r.rej_cmt;
      row.getCell(rejStartCol + 3).value = r.remarks;

      [3, 4, 5, 6, 7, 9, rejStartCol, rejStartCol + 1, rejStartCol + 2].forEach((col) => {
        const c = row.getCell(col);
        if (typeof c.value === 'number') c.numFmt = '0.00';
      });
      if (typeof row.getCell(7).value === 'number') row.getCell(7).numFmt = '0.000';
      if (typeof row.getCell(rejStartCol + 2).value === 'number') row.getCell(rejStartCol + 2).numFmt = '0.000';

      totalCmt += r.cmt;
      totalLeaves += r.leaves;
      totalSqMtr += r.sq_mtr;
      totalRejCmt += r.rej_cmt;
      currentRow++;
    });

    // Total row for this item
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(2).value = 'Total';
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(7).value = totalCmt;
    totalRow.getCell(7).font = { bold: true };
    totalRow.getCell(7).numFmt = '0.000';
    totalRow.getCell(8).value = totalLeaves;
    totalRow.getCell(8).font = { bold: true };
    totalRow.getCell(9).value = totalSqMtr;
    totalRow.getCell(9).font = { bold: true };
    totalRow.getCell(rejStartCol + 2).value = totalRejCmt;
    totalRow.getCell(rejStartCol + 2).font = { bold: true };
    totalRow.getCell(rejStartCol + 2).numFmt = '0.000';
    currentRow++;

    grandFlitchCmt += itemData.flitch_cmt;
    grandRejCmt += itemData.rej_cmt;
    grandLeaves += itemData.leaves;
  });

  // Summary section (Item-wise)
  currentRow += 2;
  const summaryHeaders = ['Item name', 'Flitch CMT', 'Rej. CMT', 'Slice CMT', 'Leaves'];
  const summaryRow = worksheet.getRow(currentRow);
  summaryHeaders.forEach((h, i) => {
    const cell = summaryRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setCellStyle(cell);
  });
  currentRow++;

  itemNames.forEach((itemName) => {
    const itemData = byItem[itemName];
    const sliceCmt = itemData.flitch_cmt - itemData.rej_cmt;
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = itemName;
    row.getCell(2).value = itemData.flitch_cmt;
    row.getCell(3).value = itemData.rej_cmt;
    row.getCell(4).value = sliceCmt;
    row.getCell(5).value = itemData.leaves;
    [2, 3, 4].forEach((col) => {
      const c = row.getCell(col);
      if (typeof c.value === 'number') c.numFmt = '0.000';
    });
    currentRow++;
  });

  const summaryTotalRow = worksheet.getRow(currentRow);
  summaryTotalRow.getCell(1).value = 'Total';
  summaryTotalRow.getCell(1).font = { bold: true };
  summaryTotalRow.getCell(2).value = grandFlitchCmt;
  summaryTotalRow.getCell(3).value = grandRejCmt;
  summaryTotalRow.getCell(4).value = grandFlitchCmt - grandRejCmt;
  summaryTotalRow.getCell(5).value = grandLeaves;
  summaryTotalRow.font = { bold: true };
  [2, 3, 4].forEach((col) => {
    const c = summaryTotalRow.getCell(col);
    if (typeof c.value === 'number') c.numFmt = '0.000';
  });
  currentRow += 2;

  // Slicing Session Details
  const sessionHeaders = ['Slicing Id', 'Shift', 'Work Hours', 'Worker'];
  const sessionHeaderRow = worksheet.getRow(currentRow);
  sessionHeaders.forEach((h, i) => {
    const cell = sessionHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setCellStyle(cell);
  });
  currentRow++;

  sessions.forEach((s) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = s.slicing_id?.toString?.() ?? s.slicing_id;
    row.getCell(2).value = s.shift;
    row.getCell(3).value = s.work_hours;
    row.getCell(4).value = s.worker;
    currentRow++;
  });

  worksheet.columns = [
    { width: 14 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
  ];

  const timestamp = new Date().getTime();
  const fileName = `slicing_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Slicing';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;
  return downloadLink;
};

export { GenerateSlicingDailyReport };
