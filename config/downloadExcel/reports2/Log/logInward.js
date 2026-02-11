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
 * Group data by item name
 */
const groupDataByItem = (data) => {
  const grouped = {};

  data.forEach((log) => {
    const itemName = log.item_name || 'UNKNOWN';

    if (!grouped[itemName]) {
      grouped[itemName] = {
        supplier_item: log.supplier_item_name,
        logs: [],
        workers: log.log_invoice_details?.workers_details || null,
        inward_id: log.log_invoice_details?.inward_sr_no || null,
      };
    }

    grouped[itemName].logs.push(log);
  });

  return grouped;
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
  worksheet.mergeCells(currentRow, 1, currentRow, 11);
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
    'Item Name',
    'Supplier Item',
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
    { width: 15 }, // Item Name
    { width: 15 }, // Supplier Item
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

  // Group data
  const groupedData = groupDataByItem(details);

  // Track totals for grand total
  let grandTotalInvoiceCMT = 0;
  let grandTotalIndianCMT = 0;
  let grandTotalPhysicalCMT = 0;

  // Collect worker details (unique entries)
  const workerDetailsMap = new Map();

  // Add data rows
  Object.keys(groupedData)
    .sort()
    .forEach((itemName) => {
      const itemData = groupedData[itemName];
      const itemStartRow = currentRow;
      let itemInvoiceCMT = 0;
      let itemIndianCMT = 0;
      let itemPhysicalCMT = 0;

      // Add logs for this item
      itemData.logs.forEach((log, logIndex) => {
        const row = worksheet.getRow(currentRow);

        // Only show item name on first row of item group
        if (logIndex === 0) {
          row.getCell(1).value = itemName;
          row.getCell(2).value = itemData.supplier_item || '';
        }

        // Log details
        row.getCell(3).value = log.log_no || '';
        row.getCell(4).value = log.invoice_length || 0;
        row.getCell(5).value = log.invoice_diameter || 0;
        row.getCell(6).value = log.invoice_cmt || 0;
        row.getCell(7).value = log.indian_cmt || 0;
        row.getCell(8).value = log.physical_length || '';
        row.getCell(9).value = log.physical_diameter || 0;
        row.getCell(10).value = log.physical_cmt || 0;
        row.getCell(11).value = log.remark || '';

        // Format numbers
        [4, 5, 9].forEach((colNum) => {
          const cell = row.getCell(colNum);
          if (cell.value && typeof cell.value === 'number') {
            cell.numFmt = '0.00';
          }
        });
        [6, 7, 10].forEach((colNum) => {
          const cell = row.getCell(colNum);
          if (cell.value && typeof cell.value === 'number') {
            cell.numFmt = '0.000';
          }
        });

        // Accumulate totals
        itemInvoiceCMT += log.invoice_cmt || 0;
        itemIndianCMT += log.indian_cmt || 0;
        itemPhysicalCMT += log.physical_cmt || 0;

        // Collect worker details
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

      // Add item total row
      const itemTotalRow = worksheet.getRow(currentRow);
      itemTotalRow.getCell(2).value = 'Total';
      itemTotalRow.getCell(2).font = { bold: true };
      itemTotalRow.getCell(6).value = itemInvoiceCMT;
      itemTotalRow.getCell(6).font = { bold: true };
      itemTotalRow.getCell(6).numFmt = '0.000';
      itemTotalRow.getCell(7).value = itemIndianCMT;
      itemTotalRow.getCell(7).font = { bold: true };
      itemTotalRow.getCell(7).numFmt = '0.000';
      itemTotalRow.getCell(10).value = itemPhysicalCMT;
      itemTotalRow.getCell(10).font = { bold: true };
      itemTotalRow.getCell(10).numFmt = '0.000';
      currentRow++;

      // Accumulate grand totals
      grandTotalInvoiceCMT += itemInvoiceCMT;
      grandTotalIndianCMT += itemIndianCMT;
      grandTotalPhysicalCMT += itemPhysicalCMT;
    });

  // Add grand total row
  const grandTotalRow = worksheet.getRow(currentRow);
  grandTotalRow.getCell(1).value = 'Total';
  grandTotalRow.getCell(1).font = { bold: true };
  grandTotalRow.getCell(6).value = grandTotalInvoiceCMT;
  grandTotalRow.getCell(6).font = { bold: true };
  grandTotalRow.getCell(6).numFmt = '0.000';
  grandTotalRow.getCell(7).value = grandTotalIndianCMT;
  grandTotalRow.getCell(7).font = { bold: true };
  grandTotalRow.getCell(7).numFmt = '0.000';
  grandTotalRow.getCell(10).value = grandTotalPhysicalCMT;
  grandTotalRow.getCell(10).font = { bold: true };
  grandTotalRow.getCell(10).numFmt = '0.000';
  currentRow++;

  // Add worker details section
  currentRow += 2;
  const workerHeaderRow = worksheet.getRow(currentRow);
  const workerHeaders = ['Inward Id', 'Shift', 'Work Hours', 'Worker'];
  workerHeaders.forEach((header, index) => {
    const cell = workerHeaderRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
  });
  currentRow++;

  // Add worker rows
  workerDetailsMap.forEach((worker) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = worker.inward_id || '';
    row.getCell(2).value = worker.shift || '';
    row.getCell(3).value = worker.working_hours || '';
    row.getCell(4).value = worker.no_of_workers || '';
    currentRow++;
  });

  // Generate file path
  const timestamp = new Date().getTime();
  const fileName = `log_inward_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/LogInward';
  const filePath = `${dirPath}/${fileName}`;

  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true });

  // Save the workbook
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;

  console.log('Log inward report generated:', downloadLink);

  return downloadLink;
};

export { GenerateLogDailyInwardReport };
