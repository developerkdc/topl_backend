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
 * Group data by item name and log number
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
        workers: [],
      };
    }

    // Add cut piece
    grouped[itemName][logNo].pieces.push({
      code: record.code,
      log_no_code: record.log_no_code,
      length: record.length,
      girth: record.girth,
      cc_cmt: record.crosscut_cmt,
    });

    // Add worker details (avoid duplicates)
    const workerKey = `${record.machine_id}_${record.worker_details?.shift || ''}`;
    const existingWorker = grouped[itemName][logNo].workers.find(
      (w) => `${w.machine_id}_${w.shift}` === workerKey
    );

    if (!existingWorker && record.worker_details) {
      grouped[itemName][logNo].workers.push({
        machine_id: record.machine_id,
        machine_name: record.machine_name,
        shift: record.worker_details.shift,
        working_hours: record.worker_details.working_hours,
        workers: record.worker_details.workers,
      });
    }
  });

  return grouped;
};

/**
 * Generate Cross Cutting Daily Report
 */
const GenerateCrossCuttingReport = async (details, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('CrossCut Report');

  const formattedDate = formatDate(reportDate);
  console.log('Generating report for date:', formattedDate);

  let currentRow = 1;

  // Row 1: Title
  worksheet.mergeCells(currentRow, 1, currentRow, 9);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = `CrossCut Details Report Date: ${formattedDate}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Row 2-3: Empty spacing
  currentRow += 2;

  // Row 4: Main data headers
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
    { width: 12 }, // LogNo
    { width: 10 }, // Length
    { width: 10 }, // Girth
    { width: 12 }, // Inward CMT
    { width: 12 }, // LogX
    { width: 10 }, // Length
    { width: 10 }, // Girth
    { width: 12 }, // CC CMT
  ];

  // Group data
  const groupedData = groupData(details);

  // Track totals for summary
  const itemTotals = {};
  let grandTotalInward = 0;
  let grandTotalCC = 0;

  // Add data rows
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
          const logStartRow = currentRow;
          let logCCTotal = 0;

          // Add pieces for this log
          logData.pieces.forEach((piece, pieceIndex) => {
            const row = worksheet.getRow(currentRow);

            // Only show item name on first row of item
            if (currentRow === itemStartRow) {
              row.getCell(1).value = itemName;
            }

            // Only show log info on first piece of log
            if (pieceIndex === 0) {
              row.getCell(2).value = logData.original_log.log_no;
              row.getCell(3).value = logData.original_log.length;
              row.getCell(4).value = logData.original_log.girth;
              row.getCell(5).value = logData.original_log.inward_cmt;
            }

            // Show piece info
            row.getCell(6).value = piece.log_no_code || piece.code;
            row.getCell(7).value = piece.length;
            row.getCell(8).value = piece.girth;
            row.getCell(9).value = piece.cc_cmt;

            // Format numbers
            [3, 4, 5, 7, 8, 9].forEach((colNum) => {
              const cell = row.getCell(colNum);
              if (cell.value && typeof cell.value === 'number') {
                cell.numFmt = '0.000';
              }
            });

            logCCTotal += piece.cc_cmt || 0;
            currentRow++;
          });

          // Add log total row
          const logTotalRow = worksheet.getRow(currentRow);
          logTotalRow.getCell(6).value = 'Total';
          logTotalRow.getCell(6).font = { bold: true, color: { argb: 'FFFF0000' } };
          logTotalRow.getCell(9).value = logCCTotal;
          logTotalRow.getCell(9).font = { bold: true, color: { argb: 'FFFF0000' } };
          logTotalRow.getCell(9).numFmt = '0.000';
          currentRow++;

          itemInwardTotal += logData.original_log.inward_cmt || 0;
          itemCCTotal += logCCTotal;
        });

      // Add item total row
      const itemTotalRow = worksheet.getRow(currentRow);
      itemTotalRow.getCell(2).value = 'Total';
      itemTotalRow.getCell(2).font = { bold: true };
      itemTotalRow.getCell(5).value = itemInwardTotal;
      itemTotalRow.getCell(5).font = { bold: true };
      itemTotalRow.getCell(5).numFmt = '0.000';
      itemTotalRow.getCell(9).value = itemCCTotal;
      itemTotalRow.getCell(9).font = { bold: true };
      itemTotalRow.getCell(9).numFmt = '0.000';
      currentRow++;

      // Store item totals for summary
      itemTotals[itemName] = {
        inward: itemInwardTotal,
        cc: itemCCTotal,
      };

      grandTotalInward += itemInwardTotal;
      grandTotalCC += itemCCTotal;

      // Add empty row between items
      currentRow++;
    });

  // Add summary section
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
  });
  currentRow++;

  // Add summary data
  Object.keys(itemTotals)
    .sort()
    .forEach((itemName) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = itemName;
      row.getCell(2).value = itemTotals[itemName].inward;
      row.getCell(2).numFmt = '0.000';
      row.getCell(3).value = itemTotals[itemName].cc;
      row.getCell(3).numFmt = '0.000';
      currentRow++;
    });

  // Add summary total row
  const summaryTotalRow = worksheet.getRow(currentRow);
  summaryTotalRow.getCell(1).value = 'Total';
  summaryTotalRow.getCell(2).value = grandTotalInward;
  summaryTotalRow.getCell(3).value = grandTotalCC;
  summaryTotalRow.font = { bold: true };
  summaryTotalRow.getCell(2).numFmt = '0.000';
  summaryTotalRow.getCell(3).numFmt = '0.000';
  currentRow++;

  // Add worker details section
  currentRow += 2;
  const workerHeaderRow = worksheet.getRow(currentRow);
  workerHeaderRow.getCell(1).value = 'CCId';
  workerHeaderRow.getCell(2).value = 'Shift';
  workerHeaderRow.getCell(3).value = 'Work Hours';
  workerHeaderRow.getCell(4).value = 'Worker';
  workerHeaderRow.getCell(5).value = 'Machine Id';
  workerHeaderRow.font = { bold: true };
  workerHeaderRow.eachCell({ includeEmpty: false }, (cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  currentRow++;

  // Collect all unique workers
  const allWorkers = new Set();
  Object.values(groupedData).forEach((logs) => {
    Object.values(logs).forEach((logData) => {
      logData.workers.forEach((worker) => {
        const workerKey = JSON.stringify(worker);
        allWorkers.add(workerKey);
      });
    });
  });

  // Add worker rows
  Array.from(allWorkers).forEach((workerJson) => {
    const worker = JSON.parse(workerJson);
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = details[0]?._id?.toString().slice(-5) || ''; // Use document ID as CCId
    row.getCell(2).value = worker.shift || '';
    row.getCell(3).value = worker.working_hours || '';
    row.getCell(4).value = worker.workers || '';
    row.getCell(5).value = worker.machine_name || worker.machine_id || '';
    currentRow++;
  });

  // Generate file path
  const timestamp = new Date().getTime();
  const fileName = `crosscutting_daily_report_${timestamp}.xlsx`;
  const dirPath = 'public/reports/CrossCutting';
  const filePath = `${dirPath}/${fileName}`;

  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true });

  // Save the workbook
  await workbook.xlsx.writeFile(filePath);

  const downloadLink = `${process.env.APP_URL}${filePath}`;

  console.log('Report generated:', downloadLink);

  return downloadLink;
};

export { GenerateCrossCuttingReport };
