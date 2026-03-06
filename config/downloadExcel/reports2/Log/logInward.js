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
 * Apply grey background to a row from startCol to totalCols (inclusive)
 */
const applyGreyBackground = (row, totalCols = 13, startCol = 1) => {
  for (let col = startCol; col <= totalCols; col++) {
    const cell = row.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
  }
};

/**
 * Generate Log Daily Inward Report
 */
const GenerateLogDailyInwardReport = async (details, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Log Inward Report');

  const formattedDate = formatDate(reportDate);
  console.log('Generating log inward report for date:', formattedDate);

  let currentRow = 1;

  // Row 1: Title
  worksheet.mergeCells(currentRow, 1, currentRow, 13);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `Log Inward Daily Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Row 2-3: Empty spacing
  currentRow += 1;

  // Row 4: Main data headers
  const headers = [
    'Inward Id',
    'Supplier Name',
    'Item Name',
    'Log No',
    'Invoice Length',
    'Invoice Dia.',
    'Invoice CMT',
    'Indian CMT',
    'Physical Length',
    'Physical Girth',
    'Physical CMT',
    'Remarks',
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
    { width: 12 }, // Log No
    { width: 15 }, // Invoice Length
    { width: 12 }, // Invoice Dia
    { width: 12 }, // Invoice CMT
    { width: 12 }, // Indian CMT
    { width: 15 }, // Physical Length
    { width: 15 }, // Physical Girth
    { width: 12 }, // Physical CMT
    { width: 20 }, // Remarks
  ];

  let grandTotalInvoiceCMT = 0;
  let grandTotalIndianCMT = 0;
  let grandTotalPhysicalCMT = 0;

  const workerDetailsMap = new Map();

  // Group by inward id, then item
  const inwardGroups = {};
  details.forEach((log) => {
    const inward = log.log_invoice_details?.inward_sr_no || 'UNKNOWN';

    let supplierName = '';
    const supDetails = log.log_invoice_details?.supplier_details;
    if (Array.isArray(supDetails)) {
      supplierName = supDetails[0]?.company_details?.supplier_name || '';
    } else {
      supplierName = supDetails?.company_details?.supplier_name || '';
    }

    if (!inwardGroups[inward]) {
      inwardGroups[inward] = { supplier: supplierName, items: {} };
    }
    const item = log.item_name || 'UNKNOWN';
    if (!inwardGroups[inward].items[item]) {
      inwardGroups[inward].items[item] = { supplier_item: log.supplier_item_name, logs: [] };
    }
    inwardGroups[inward].items[item].logs.push(log);
  });

  // Add rows grouped by inward and item
  Object.keys(inwardGroups)
    .sort()
    .forEach((inward) => {
      const inwardData = inwardGroups[inward];
      let inwardInvoiceCMT = 0;
      let inwardIndianCMT = 0;
      let inwardPhysicalCMT = 0;
      let inwardPrinted = false;

      Object.keys(inwardData.items)
        .sort()
        .forEach((itemName) => {
          const itemData = inwardData.items[itemName];
          let itemInvoiceCMT = 0;
          let itemIndianCMT = 0;
          let itemPhysicalCMT = 0;

          itemData.logs.forEach((log, logIndex) => {
            const row = worksheet.getRow(currentRow);

            if (!inwardPrinted) {
              row.getCell(1).value = inward;
              row.getCell(2).value = inwardData.supplier;
              inwardPrinted = true;
            }
            if (logIndex === 0) {
              row.getCell(3).value = itemName;
            }

            row.getCell(4).value = log.log_no || '';
            row.getCell(5).value = log.invoice_length || 0;
            row.getCell(6).value = log.invoice_diameter || 0;
            row.getCell(7).value = log.invoice_cmt || 0;
            row.getCell(8).value = log.indian_cmt || 0;
            row.getCell(9).value = log.physical_length || '';
            row.getCell(10).value = log.physical_diameter || 0;
            row.getCell(11).value = log.physical_cmt || 0;
            row.getCell(12).value = log.remark || '';

            [6, 7, 11].forEach((colNum) => {
              const cell = row.getCell(colNum);
              if (cell.value && typeof cell.value === 'number') cell.numFmt = '0.00';
            });
            [8, 9, 12].forEach((colNum) => {
              const cell = row.getCell(colNum);
              if (cell.value && typeof cell.value === 'number') cell.numFmt = '0.000';
            });

            itemInvoiceCMT += log.invoice_cmt || 0;
            itemIndianCMT += log.indian_cmt || 0;
            itemPhysicalCMT += log.physical_cmt || 0;

            grandTotalInvoiceCMT += log.invoice_cmt || 0;
            grandTotalIndianCMT += log.indian_cmt || 0;
            grandTotalPhysicalCMT += log.physical_cmt || 0;

            if (log.log_invoice_details?.workers_details) {
              const workerKey = `${log.log_invoice_details.inward_sr_no}_${log.log_invoice_details.workers_details.shift}`;
              if (!workerDetailsMap.has(workerKey)) {
                workerDetailsMap.set(workerKey, {
                  inward_id: log.log_invoice_details.inward_sr_no,
                  shift: log.log_invoice_details.workers_details.shift || '',
                  working_hours: log.log_invoice_details.workers_details.working_hours || '',
                  no_of_workers: log.log_invoice_details.workers_details.no_of_workers || '',
                });
              }
            }

            currentRow++;
          });

          // Item total row — grey background starting from col 3 (Item Name)
          const itemTotalRow = worksheet.getRow(currentRow);
          applyGreyBackground(itemTotalRow, 12, 3);
          itemTotalRow.getCell(3).value = `Total ${itemName}`;
          itemTotalRow.getCell(3).font = { bold: true };
          itemTotalRow.getCell(7).value = itemInvoiceCMT;
          itemTotalRow.getCell(7).font = { bold: true };
          itemTotalRow.getCell(7).numFmt = '0.000';
          itemTotalRow.getCell(8).value = itemIndianCMT;
          itemTotalRow.getCell(8).font = { bold: true };
          itemTotalRow.getCell(8).numFmt = '0.000';
          itemTotalRow.getCell(11).value = itemPhysicalCMT;
          itemTotalRow.getCell(11).font = { bold: true };
          itemTotalRow.getCell(11).numFmt = '0.000';
          currentRow++;

          inwardInvoiceCMT += itemInvoiceCMT;
          inwardIndianCMT += itemIndianCMT;
          inwardPhysicalCMT += itemPhysicalCMT;
        });

      // Inward total row — grey background across full row
      const inwardTotalRow = worksheet.getRow(currentRow);
      applyGreyBackground(inwardTotalRow, 12);
      inwardTotalRow.getCell(1).value = `TOTAL ${inward}`;
      inwardTotalRow.getCell(1).font = { bold: true };
      inwardTotalRow.getCell(7).value = inwardInvoiceCMT;
      inwardTotalRow.getCell(7).font = { bold: true };
      inwardTotalRow.getCell(7).numFmt = '0.000';
      inwardTotalRow.getCell(8).value = inwardIndianCMT;
      inwardTotalRow.getCell(8).font = { bold: true };
      inwardTotalRow.getCell(8).numFmt = '0.000';
      inwardTotalRow.getCell(11).value = inwardPhysicalCMT;
      inwardTotalRow.getCell(11).font = { bold: true };
      inwardTotalRow.getCell(11).numFmt = '0.000';
      currentRow++;
      currentRow++; // blank line between inwards
    });

  // Grand total row — grey background across full row
  const grandTotalRow = worksheet.getRow(currentRow);
  applyGreyBackground(grandTotalRow, 12);
  grandTotalRow.getCell(1).value = 'Total';
  grandTotalRow.getCell(1).font = { bold: true };
  grandTotalRow.getCell(7).value = grandTotalInvoiceCMT;
  grandTotalRow.getCell(7).font = { bold: true };
  grandTotalRow.getCell(7).numFmt = '0.000';
  grandTotalRow.getCell(8).value = grandTotalIndianCMT;
  grandTotalRow.getCell(8).font = { bold: true };
  grandTotalRow.getCell(8).numFmt = '0.000';
  grandTotalRow.getCell(11).value = grandTotalPhysicalCMT;
  grandTotalRow.getCell(11).font = { bold: true };
  grandTotalRow.getCell(11).numFmt = '0.000';
  currentRow++;

  // === Summary section ===
  currentRow += 2;
  const summaryTitleRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(currentRow, 1, currentRow, 5);
  summaryTitleRow.getCell(1).value = 'Summary 1';
  summaryTitleRow.getCell(1).font = { bold: true, size: 12 };
  currentRow++;

  const summaryHeaders = ['Item Name', 'Supplier', 'Invoice CMT', 'Indian CMT', 'Physical CMT'];
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

  // Build summary data structure
  const summaryMap = {};
  details.forEach((log) => {
    const item = log.item_name || 'UNKNOWN';
    let supplierName = '';
    const supDetails = log.log_invoice_details?.supplier_details;
    if (Array.isArray(supDetails)) {
      supplierName = supDetails[0]?.company_details?.supplier_name || '';
    } else {
      supplierName = supDetails?.company_details?.supplier_name || '';
    }
    if (!summaryMap[item]) summaryMap[item] = {};
    if (!summaryMap[item][supplierName]) {
      summaryMap[item][supplierName] = { invoice: 0, indian: 0, physical: 0 };
    }
    summaryMap[item][supplierName].invoice += log.invoice_cmt || 0;
    summaryMap[item][supplierName].indian += log.indian_cmt || 0;
    summaryMap[item][supplierName].physical += log.physical_cmt || 0;
  });

  let grandInvoice = 0;
  let grandIndian = 0;
  let grandPhysical = 0;

  Object.keys(summaryMap)
    .sort()
    .forEach((itemName) => {
      const suppliers = summaryMap[itemName];
      let itemPrinted = false;
      let itemInvoiceTotal = 0;
      let itemIndianTotal = 0;
      let itemPhysicalTotal = 0;

      Object.keys(suppliers)
        .sort()
        .forEach((supp) => {
          const row = worksheet.getRow(currentRow);
          if (!itemPrinted) {
            row.getCell(1).value = itemName;
            itemPrinted = true;
          }
          row.getCell(2).value = supp;
          row.getCell(3).value = suppliers[supp].invoice;
          row.getCell(4).value = suppliers[supp].indian;
          row.getCell(5).value = suppliers[supp].physical;
          [3, 4, 5].forEach((col) => {
            const cell = row.getCell(col);
            if (cell.value && typeof cell.value === 'number') cell.numFmt = '0.000';
          });
          itemInvoiceTotal += suppliers[supp].invoice;
          itemIndianTotal += suppliers[supp].indian;
          itemPhysicalTotal += suppliers[supp].physical;
          grandInvoice += suppliers[supp].invoice;
          grandIndian += suppliers[supp].indian;
          grandPhysical += suppliers[supp].physical;
          currentRow++;
        });

      // Summary item total row — grey background
      const itemTotalRow = worksheet.getRow(currentRow);
      applyGreyBackground(itemTotalRow, 5);
      itemTotalRow.getCell(2).value = 'Total';
      itemTotalRow.getCell(2).font = { bold: true };
      itemTotalRow.getCell(3).value = itemInvoiceTotal;
      itemTotalRow.getCell(3).font = { bold: true };
      itemTotalRow.getCell(3).numFmt = '0.000';
      itemTotalRow.getCell(4).value = itemIndianTotal;
      itemTotalRow.getCell(4).font = { bold: true };
      itemTotalRow.getCell(4).numFmt = '0.000';
      itemTotalRow.getCell(5).value = itemPhysicalTotal;
      itemTotalRow.getCell(5).font = { bold: true };
      itemTotalRow.getCell(5).numFmt = '0.000';
      currentRow++;
      currentRow++; // blank after each item
    });

  // Summary grand total row — grey background
  const grandRow = worksheet.getRow(currentRow);
  applyGreyBackground(grandRow, 5);
  grandRow.getCell(2).value = 'Grand Total';
  grandRow.getCell(2).font = { bold: true };
  grandRow.getCell(3).value = grandInvoice;
  grandRow.getCell(3).font = { bold: true };
  grandRow.getCell(3).numFmt = '0.000';
  grandRow.getCell(4).value = grandIndian;
  grandRow.getCell(4).font = { bold: true };
  grandRow.getCell(4).numFmt = '0.000';
  grandRow.getCell(5).value = grandPhysical;
  grandRow.getCell(5).font = { bold: true };
  grandRow.getCell(5).numFmt = '0.000';
  currentRow++;

  // Generate file path
  const timestamp = new Date().getTime();
  const fileName = `log_inward_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/LogInward';
  const filePath = `${dirPath}/${fileName}`;

  await fs.mkdir(dirPath, { recursive: true });
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;
  console.log('Log inward report generated:', downloadLink);

  return downloadLink;
};

export { GenerateLogDailyInwardReport };