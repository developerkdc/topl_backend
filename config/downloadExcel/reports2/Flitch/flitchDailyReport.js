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
 * Apply grey background fill to a row from startCol to totalCols (inclusive)
 */
const applyGreyBackground = (row, totalCols, startCol = 1) => {
  for (let col = startCol; col <= totalCols; col++) {
    row.getCell(col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
  }
};

/**
 * Group data by inward id, then item name (no CC grouping)
 */
const groupData = (data) => {
  const inwardGroups = {};

  data.forEach((record) => {
    const inward =
      record.flitch_invoice_details?.inward_sr_no || 'UNKNOWN';

    // Supplier extraction (handles array or object)
    let supplierName = '';
    const supDetails = record.flitch_invoice_details?.supplier_details || '';
    if (Array.isArray(supDetails)) {
      supplierName = supDetails[0]?.company_details?.supplier_name || '';
    } else {
      supplierName = supDetails?.company_details?.supplier_name || supDetails || '';
    }

    if (!inwardGroups[inward]) {
      inwardGroups[inward] = { supplier: supplierName, items: {} };
    }

    const itemName = record.item_name || 'UNKNOWN';

    if (!inwardGroups[inward].items[itemName]) {
      inwardGroups[inward].items[itemName] = { flitches: [] };
    }

    // Add flitch piece directly (no CC grouping)
    inwardGroups[inward].items[itemName].flitches.push({
      flitch_no: record.flitch_code || record.flitch_id || '',
      length: record.length,
      width1: record.width1,
      width2: record.width2,
      width3: record.width3,
      height: record.height,
      flitch_cmt: record.flitch_cmt,
    });
  });

  return inwardGroups;
};

/**
 * Generate Flitch Daily Report
 */
const GenerateFlitchDailyReport = async (details, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Flitch Report');

  const formattedDate = formatDate(reportDate);
  console.log('Generating flitch report for date:', formattedDate);

  let currentRow = 1;

  // Row 1: Title
  worksheet.mergeCells(currentRow, 1, currentRow, 10);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Flitch Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Row 2: Empty spacing
  currentRow += 1;

  // Row 3: Main data headers
  const headers = [
    'Inward Id',
    'Supplier Name',
    'Item Name',
    'Flitch No',
    'Flitch Length',
    'Width1',
    'Width2',
    'Width3',
    'Height',
    'Flitch CMT',
  ];

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
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  currentRow++;

  // Set column widths
  worksheet.columns = [
    { width: 12 }, // Inward Id
    { width: 20 }, // Supplier Name
    { width: 15 }, // Item Name
    { width: 12 }, // Flitch No
    { width: 12 }, // Flitch Length
    { width: 10 }, // Width1
    { width: 10 }, // Width2
    { width: 10 }, // Width3
    { width: 10 }, // Height
    { width: 12 }, // Flitch CMT
  ];

  // Group data
  const groupedData = groupData(details);

  // Track totals for summary
  let grandTotalFlitch = 0;

  // Add data rows grouped by inward -> item (no CC grouping)
  Object.keys(groupedData)
    .sort()
    .forEach((inward) => {
      const inwardData = groupedData[inward];
      let inwardPrinted = false;
      let inwardTotal = 0;
      const items = inwardData.items || {};

      Object.keys(items)
        .sort()
        .forEach((itemName) => {
          const itemData = items[itemName];
          const itemStartRow = currentRow;
          let itemFlitchTotal = 0;

          itemData.flitches.forEach((flitch) => {
            const row = worksheet.getRow(currentRow);

            if (!inwardPrinted) {
              row.getCell(1).value = inward;
              row.getCell(2).value = inwardData.supplier;
              inwardPrinted = true;
            }

            if (currentRow === itemStartRow) {
              row.getCell(3).value = itemName;
            }

            // Flitch info
            row.getCell(4).value = flitch.flitch_no;
            row.getCell(5).value = flitch.length;
            row.getCell(6).value = flitch.width1;
            row.getCell(7).value = flitch.width2;
            row.getCell(8).value = flitch.width3;
            row.getCell(9).value = flitch.height;
            row.getCell(10).value = flitch.flitch_cmt;

            [5, 6, 7, 8, 9].forEach((colNum) => {
              const cell = row.getCell(colNum);
              if (cell.value && typeof cell.value === 'number') cell.numFmt = '0.00';
            });
            const cmtCell = row.getCell(10);
            if (cmtCell.value && typeof cmtCell.value === 'number') cmtCell.numFmt = '0.000';

            itemFlitchTotal += flitch.flitch_cmt || 0;
            currentRow++;
          });

          // Item total row
          const itemTotalRow = worksheet.getRow(currentRow);
          applyGreyBackground(itemTotalRow, 10, 3);
          itemTotalRow.getCell(3).value = 'Total';
          itemTotalRow.getCell(3).font = { bold: true };
          itemTotalRow.getCell(10).value = itemFlitchTotal;
          itemTotalRow.getCell(10).font = { bold: true };
          itemTotalRow.getCell(10).numFmt = '0.000';
          currentRow++;

          inwardTotal += itemFlitchTotal;
          grandTotalFlitch += itemFlitchTotal || 0;
        });

      // Inward total row
      const inwardTotalRow = worksheet.getRow(currentRow);
      applyGreyBackground(inwardTotalRow, 10);
      inwardTotalRow.getCell(1).value = `TOTAL ${inward}`;
      inwardTotalRow.getCell(1).font = { bold: true };
      inwardTotalRow.getCell(10).value = inwardTotal;
      inwardTotalRow.getCell(10).font = { bold: true };
      inwardTotalRow.getCell(10).numFmt = '0.000';
      currentRow++;
      currentRow++;
    });

  // (removed grand total row; now totals are per-inward only)


  // Add summary section (Item -> Supplier -> Flitch CMT)
  currentRow += 2;
  const summaryTitleRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 3);
  summaryTitleRow.getCell(1).value = 'Summary 1';
  summaryTitleRow.getCell(1).font = { bold: true, size: 12 };
  currentRow++;

  const summaryHeaders = ['Item Name', 'Supplier', 'Flitch CMT'];
  const summaryHeaderRow = worksheet.getRow(currentRow);
  summaryHeaders.forEach((header, idx) => {
    const cell = summaryHeaderRow.getCell(idx + 1);
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

  // Build summary map
  const summaryMap = {};
  details.forEach((rec) => {
    const item = rec.item_name || 'UNKNOWN';
    let supplierName = '';
    const supDetails = rec.flitch_invoice_details?.supplier_details || '';
    if (Array.isArray(supDetails)) supplierName = supDetails[0]?.company_details?.supplier_name || '';
    else supplierName = supDetails?.company_details?.supplier_name || supDetails || '';

    if (!summaryMap[item]) summaryMap[item] = {};
    if (!summaryMap[item][supplierName]) summaryMap[item][supplierName] = { flitch: 0 };

    const flitchCmt = rec.flitch_cmt || 0;
    summaryMap[item][supplierName].flitch += flitchCmt;
  });

  let grandFlitch = 0;

  Object.keys(summaryMap)
    .sort()
    .forEach((itemName) => {
      let itemPrinted = false;
      let itemFlitchTotal = 0;

      Object.keys(summaryMap[itemName])
        .sort()
        .forEach((supp) => {
          const row = worksheet.getRow(currentRow);
          if (!itemPrinted) {
            row.getCell(1).value = itemName;
            itemPrinted = true;
          }
          row.getCell(2).value = supp;
          row.getCell(3).value = summaryMap[itemName][supp].flitch;
          const cell = row.getCell(3);
          if (cell.value && typeof cell.value === 'number') cell.numFmt = '0.000';

          itemFlitchTotal += summaryMap[itemName][supp].flitch;
          grandFlitch += summaryMap[itemName][supp].flitch;
          currentRow++;
        });

      // Item total
      const itemTotalRow = worksheet.getRow(currentRow);
      applyGreyBackground(itemTotalRow, 3);
      itemTotalRow.getCell(2).value = 'Total';
      itemTotalRow.getCell(2).font = { bold: true };
      itemTotalRow.getCell(3).value = itemFlitchTotal;
      itemTotalRow.getCell(3).font = { bold: true };
      itemTotalRow.getCell(3).numFmt = '0.000';
      currentRow++;
      currentRow++;
    });

  // Summary grand total
  const grandRow = worksheet.getRow(currentRow);
  applyGreyBackground(grandRow, 3);
  grandRow.getCell(2).value = 'Grand Total';
  grandRow.getCell(2).font = { bold: true };
  grandRow.getCell(3).value = grandFlitch;
  grandRow.getCell(3).font = { bold: true };
  grandRow.getCell(3).numFmt = '0.000';
  currentRow++;

  // Generate file path
  const timestamp = new Date().getTime();
  const fileName = `flitch_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/Flitch';
  const filePath = `${dirPath}/${fileName}`;

  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true });

  // Save the workbook
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;

  console.log('Flitch report generated:', downloadLink);

  return downloadLink;
};

export { GenerateFlitchDailyReport };
