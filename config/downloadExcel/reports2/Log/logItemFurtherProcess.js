import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Create Log Item Further Process Report Excel
 * Generates comprehensive inventory report tracking complete journey of individual logs
 * from inward receipt through all processing stages (crosscutting, flitching, slicing,
 * dressing, dyeing, tapping/splicing, pressing)
 * Shows one row per log with item grouping
 * Combines both inward details and further processing stages in one wide report
 * 
 * @param {Array} logData - Array of log data with calculated metrics
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createLogItemFurtherProcessReportExcel = async (
  logData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/reports2/Log';

    // Ensure folder exists
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Log Item Further Process');

    // Format dates for title
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (err) {
        return 'N/A';
      }
    };

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    // Build title
    const title = `Inward Log Wise Stock   Inward Date: ${formattedStartDate}`;

    console.log('Generated log item further process report title:', title);

    // Define columns (Total: ~50 columns)
    const columnDefinitions = [
      { key: 'item_name', width: 20 },              // 1. Item Name
      { key: 'log_no', width: 15 },                 // 2. LogNo
      { key: 'indian_cmt', width: 12 },             // 3. Indian CMT
      { key: 'rece', width: 12 },                   // 4. RECE
      { key: 'inward_total_stock', width: 12 },     // 5. Total Stock (Inward)
      { key: 'cc_rece', width: 12 },                // 6. CC RECE
      { key: 'saw', width: 12 },                    // 7. Saw.
      { key: 'ue', width: 12 },                     // 8. UE
      { key: 'peel', width: 12 },                   // 9. Peel
      { key: 'flitch', width: 12 },                 // 10. Flitch
      { key: 'crosscut_total_stock', width: 12 },   // 11. Total Stock (Cross Cut)
      { key: 'crosscut_total_issue', width: 12 },   // 12. Total Issue (Cross Cut)
      { key: 'crosscut_stock_after', width: 12 },   // 13. Total Stock (Cross Cut After)
      { key: 'slice_rece', width: 12 },             // 14. Slice RECE
      { key: 'slice_dress', width: 12 },            // 15. Dress (Slice)
      { key: 'slice_dye', width: 12 },              // 16. Dye (Slice)
      { key: 'slice_total_issue', width: 12 },      // 17. Total issue (Slice)
      { key: 'slice_total_stock', width: 12 },      // 18. Total Stock (Slice)
      { key: 'dress_rece', width: 12 },             // 19. Dress RECE
      { key: 'dress_clipp', width: 12 },            // 20. Clipp (Dress)
      { key: 'dress_dye', width: 12 },              // 21. Dye (Dress)
      { key: 'dress_mix_match', width: 12 },        // 22. Mix Match (Dress)
      { key: 'dress_total_issue', width: 12 },      // 23. Total issue (Dress)
      { key: 'dress_total_stock', width: 12 },      // 24. Total Stock (Dress)
      { key: 'dye_total_issue', width: 12 },        // 25. Total Issue (Dye)
      { key: 'dye_total_stock', width: 12 },        // 26. Total Stock (Dye)
      { key: 'dye_rece', width: 12 },               // 27. Dye RECE
      { key: 'clip_rece', width: 12 },              // 28. Clip RECE
      { key: 'clip_msplic', width: 12 },            // 29. MSplic (Clip)
      { key: 'clip_hsplic', width: 12 },            // 30. HSplic (Clip)
      { key: 'clip_total_issue', width: 12 },       // 31. Total Issue (Clip)
      { key: 'clip_total_stock', width: 12 },       // 32. Total Stock (Clip)
      { key: 'machine_splicing_rece', width: 12 },  // 33. RECE (Machine Splicing)
      { key: 'machine_splicing_total_issue', width: 12 }, // 34. Total Issue (Machine)
      { key: 'machine_splicing_total_stock', width: 12 }, // 35. Total Stock (Machine)
      { key: 'hand_splicing_rece', width: 12 },     // 36. RECE (Hand Splicing)
      { key: 'hand_splicing_total_issue', width: 12 },    // 37. Total Issue (Hand)
      { key: 'hand_splicing_total_stock', width: 12 },    // 38. Total Stock (Hand)
      { key: 'end_tapping_rece', width: 12 },       // 39. Total RECE (End Tapping)
      { key: 'end_tapping_total_issue', width: 12 }, // 40. Total Issue (End Tapping)
      { key: 'end_tapping_total_stock', width: 12 }, // 41. Total Stock (End Tapping)
      { key: 'splicing_total_issue', width: 12 },   // 42. Total Issue (Splicing)
      { key: 'splicing_total_stock', width: 12 },   // 43. Total Stock (Splicing)
      { key: 'pressing_rece', width: 12 },          // 44. RECE (Pressing)
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all columns)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 44);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Major group headers (merged cells for grouped columns)
    const groupHeaderRow = worksheet.addRow([
      '', // 1. Item Name
      '', // 2. LogNo
      '', // 3-4. (Indian CMT, RECE - no group)
      '', 
      'Inward in(CMT)', // 5-10. Inward section
      '', '', '', '', '',
      'Cross Cut Issue in(CMT)', // 11-13. Cross Cut section
      '', '',
      'Slice Issue', // 14-18. Slice section
      '', '', '', '',
      'Dressing Issue', // 19-24. Dressing section
      '', '', '', '', '',
      'Dyeing', // 25-27. Dyeing section
      '', '',
      'Clip Issue', // 28-32. Clip section
      '', '', '', '',
      'Machine Splicing', // 33-35. Machine Splicing section
      '', '',
      'Hand Splicing', // 36-38. Hand Splicing section
      '', '',
      'End Tapping', // 39-41. End Tapping section
      '', '',
      'Splicing', // 42-43. Splicing section
      '',
      'Pressing', // 44. Pressing section
    ]);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    groupHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Merge group headers
    worksheet.mergeCells(3, 5, 3, 10);   // Inward in(CMT) (cols 5-10)
    worksheet.mergeCells(3, 11, 3, 13);  // Cross Cut Issue in(CMT) (cols 11-13)
    worksheet.mergeCells(3, 14, 3, 18);  // Slice Issue (cols 14-18)
    worksheet.mergeCells(3, 19, 3, 24);  // Dressing Issue (cols 19-24)
    worksheet.mergeCells(3, 25, 3, 27);  // Dyeing (cols 25-27)
    worksheet.mergeCells(3, 28, 3, 32);  // Clip Issue (cols 28-32)
    worksheet.mergeCells(3, 33, 3, 35);  // Machine Splicing (cols 33-35)
    worksheet.mergeCells(3, 36, 3, 38);  // Hand Splicing (cols 36-38)
    worksheet.mergeCells(3, 39, 3, 41);  // End Tapping (cols 39-41)
    worksheet.mergeCells(3, 42, 3, 43);  // Splicing (cols 42-43)

    // Row 4: Column headers
    const headerRow = worksheet.addRow([
      'Item Name',
      'LogNo',
      'Indian CMT',
      'RECE',
      'Total Stock',
      'CC RECE',
      'Saw.',
      'UE',
      'Peel',
      'Flitch',
      'Total Stock',
      'Total Issue',
      'Total Stock',
      'Slice RECE',
      'Dress',
      'Dye',
      'Total issue',
      'Total Stock',
      'Dress RECE',
      'Clipp',
      'Dye',
      'Mix Match',
      'Total issue',
      'Total Stock',
      'Total Issue',
      'Total Stock',
      'Dye RECE',
      'Clip RECE',
      'MSplic',
      'HSplic',
      'Total Issue',
      'Total Stock',
      'RECE',
      'Total Issue',
      'Total Stock',
      'RECE',
      'Total Issue',
      'Total Stock',
      'Total RECE',
      'Total Issue',
      'Total Stock',
      'Total Issue',
      'Total Stock',
      'RECE',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Group data by item_name
    const groupedData = {};
    logData.forEach((log) => {
      const itemName = log.item_name || 'UNKNOWN';
      if (!groupedData[itemName]) {
        groupedData[itemName] = [];
      }
      groupedData[itemName].push(log);
    });

    // Initialize grand totals
    const grandTotals = {
      indian_cmt: 0,
      rece: 0,
      inward_total_stock: 0,
      cc_rece: 0,
      saw: 0,
      ue: 0,
      peel: 0,
      flitch: 0,
      crosscut_total_stock: 0,
      crosscut_total_issue: 0,
      crosscut_stock_after: 0,
      slice_rece: 0,
      slice_dress: 0,
      slice_dye: 0,
      slice_total_issue: 0,
      slice_total_stock: 0,
      dress_rece: 0,
      dress_clipp: 0,
      dress_dye: 0,
      dress_mix_match: 0,
      dress_total_issue: 0,
      dress_total_stock: 0,
      dye_total_issue: 0,
      dye_total_stock: 0,
      dye_rece: 0,
      clip_rece: 0,
      clip_msplic: 0,
      clip_hsplic: 0,
      clip_total_issue: 0,
      clip_total_stock: 0,
      machine_splicing_rece: 0,
      machine_splicing_total_issue: 0,
      machine_splicing_total_stock: 0,
      hand_splicing_rece: 0,
      hand_splicing_total_issue: 0,
      hand_splicing_total_stock: 0,
      end_tapping_rece: 0,
      end_tapping_total_issue: 0,
      end_tapping_total_stock: 0,
      splicing_total_issue: 0,
      splicing_total_stock: 0,
      pressing_rece: 0,
    };

    // Sort items alphabetically
    const sortedItemNames = Object.keys(groupedData).sort();

    // Add data rows grouped by item
    sortedItemNames.forEach((itemName) => {
      const logs = groupedData[itemName];
      const itemStartRow = worksheet.lastRow.number + 1;

      // Initialize item totals
      const itemTotals = { ...grandTotals };
      Object.keys(itemTotals).forEach((key) => {
        itemTotals[key] = 0;
      });

      // Add each log for this item
      logs.forEach((log, index) => {
        const rowData = {
          item_name: index === 0 ? itemName : '', // Only show item name on first log
          log_no: log.log_no || '',
          indian_cmt: parseFloat(log.indian_cmt || 0).toFixed(2),
          rece: parseFloat(log.rece || 0).toFixed(2),
          inward_total_stock: parseFloat(log.inward_total_stock || 0).toFixed(2),
          cc_rece: parseFloat(log.cc_rece || 0).toFixed(2),
          saw: parseFloat(log.saw || 0).toFixed(2),
          ue: parseFloat(log.ue || 0).toFixed(2),
          peel: parseFloat(log.peel || 0).toFixed(2),
          flitch: parseFloat(log.flitch || 0).toFixed(2),
          crosscut_total_stock: parseFloat(log.crosscut_total_stock || 0).toFixed(2),
          crosscut_total_issue: parseFloat(log.crosscut_total_issue || 0).toFixed(2),
          crosscut_stock_after: parseFloat(log.crosscut_stock_after || 0).toFixed(2),
          slice_rece: parseFloat(log.slice_rece || 0).toFixed(2),
          slice_dress: parseFloat(log.slice_dress || 0).toFixed(2),
          slice_dye: parseFloat(log.slice_dye || 0).toFixed(2),
          slice_total_issue: parseFloat(log.slice_total_issue || 0).toFixed(2),
          slice_total_stock: parseFloat(log.slice_total_stock || 0).toFixed(2),
          dress_rece: parseFloat(log.dress_rece || 0).toFixed(2),
          dress_clipp: parseFloat(log.dress_clipp || 0).toFixed(2),
          dress_dye: parseFloat(log.dress_dye || 0).toFixed(2),
          dress_mix_match: parseFloat(log.dress_mix_match || 0).toFixed(2),
          dress_total_issue: parseFloat(log.dress_total_issue || 0).toFixed(2),
          dress_total_stock: parseFloat(log.dress_total_stock || 0).toFixed(2),
          dye_total_issue: parseFloat(log.dye_total_issue || 0).toFixed(2),
          dye_total_stock: parseFloat(log.dye_total_stock || 0).toFixed(2),
          dye_rece: parseFloat(log.dye_rece || 0).toFixed(2),
          clip_rece: parseFloat(log.clip_rece || 0).toFixed(2),
          clip_msplic: parseFloat(log.clip_msplic || 0).toFixed(2),
          clip_hsplic: parseFloat(log.clip_hsplic || 0).toFixed(2),
          clip_total_issue: parseFloat(log.clip_total_issue || 0).toFixed(2),
          clip_total_stock: parseFloat(log.clip_total_stock || 0).toFixed(2),
          machine_splicing_rece: parseFloat(log.machine_splicing_rece || 0).toFixed(2),
          machine_splicing_total_issue: parseFloat(log.machine_splicing_total_issue || 0).toFixed(2),
          machine_splicing_total_stock: parseFloat(log.machine_splicing_total_stock || 0).toFixed(2),
          hand_splicing_rece: parseFloat(log.hand_splicing_rece || 0).toFixed(2),
          hand_splicing_total_issue: parseFloat(log.hand_splicing_total_issue || 0).toFixed(2),
          hand_splicing_total_stock: parseFloat(log.hand_splicing_total_stock || 0).toFixed(2),
          end_tapping_rece: parseFloat(log.end_tapping_rece || 0).toFixed(2),
          end_tapping_total_issue: parseFloat(log.end_tapping_total_issue || 0).toFixed(2),
          end_tapping_total_stock: parseFloat(log.end_tapping_total_stock || 0).toFixed(2),
          splicing_total_issue: parseFloat(log.splicing_total_issue || 0).toFixed(2),
          splicing_total_stock: parseFloat(log.splicing_total_stock || 0).toFixed(2),
          pressing_rece: parseFloat(log.pressing_rece || 0).toFixed(2),
        };

        worksheet.addRow(rowData);

        // Accumulate item totals
        Object.keys(itemTotals).forEach((key) => {
          itemTotals[key] += parseFloat(log[key] || 0);
        });
      });

      // Merge item_name cells vertically for this item
      if (logs.length > 1) {
        const itemEndRow = worksheet.lastRow.number;
        worksheet.mergeCells(itemStartRow, 1, itemEndRow, 1);
      }

      // Add item total row
      const itemTotalRow = worksheet.addRow({
        item_name: '',
        log_no: 'Total',
        indian_cmt: itemTotals.indian_cmt.toFixed(2),
        rece: itemTotals.rece.toFixed(2),
        inward_total_stock: itemTotals.inward_total_stock.toFixed(2),
        cc_rece: itemTotals.cc_rece.toFixed(2),
        saw: itemTotals.saw.toFixed(2),
        ue: itemTotals.ue.toFixed(2),
        peel: itemTotals.peel.toFixed(2),
        flitch: itemTotals.flitch.toFixed(2),
        crosscut_total_stock: itemTotals.crosscut_total_stock.toFixed(2),
        crosscut_total_issue: itemTotals.crosscut_total_issue.toFixed(2),
        crosscut_stock_after: itemTotals.crosscut_stock_after.toFixed(2),
        slice_rece: itemTotals.slice_rece.toFixed(2),
        slice_dress: itemTotals.slice_dress.toFixed(2),
        slice_dye: itemTotals.slice_dye.toFixed(2),
        slice_total_issue: itemTotals.slice_total_issue.toFixed(2),
        slice_total_stock: itemTotals.slice_total_stock.toFixed(2),
        dress_rece: itemTotals.dress_rece.toFixed(2),
        dress_clipp: itemTotals.dress_clipp.toFixed(2),
        dress_dye: itemTotals.dress_dye.toFixed(2),
        dress_mix_match: itemTotals.dress_mix_match.toFixed(2),
        dress_total_issue: itemTotals.dress_total_issue.toFixed(2),
        dress_total_stock: itemTotals.dress_total_stock.toFixed(2),
        dye_total_issue: itemTotals.dye_total_issue.toFixed(2),
        dye_total_stock: itemTotals.dye_total_stock.toFixed(2),
        dye_rece: itemTotals.dye_rece.toFixed(2),
        clip_rece: itemTotals.clip_rece.toFixed(2),
        clip_msplic: itemTotals.clip_msplic.toFixed(2),
        clip_hsplic: itemTotals.clip_hsplic.toFixed(2),
        clip_total_issue: itemTotals.clip_total_issue.toFixed(2),
        clip_total_stock: itemTotals.clip_total_stock.toFixed(2),
        machine_splicing_rece: itemTotals.machine_splicing_rece.toFixed(2),
        machine_splicing_total_issue: itemTotals.machine_splicing_total_issue.toFixed(2),
        machine_splicing_total_stock: itemTotals.machine_splicing_total_stock.toFixed(2),
        hand_splicing_rece: itemTotals.hand_splicing_rece.toFixed(2),
        hand_splicing_total_issue: itemTotals.hand_splicing_total_issue.toFixed(2),
        hand_splicing_total_stock: itemTotals.hand_splicing_total_stock.toFixed(2),
        end_tapping_rece: itemTotals.end_tapping_rece.toFixed(2),
        end_tapping_total_issue: itemTotals.end_tapping_total_issue.toFixed(2),
        end_tapping_total_stock: itemTotals.end_tapping_total_stock.toFixed(2),
        splicing_total_issue: itemTotals.splicing_total_issue.toFixed(2),
        splicing_total_stock: itemTotals.splicing_total_stock.toFixed(2),
        pressing_rece: itemTotals.pressing_rece.toFixed(2),
      });
      itemTotalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      });

      // Accumulate grand totals
      Object.keys(grandTotals).forEach((key) => {
        grandTotals[key] += itemTotals[key];
      });
    });

    // Add grand total row
    const grandTotalRow = worksheet.addRow({
      item_name: 'Total',
      log_no: '',
      indian_cmt: grandTotals.indian_cmt.toFixed(2),
      rece: grandTotals.rece.toFixed(2),
      inward_total_stock: grandTotals.inward_total_stock.toFixed(2),
      cc_rece: grandTotals.cc_rece.toFixed(2),
      saw: grandTotals.saw.toFixed(2),
      ue: grandTotals.ue.toFixed(2),
      peel: grandTotals.peel.toFixed(2),
      flitch: grandTotals.flitch.toFixed(2),
      crosscut_total_stock: grandTotals.crosscut_total_stock.toFixed(2),
      crosscut_total_issue: grandTotals.crosscut_total_issue.toFixed(2),
      crosscut_stock_after: grandTotals.crosscut_stock_after.toFixed(2),
      slice_rece: grandTotals.slice_rece.toFixed(2),
      slice_dress: grandTotals.slice_dress.toFixed(2),
      slice_dye: grandTotals.slice_dye.toFixed(2),
      slice_total_issue: grandTotals.slice_total_issue.toFixed(2),
      slice_total_stock: grandTotals.slice_total_stock.toFixed(2),
      dress_rece: grandTotals.dress_rece.toFixed(2),
      dress_clipp: grandTotals.dress_clipp.toFixed(2),
      dress_dye: grandTotals.dress_dye.toFixed(2),
      dress_mix_match: grandTotals.dress_mix_match.toFixed(2),
      dress_total_issue: grandTotals.dress_total_issue.toFixed(2),
      dress_total_stock: grandTotals.dress_total_stock.toFixed(2),
      dye_total_issue: grandTotals.dye_total_issue.toFixed(2),
      dye_total_stock: grandTotals.dye_total_stock.toFixed(2),
      dye_rece: grandTotals.dye_rece.toFixed(2),
      clip_rece: grandTotals.clip_rece.toFixed(2),
      clip_msplic: grandTotals.clip_msplic.toFixed(2),
      clip_hsplic: grandTotals.clip_hsplic.toFixed(2),
      clip_total_issue: grandTotals.clip_total_issue.toFixed(2),
      clip_total_stock: grandTotals.clip_total_stock.toFixed(2),
      machine_splicing_rece: grandTotals.machine_splicing_rece.toFixed(2),
      machine_splicing_total_issue: grandTotals.machine_splicing_total_issue.toFixed(2),
      machine_splicing_total_stock: grandTotals.machine_splicing_total_stock.toFixed(2),
      hand_splicing_rece: grandTotals.hand_splicing_rece.toFixed(2),
      hand_splicing_total_issue: grandTotals.hand_splicing_total_issue.toFixed(2),
      hand_splicing_total_stock: grandTotals.hand_splicing_total_stock.toFixed(2),
      end_tapping_rece: grandTotals.end_tapping_rece.toFixed(2),
      end_tapping_total_issue: grandTotals.end_tapping_total_issue.toFixed(2),
      end_tapping_total_stock: grandTotals.end_tapping_total_stock.toFixed(2),
      splicing_total_issue: grandTotals.splicing_total_issue.toFixed(2),
      splicing_total_stock: grandTotals.splicing_total_stock.toFixed(2),
      pressing_rece: grandTotals.pressing_rece.toFixed(2),
    });
    grandTotalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
    });

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 2) { // Skip title and empty row
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });

    // Save file
    const timeStamp = new Date().getTime();
    const fileName = `Log-Item-Further-Process-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Log item further process report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating log item further process report:', error);
    throw new ApiError(500, error.message, error);
  }
};
