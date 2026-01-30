import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';
export const createFlitchLogsExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/inventory/flitch';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('flitch-logs');
    const columns = [
      {
        header: 'Inward Sr No',
        key: 'inward_sr_no',
        width: 15,
      },
      { header: 'Item Sr No', key: 'item_sr_no', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'Supplier Item Name', key: 'supplier_item_name', width: 20 },
      { header: 'Supplier Flitch No', key: 'supplier_flitch_no', width: 20 },
      { header: 'Log No', key: 'log_no', width: 15 },
      { header: 'Flitch Code', key: 'flitch_code', width: 15 },
      { header: 'Flitch Formula ', key: 'formula', width: 15 },
      // { header: "Formula", key: "formula", width: 20 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width1', key: 'width1', width: 10 },
      { header: 'Width2', key: 'width2', width: 10 },
      { header: 'Width3', key: 'width3', width: 10 },
      { header: 'Height', key: 'height', width: 10 },
      { header: 'Flitch CMT', key: 'flitch_cmt', width: 15 },
      { header: 'Rate in Currency', key: 'rate_in_currency', width: 20 },
      { header: 'Rate in INR', key: 'rate_in_inr', width: 20 },
      //Todo : add exchange rate
      { header: 'Excahange Rate', key: 'exchange_rate', width: 20 },
      { header: 'GST Value', key: 'gst_val', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Remark', key: 'remark', width: 20 },
      //   { header: "Invoice ID", key: "invoice_id", width: 30 },
      {
        header: 'Inward Date',
        key: 'inward_date',
        width: 20,
      },
      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Updated Date', key: 'updatedAt', width: 20 },

      { header: 'Currency', key: 'currency', width: 10 },
      {
        header: 'No of Workers',
        key: 'no_of_workers',
        width: 15,
      },
      {
        header: 'Shift',
        key: 'shift',
        width: 10,
      },
      {
        header: 'Working Hours',
        key: 'working_hours',
        width: 15,
      },
      {
        header: 'Supplier Name',
        key: 'supplier_name',
        width: 30,
      },
      {
        header: 'Supplier Type',
        key: 'supplier_type',
        width: 20,
      },
      {
        header: 'Branch Name',
        key: 'branch_name',
        width: 25,
      },
      {
        header: 'Branch Address',
        key: 'address',
        width: 25,
      },
      {
        header: 'City',
        key: 'city',
        width: 20,
      },
      {
        header: 'State',
        key: 'state',
        width: 15,
      },
      {
        header: 'Country',
        key: 'country',
        width: 15,
      },
      {
        header: 'Pincode',
        key: 'pincode',
        width: 15,
      },
      {
        header: 'GST Number',
        key: 'gst_number',
        width: 20,
      },
      {
        header: 'Web URL',
        key: 'web_url',
        width: 25,
      },
      {
        header: 'Invoice Date',
        key: 'invoice_date',
        width: 20,
      },
      {
        header: 'Invoice No',
        key: 'invoice_no',
        width: 20,
      },
      {
        header: 'Total Item Amount',
        key: 'total_item_amount',
        width: 20,
      },
      {
        header: 'Transporter Details',
        key: 'transporter_details',
        width: 30,
      },
      {
        header: 'GST Percentage',
        key: 'gst_percentage',
        width: 20,
      },
      {
        header: 'Invoice Value with GST',
        key: 'invoice_value_with_gst',
        width: 20,
      },
      {
        header: 'Invoice Remark',
        key: 'invoice_remark',
        width: 20,
      },
      { header: 'Contact Person Name', key: 'contact_person_name', width: 25 },
      {
        header: 'Contact Person Email',
        key: 'contact_person_email',
        width: 25,
      },
      {
        header: 'Contact Person Mobile Number',
        key: 'contact_person_mobile_no',
        width: 25,
      },
      {
        header: 'Contact Person Designation',
        key: 'contact_person_designation',
        width: 25,
      },
    ];

    worksheet.columns = columns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        const rowData = {
          supplier_item_name: data.supplier_item_name,
          supplier_flitch_no: data.supplier_flitch_no,
          // item_id: data.item_id,
          item_sr_no: data.item_sr_no,
          item_name: data.item_name,
          log_no: data.log_no,
          flitch_code: data.flitch_code,
          // formula_type: data.flitch_formula.formula_type,
          formula: data.flitch_formula,
          length: data.length,
          width1: data.width1,
          width2: data.width2,
          width3: data.width3,
          height: data.height,
          flitch_cmt: data.flitch_cmt,
          rate_in_currency: data.rate_in_currency,
          rate_in_inr: data.rate_in_inr,
          exchange_rate: data.exchange_rate,

          amount: data.amount,
          remark: data.remark,
          // invoice_id: data.invoice_id,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          inward_sr_no: data.flitch_invoice_details.inward_sr_no,
          inward_date: data.flitch_invoice_details.inward_date,
          currency: data.flitch_invoice_details.currency,
          no_of_workers:
            data.flitch_invoice_details.workers_details.no_of_workers,
          shift: data.flitch_invoice_details.workers_details.shift,
          working_hours:
            data.flitch_invoice_details.workers_details.working_hours,
          supplier_name:
            data.flitch_invoice_details.supplier_details.company_details
              .supplier_name,
          supplier_type:
            data.flitch_invoice_details.supplier_details.company_details
              .supplier_type,
          branch_name:
            data.flitch_invoice_details.supplier_details.branch_detail
              .branch_name,
          address:
            data.flitch_invoice_details.supplier_details.branch_detail.address,
          city: data.flitch_invoice_details.supplier_details.branch_detail.city,
          state:
            data.flitch_invoice_details.supplier_details.branch_detail.state,
          country:
            data.flitch_invoice_details.supplier_details.branch_detail.country,
          pincode:
            data.flitch_invoice_details.supplier_details.branch_detail.pincode,
          gst_number:
            data.flitch_invoice_details.supplier_details.branch_detail
              .gst_number,
          web_url:
            data.flitch_invoice_details.supplier_details.branch_detail.web_url,
          contact_person_name:
            data.flitch_invoice_details.supplier_details.branch_detail
              .contact_person[0].name,
          contact_person_email:
            data.flitch_invoice_details.supplier_details.branch_detail
              .contact_person[0].email,
          contact_person_designation:
            data.flitch_invoice_details.supplier_details.branch_detail
              .contact_person[0].designation,
          contact_person_mobile_no:
            data.flitch_invoice_details.supplier_details.branch_detail
              .contact_person[0].mobile_number,
          invoice_date:
            data.flitch_invoice_details.invoice_Details.invoice_date,
          invoice_no: data.flitch_invoice_details.invoice_Details.invoice_no,
          total_item_amount:
            data.flitch_invoice_details.invoice_Details.total_item_amount,
          transporter_details:
            data.flitch_invoice_details.invoice_Details.transporter_details,
          gst_percentage:
            data.flitch_invoice_details.invoice_Details.gst_percentage,
          gst_val: data?.flitch_invoice_details?.invoice_Details?.gst_value,
          invoice_value_with_gst:
            data.flitch_invoice_details.invoice_Details.invoice_value_with_gst,
          invoice_remark: data.flitch_invoice_details.invoice_Details.remark,
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log('err creatig flitch excel => ', error.message);
      }
    });

    const filepath =
      'public/upload/reports/inventory/flitch/flitch-inventory-report.xlsx';
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Flitch-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/flitch/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log(
      'Attempting to rename file from',
      filepath,
      'to',
      destinationPath
    );

    console.log('link => ', link);
    // return res.json(new ApiResponse(200, "Excel created successfully...", link))
    return link;
  } catch (error) {
    throw new ApiError(500, error.message, error);
  }
};

/**
 * Create Inward Item Wise Stock Report Excel
 * @param {Array} aggregatedData - Aggregated stock data by item_name
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createInwardItemWiseStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/inventory/flitch';

    // Ensure folder exists
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Inward Item Wise Stock Report');

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
    let title = `Inward Item Wise Stock Details Between ${formattedStartDate} and ${formattedEndDate}`;
    if (filter?.item_name) {
      title = `Inward Item Wise Stock Details [ ${filter.item_name} ] Between ${formattedStartDate} and ${formattedEndDate}`;
    }

    console.log('Generated inward itemwise report title:', title);

    // Define columns (15 columns)
    const columnDefinitions = [
      { key: 'item_name', width: 25 },          // 1. ItemName
      { key: 'opening_stock_cmt', width: 15 },  // 2. Opening Stock CMT
      { key: 'invoice_cmt', width: 12 },        // 3. Invoice (ROUND LOG)
      { key: 'indian_cmt', width: 12 },         // 4. Indian (ROUND LOG)
      { key: 'actual_cmt', width: 12 },         // 5. Actual (ROUND LOG)
      { key: 'issue_for_cc', width: 15 },       // 6. Issue for CC
      { key: 'cc_received', width: 15 },        // 7. CC Received
      { key: 'diff', width: 12 },               // 8. Diff
      { key: 'flitching', width: 12 },          // 9. Flitching
      { key: 'sawing', width: 12 },             // 10. Sawing (placeholder)
      { key: 'wooden_tile', width: 15 },        // 11. Wooden Tile (placeholder)
      { key: 'unedge', width: 12 },             // 12. UnEdge (placeholder)
      { key: 'peel', width: 12 },               // 13. Peel
      { key: 'sales', width: 12 },              // 14. Sales
      { key: 'closing_stock_cmt', width: 15 },  // 15. Closing Stock CMT
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all 15 columns)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 15);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Group headers (merged cells for grouped columns)
    const groupHeaderRow = worksheet.addRow([
      '', // ItemName - no group
      '', // Opening Stock CMT - no group
      'ROUND LOG DETAIL CMT', // Columns 3-5
      '', // (part of ROUND LOG)
      '', // (part of ROUND LOG)
      'Cross Cut Details CMT', // Columns 6-8
      '', // (part of Cross Cut)
      '', // (part of Cross Cut)
      '', // Flitching - no group
      '', // Sawing - no group
      'CrossCut Log Issue For CMT', // Columns 11-14
      '', // (part of CrossCut Log Issue)
      '', // (part of CrossCut Log Issue)
      '', // (part of CrossCut Log Issue)
      '', // Closing Stock CMT - no group
    ]);
    groupHeaderRow.font = { bold: true };
    groupHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    groupHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Merge group headers
    worksheet.mergeCells(3, 3, 3, 5);   // ROUND LOG DETAIL CMT (cols 3-5)
    worksheet.mergeCells(3, 6, 3, 8);   // Cross Cut Details CMT (cols 6-8)
    worksheet.mergeCells(3, 11, 3, 14); // CrossCut Log Issue For CMT (cols 11-14)

    // Row 4: Column headers
    const headerRow = worksheet.addRow([
      'ItemName',
      'Opening Stock CMT',
      'Invoice',
      'Indian',
      'Actual',
      'Issue for CC',
      'CC Received',
      'Diff',
      'Flitching',
      'Sawing',
      'Wooden Tile',
      'UnEdge',
      'Peel',
      'Sales',
      'Closing Stock CMT',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Initialize grand totals
    const grandTotals = {
      opening_stock_cmt: 0,
      invoice_cmt: 0,
      indian_cmt: 0,
      actual_cmt: 0,
      issue_for_cc: 0,
      cc_received: 0,
      diff: 0,
      flitching: 0,
      sawing: 0,
      wooden_tile: 0,
      unedge: 0,
      peel: 0,
      sales: 0,
      closing_stock_cmt: 0,
    };

    // Sort data by item_name
    const sortedData = [...aggregatedData].sort((a, b) => {
      const nameA = a.item_name || '';
      const nameB = b.item_name || '';
      return nameA.localeCompare(nameB);
    });

    // Add data rows
    sortedData.forEach((item) => {
      const rowData = {
        item_name: item.item_name || '',
        opening_stock_cmt: parseFloat(item.opening_stock_cmt || 0).toFixed(3),
        invoice_cmt: parseFloat(item.invoice_cmt || 0).toFixed(3),
        indian_cmt: parseFloat(item.indian_cmt || 0).toFixed(3),
        actual_cmt: parseFloat(item.actual_cmt || 0).toFixed(3),
        issue_for_cc: parseFloat(item.issue_for_cc || 0).toFixed(3),
        cc_received: parseFloat(item.cc_received || 0).toFixed(3),
        diff: parseFloat(item.diff || 0).toFixed(3),
        flitching: parseFloat(item.flitching || 0).toFixed(3),
        sawing: parseFloat(item.sawing || 0).toFixed(3),
        wooden_tile: parseFloat(item.wooden_tile || 0).toFixed(3),
        unedge: parseFloat(item.unedge || 0).toFixed(3),
        peel: parseFloat(item.peel || 0).toFixed(3),
        sales: parseFloat(item.sales || 0).toFixed(3),
        closing_stock_cmt: parseFloat(item.closing_stock_cmt || 0).toFixed(3),
      };

      worksheet.addRow(rowData);

      // Accumulate grand totals
      grandTotals.opening_stock_cmt += parseFloat(item.opening_stock_cmt || 0);
      grandTotals.invoice_cmt += parseFloat(item.invoice_cmt || 0);
      grandTotals.indian_cmt += parseFloat(item.indian_cmt || 0);
      grandTotals.actual_cmt += parseFloat(item.actual_cmt || 0);
      grandTotals.issue_for_cc += parseFloat(item.issue_for_cc || 0);
      grandTotals.cc_received += parseFloat(item.cc_received || 0);
      grandTotals.diff += parseFloat(item.diff || 0);
      grandTotals.flitching += parseFloat(item.flitching || 0);
      grandTotals.sawing += parseFloat(item.sawing || 0);
      grandTotals.wooden_tile += parseFloat(item.wooden_tile || 0);
      grandTotals.unedge += parseFloat(item.unedge || 0);
      grandTotals.peel += parseFloat(item.peel || 0);
      grandTotals.sales += parseFloat(item.sales || 0);
      grandTotals.closing_stock_cmt += parseFloat(item.closing_stock_cmt || 0);
    });

    // Add grand total row
    const totalRow = worksheet.addRow({
      item_name: 'Total',
      opening_stock_cmt: grandTotals.opening_stock_cmt.toFixed(3),
      invoice_cmt: grandTotals.invoice_cmt.toFixed(3),
      indian_cmt: grandTotals.indian_cmt.toFixed(3),
      actual_cmt: grandTotals.actual_cmt.toFixed(3),
      issue_for_cc: grandTotals.issue_for_cc.toFixed(3),
      cc_received: grandTotals.cc_received.toFixed(3),
      diff: grandTotals.diff.toFixed(3),
      flitching: grandTotals.flitching.toFixed(3),
      sawing: grandTotals.sawing.toFixed(3),
      wooden_tile: grandTotals.wooden_tile.toFixed(3),
      unedge: grandTotals.unedge.toFixed(3),
      peel: grandTotals.peel.toFixed(3),
      sales: grandTotals.sales.toFixed(3),
      closing_stock_cmt: grandTotals.closing_stock_cmt.toFixed(3),
    });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // Save file
    const timeStamp = new Date().getTime();
    const fileName = `Inward-ItemWise-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Inward itemwise stock report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating inward itemwise stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};

/**
 * Create Flitch Stock Report Excel
 * @param {Array} aggregatedData - Aggregated stock data by item_name
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createFlitchStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/inventory/flitch';

    // Ensure folder exists
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Flitch Stock Report');

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

    // Build title with filters
    let title = `Itemwise Flitch between ${formattedStartDate} and ${formattedEndDate}`;
    if (filter?.item_name) {
      title = `Itemwise Flitch [ ${filter.item_name} ] between ${formattedStartDate} and ${formattedEndDate}`;
    }

    console.log('Generated report title:', title);

    // Define columns without headers (we'll add headers manually)
    const columnDefinitions = [
      { key: 'item_name', width: 30 },
      { key: 'physical_cmt', width: 15 },
      { key: 'cc_received', width: 15 },
      { key: 'op_bal', width: 15 },
      { key: 'flitch_received', width: 18 },
      { key: 'fl_issued', width: 15 },
      { key: 'fl_closing', width: 15 },
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Add title row (Row 1)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 7); // Merge across all 7 columns

    // Add empty row for spacing (Row 2)
    worksheet.addRow([]);

    // Add header row (Row 3)
    const headerRow = worksheet.addRow([
      'Item Name',
      'Physical CMT',
      'CC Received',
      'Op Bal',
      'Flitch Received',
      'Fl Issued',
      'FLClosing',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Initialize grand totals
    const grandTotals = {
      physical_cmt: 0,
      cc_received: 0,
      op_bal: 0,
      flitch_received: 0,
      fl_issued: 0,
      fl_closing: 0,
    };

    // Sort data by item_name
    const sortedData = [...aggregatedData].sort((a, b) => {
      const nameA = a.item_name || '';
      const nameB = b.item_name || '';
      return nameA.localeCompare(nameB);
    });

    // Add data rows
    sortedData.forEach((item) => {
      const rowData = {
        item_name: item.item_name || '',
        physical_cmt: parseFloat(item.physical_cmt || 0).toFixed(3),
        cc_received: parseFloat(item.cc_received || 0).toFixed(3),
        op_bal: parseFloat(item.op_bal || 0).toFixed(3),
        flitch_received: parseFloat(item.flitch_received || 0).toFixed(3),
        fl_issued: parseFloat(item.fl_issued || 0).toFixed(3),
        fl_closing: parseFloat(item.fl_closing || 0).toFixed(3),
      };

      worksheet.addRow(rowData);

      // Accumulate grand totals
      grandTotals.physical_cmt += parseFloat(item.physical_cmt || 0);
      grandTotals.cc_received += parseFloat(item.cc_received || 0);
      grandTotals.op_bal += parseFloat(item.op_bal || 0);
      grandTotals.flitch_received += parseFloat(item.flitch_received || 0);
      grandTotals.fl_issued += parseFloat(item.fl_issued || 0);
      grandTotals.fl_closing += parseFloat(item.fl_closing || 0);
    });

    // Add grand total row
    const totalRow = worksheet.addRow({
      item_name: 'Total',
      physical_cmt: grandTotals.physical_cmt.toFixed(3),
      cc_received: grandTotals.cc_received.toFixed(3),
      op_bal: grandTotals.op_bal.toFixed(3),
      flitch_received: grandTotals.flitch_received.toFixed(3),
      fl_issued: grandTotals.fl_issued.toFixed(3),
      fl_closing: grandTotals.fl_closing.toFixed(3),
    });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // Save file
    const timeStamp = new Date().getTime();
    const fileName = `Flitch-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Flitch stock report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating flitch stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};
