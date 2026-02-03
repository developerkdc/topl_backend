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
 * Group data by item name and CC number
 */
const groupData = (data) => {
  const grouped = {};

  data.forEach((record) => {
    const itemName = record.item_name || 'UNKNOWN';
    const ccNo = record.log_no_code || 'UNKNOWN';

    if (!grouped[itemName]) {
      grouped[itemName] = {
        inward_cmt: 0,
        cc_no_groups: {},
      };
    }

    if (!grouped[itemName].cc_no_groups[ccNo]) {
      grouped[itemName].cc_no_groups[ccNo] = {
        cc_info: {
          log_no_code: ccNo,
          length: record.crosscut_source?.length || 0,
          girth: record.crosscut_source?.girth || 0,
          cc_cmt: record.crosscut_source?.crosscut_cmt || 0,
        },
        flitches: [],
        workers: [],
      };
      // Add to inward CMT (from crosscut source)
      grouped[itemName].inward_cmt += record.crosscut_source?.crosscut_cmt || 0;
    }

    // Add flitch piece
    grouped[itemName].cc_no_groups[ccNo].flitches.push({
      flitch_no: record.flitch_code,
      length: record.length,
      width1: record.width1,
      width2: record.width2,
      width3: record.width3,
      height: record.height,
      flitch_cmt: record.flitch_cmt,
    });

    // Add worker details (avoid duplicates)
    const workerKey = `${record.machine_id}_${record.worker_details?.shift || ''}`;
    const existingWorker = grouped[itemName].cc_no_groups[ccNo].workers.find(
      (w) => `${w.machine_id}_${w.shift}` === workerKey
    );

    if (!existingWorker && record.worker_details) {
      grouped[itemName].cc_no_groups[ccNo].workers.push({
        flitch_id: record._id,
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
 * Generate Flitch Daily Report
 */
const GenerateFlitchDailyReport = async (details, reportDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Flitch Report');

  const formattedDate = formatDate(reportDate);
  console.log('Generating flitch report for date:', formattedDate);

  let currentRow = 1;

  // Row 1: Title
  worksheet.mergeCells(currentRow, 1, currentRow, 11);
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
    'Item Name',
    'CC No',
    'Length',
    'Girth',
    'CMT',
    'Flitch No',
    'Length',
    'Width1',
    'Width2',
    'Width3',
    'Height',
    'CMT',
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
    { width: 12 }, // CC No
    { width: 10 }, // Length
    { width: 10 }, // Girth
    { width: 10 }, // CMT
    { width: 12 }, // Flitch No
    { width: 10 }, // Length
    { width: 10 }, // Width1
    { width: 10 }, // Width2
    { width: 10 }, // Width3
    { width: 10 }, // Height
    { width: 10 }, // CMT
  ];

  // Group data
  const groupedData = groupData(details);

  // Track totals for summary
  const itemTotals = {};
  let grandTotalInward = 0;
  let grandTotalFlitch = 0;
  const allWorkers = [];

  // Add data rows
  Object.keys(groupedData)
    .sort()
    .forEach((itemName) => {
      const itemData = groupedData[itemName];
      const itemStartRow = currentRow;
      let itemFlitchTotal = 0;

      const ccNos = itemData.cc_no_groups;

      Object.keys(ccNos)
        .sort()
        .forEach((ccNo) => {
          const ccData = ccNos[ccNo];
          const ccStartRow = currentRow;
          let ccFlitchTotal = 0;

          // Add flitches for this CC No
          ccData.flitches.forEach((flitch, flitchIndex) => {
            const row = worksheet.getRow(currentRow);

            // Only show item name on first row of item
            if (currentRow === itemStartRow) {
              row.getCell(1).value = itemName;
            }

            // Only show CC info on first flitch of CC
            if (flitchIndex === 0) {
              row.getCell(2).value = ccData.cc_info.log_no_code;
              row.getCell(3).value = ccData.cc_info.length;
              row.getCell(4).value = ccData.cc_info.girth;
              row.getCell(5).value = ccData.cc_info.cc_cmt;

              // Format CC numbers
              [3, 4, 5].forEach((colNum) => {
                const cell = row.getCell(colNum);
                if (cell.value && typeof cell.value === 'number') {
                  cell.numFmt = '0.000';
                }
              });
            }

            // Show flitch info
            row.getCell(6).value = flitch.flitch_no;
            row.getCell(7).value = flitch.length;
            row.getCell(8).value = flitch.width1;
            row.getCell(9).value = flitch.width2;
            row.getCell(10).value = flitch.width3;
            row.getCell(11).value = flitch.height;
            row.getCell(12).value = flitch.flitch_cmt;

            // Format flitch numbers
            [7, 8, 9, 10, 11].forEach((colNum) => {
              const cell = row.getCell(colNum);
              if (cell.value && typeof cell.value === 'number') {
                cell.numFmt = '0.00';
              }
            });
            // CMT with 3 decimals
            const cmtCell = row.getCell(12);
            if (cmtCell.value && typeof cmtCell.value === 'number') {
              cmtCell.numFmt = '0.000';
            }

            ccFlitchTotal += flitch.flitch_cmt || 0;
            currentRow++;
          });

          // Add CC total row
          const ccTotalRow = worksheet.getRow(currentRow);
          ccTotalRow.getCell(2).value = 'Total';
          ccTotalRow.getCell(2).font = { bold: true, color: { argb: 'FFFF0000' } };
          ccTotalRow.getCell(5).value = ccData.cc_info.cc_cmt;
          ccTotalRow.getCell(5).font = { bold: true, color: { argb: 'FFFF0000' } };
          ccTotalRow.getCell(5).numFmt = '0.000';
          ccTotalRow.getCell(12).value = ccFlitchTotal;
          ccTotalRow.getCell(12).font = { bold: true, color: { argb: 'FFFF0000' } };
          ccTotalRow.getCell(12).numFmt = '0.000';
          currentRow++;

          itemFlitchTotal += ccFlitchTotal;

          // Collect worker details
          ccData.workers.forEach((worker) => {
            const workerKey = `${worker.machine_id}_${worker.shift}`;
            if (!allWorkers.find((w) => `${w.machine_id}_${w.shift}` === workerKey)) {
              allWorkers.push(worker);
            }
          });
        });

      // Add item total row
      const itemTotalRow = worksheet.getRow(currentRow);
      itemTotalRow.getCell(2).value = 'Total';
      itemTotalRow.getCell(2).font = { bold: true };
      itemTotalRow.getCell(12).value = itemFlitchTotal;
      itemTotalRow.getCell(12).font = { bold: true };
      itemTotalRow.getCell(12).numFmt = '0.000';
      currentRow++;

      // Store item totals for summary
      itemTotals[itemName] = {
        inward: itemData.inward_cmt,
        flitch: itemFlitchTotal,
      };

      grandTotalInward += itemData.inward_cmt;
      grandTotalFlitch += itemFlitchTotal;
    });

  // Add grand total row
  const grandTotalRow = worksheet.getRow(currentRow);
  grandTotalRow.getCell(1).value = 'Total';
  grandTotalRow.getCell(1).font = { bold: true };
  grandTotalRow.getCell(12).value = grandTotalFlitch;
  grandTotalRow.getCell(12).font = { bold: true };
  grandTotalRow.getCell(12).numFmt = '0.000';
  currentRow++;

  // Add summary section
  currentRow += 2;
  const summaryHeaderRow = worksheet.getRow(currentRow);
  summaryHeaderRow.getCell(1).value = 'Item Name';
  summaryHeaderRow.getCell(2).value = 'Inward CMT';
  summaryHeaderRow.getCell(3).value = 'CC CMT';
  summaryHeaderRow.font = { bold: true };
  [1, 2, 3].forEach((colNum) => {
    const cell = summaryHeaderRow.getCell(colNum);
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
      row.getCell(3).value = itemTotals[itemName].flitch;
      row.getCell(3).numFmt = '0.000';
      currentRow++;
    });

  // Add summary total row
  const summaryTotalRow = worksheet.getRow(currentRow);
  summaryTotalRow.getCell(1).value = 'Total';
  summaryTotalRow.getCell(2).value = grandTotalInward;
  summaryTotalRow.getCell(3).value = grandTotalFlitch;
  summaryTotalRow.font = { bold: true };
  summaryTotalRow.getCell(2).numFmt = '0.000';
  summaryTotalRow.getCell(3).numFmt = '0.000';
  currentRow++;

  // Add worker details section
  currentRow += 2;
  const workerHeaderRow = worksheet.getRow(currentRow);
  workerHeaderRow.getCell(1).value = 'Flitch Id';
  workerHeaderRow.getCell(2).value = 'Shift';
  workerHeaderRow.getCell(3).value = 'Work Hours';
  workerHeaderRow.getCell(4).value = 'Worker';
  workerHeaderRow.getCell(5).value = 'Machine Id';
  workerHeaderRow.font = { bold: true };
  [1, 2, 3, 4, 5].forEach((colNum) => {
    const cell = workerHeaderRow.getCell(colNum);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  currentRow++;

  // Add worker rows
  allWorkers.forEach((worker) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = worker.flitch_id?.toString().slice(-5) || '';
    row.getCell(2).value = worker.shift || '';
    row.getCell(3).value = worker.working_hours || '';
    row.getCell(4).value = worker.workers || '';
    row.getCell(5).value = worker.machine_name || worker.machine_id || '';
    currentRow++;
  });

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
