import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

export const createFaceLogsExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/inventory/face';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('face-logs');
    const columns = [
      { header: 'Inward Sr No', key: 'inward_sr_no', width: 15 },
      { header: 'Item Sr No', key: 'item_sr_no', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'Supplier Item Name', key: 'supplier_item_name', width: 20 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 10 },
      { header: 'Number of Sheets', key: 'number_of_sheets', width: 20 },
      { header: 'Total Sq Meter', key: 'total_sq_meter', width: 20 },
      { header: 'Grade Name', key: 'grade_name', width: 15 },
      { header: 'Rate in Currency', key: 'rate_in_currency', width: 20 },
      { header: 'Rate in INR', key: 'rate_in_inr', width: 20 },
      { header: 'Exchange Rate', key: 'exchange_rate', width: 20 },
      { header: 'GST Value', key: 'gst_val', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },

      { header: 'Inward Date', key: 'inward_date', width: 20 },

      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'No of Workers', key: 'no_of_workers', width: 15 },
      { header: 'Shift', key: 'shift', width: 10 },
      { header: 'Working Hours', key: 'working_hours', width: 15 },
      { header: 'Supplier Name', key: 'supplier_name', width: 30 },
      { header: 'Supplier Type', key: 'supplier_type', width: 20 },
      { header: 'Branch Name', key: 'branch_name', width: 25 },
      { header: 'Branch Address', key: 'address', width: 25 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Pincode', key: 'pincode', width: 15 },
      { header: 'GST Number', key: 'gst_number', width: 20 },
      { header: 'Web URL', key: 'web_url', width: 25 },
      { header: 'Invoice No', key: 'invoice_no', width: 20 },
      { header: 'Total Item Amount', key: 'total_item_amount', width: 20 },
      { header: 'Transporter Details', key: 'transporter_details', width: 30 },
      { header: 'GST Percentage', key: 'gst_percentage', width: 20 },
      {
        header: 'Invoice Value with GST',
        key: 'invoice_value_with_gst',
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
      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Updated Date', key: 'updatedAt', width: 20 },
      { header: 'Remark', key: 'remark', width: 20 },
    ];

    worksheet.columns = columns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        const rowData = {
          supplier_item_name: data.supplier_item_name,
          item_sr_no: data.item_sr_no,
          item_name: data.item_name,
          length: data.length,
          width: data.width,
          thickness: data.thickness,
          number_of_sheets: data.number_of_sheets,
          total_sq_meter: data.total_sq_meter,
          grade_name: data.grade_name,
          rate_in_currency: data.rate_in_currency,
          rate_in_inr: data.rate_in_inr,
          exchange_rate: data.exchange_rate,

          amount: data.amount,
          remark: data.remark,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          inward_sr_no: data.face_invoice_details.inward_sr_no,
          inward_date: data.face_invoice_details.inward_date,
          currency: data.face_invoice_details.currency,
          no_of_workers:
            data.face_invoice_details.workers_details.no_of_workers,
          shift: data.face_invoice_details.workers_details.shift,
          working_hours:
            data.face_invoice_details.workers_details.working_hours,
          supplier_name:
            data.face_invoice_details.supplier_details.company_details
              .supplier_name,
          supplier_type:
            data.face_invoice_details.supplier_details.company_details.supplier_type.join(
              ', '
            ),
          branch_name:
            data.face_invoice_details.supplier_details.branch_detail
              .branch_name,
          address:
            data.face_invoice_details.supplier_details.branch_detail.address,
          city: data.face_invoice_details.supplier_details.branch_detail.city,
          state: data.face_invoice_details.supplier_details.branch_detail.state,
          country:
            data.face_invoice_details.supplier_details.branch_detail.country,
          pincode:
            data.face_invoice_details.supplier_details.branch_detail.pincode,
          gst_number:
            data.face_invoice_details.supplier_details.branch_detail.gst_number,
          web_url:
            data.face_invoice_details.supplier_details.branch_detail.web_url,
          contact_person_name:
            data.face_invoice_details.supplier_details.branch_detail
              .contact_person[0].name,
          contact_person_email:
            data.face_invoice_details.supplier_details.branch_detail
              .contact_person[0].email,
          contact_person_designation:
            data.face_invoice_details.supplier_details.branch_detail
              .contact_person[0].designation,
          contact_person_mobile_no:
            data.face_invoice_details.supplier_details.branch_detail
              .contact_person[0].mobile_number,
          invoice_date:
            data?.face_invoice_details?.invoice_Details.invoice_date,
          // invoice_no: data?.core_invoice_details?.invoice_Details.invoice_no,
          invoice_no: data.face_invoice_details.invoice_Details.invoice_no,
          total_item_amount:
            data.face_invoice_details.invoice_Details.total_item_amount,
          transporter_details:
            data.face_invoice_details.invoice_Details.transporter_details,
          gst_percentage:
            data.face_invoice_details.invoice_Details.gst_percentage,
          gst_val: data?.face_invoice_details?.invoice_Details?.gst_value,
          invoice_value_with_gst:
            data.face_invoice_details.invoice_Details.invoice_value_with_gst,
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log('Error creating face logs Excel => ', error.message);
      }
    });

    const filepath =
      'public/upload/reports/inventory/face/face-inventory-report.xlsx';
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Face-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/face/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log('File renamed from', filepath, 'to', destinationPath);

    return link;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

export const createFaceHistoryExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/history/face';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('face-history');

    const columns = [
      { header: 'Inward Sr No', key: 'inward_sr_no', width: 15 },
      { header: 'Item Sr No', key: 'item_sr_no', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'Supplier Item Name', key: 'supplier_item_name', width: 20 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 10 },
      { header: 'Number of Sheets', key: 'number_of_sheets', width: 20 },
      { header: 'Total Sq Meter', key: 'total_sq_meter', width: 20 },
      { header: 'Grade Name', key: 'grade_name', width: 15 },
      { header: 'Rate in Currency', key: 'rate_in_currency', width: 20 },
      { header: 'Rate in INR', key: 'rate_in_inr', width: 20 },
      { header: 'Exchange Rate', key: 'exchange_rate', width: 20 },
      { header: 'GST Value', key: 'gst_val', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },

      { header: 'Inward Date', key: 'inward_date', width: 20 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'No of Workers', key: 'no_of_workers', width: 15 },
      { header: 'Shift', key: 'shift', width: 10 },
      { header: 'Working Hours', key: 'working_hours', width: 15 },

      { header: 'Supplier Name', key: 'supplier_name', width: 30 },
      { header: 'Supplier Type', key: 'supplier_type', width: 20 },
      { header: 'Branch Name', key: 'branch_name', width: 25 },
      { header: 'Branch Address', key: 'address', width: 25 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Pincode', key: 'pincode', width: 15 },
      { header: 'GST Number', key: 'gst_number', width: 20 },
      { header: 'Web URL', key: 'web_url', width: 25 },

      { header: 'Invoice No', key: 'invoice_no', width: 20 },
      { header: 'Total Item Amount', key: 'total_item_amount', width: 20 },
      { header: 'Transporter Details', key: 'transporter_details', width: 30 },
      { header: 'GST Percentage', key: 'gst_percentage', width: 20 },
      {
        header: 'Invoice Value with GST',
        key: 'invoice_value_with_gst',
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

      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Updated Date', key: 'updatedAt', width: 20 },
      { header: 'Remark', key: 'remark', width: 20 },
    ];

    worksheet.columns = columns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        const rowData = {
          inward_sr_no:
            data?.face_item_details?.face_invoice_details?.inward_sr_no,
          inward_date:
            data?.face_item_details?.face_invoice_details?.inward_date,
          currency: data?.face_item_details?.face_invoice_details?.currency,
          no_of_workers: data?.face_item_details?.no_of_workers,
          shift: data?.face_item_details?.shift,
          working_hours: data?.face_item_details?.working_hours,

          item_sr_no: data?.face_item_details?.item_sr_no,
          item_name: data?.face_item_details?.item_name,
          supplier_item_name: data?.face_item_details?.supplier_item_name,
          length: data?.face_item_details?.length,
          width: data?.face_item_details?.width,
          thickness: data?.face_item_details?.thickness,
          number_of_sheets: data?.face_item_details?.number_of_sheets,
          total_sq_meter: data?.face_item_details?.total_sq_meter,
          grade_name: data?.face_item_details?.grade_name,
          rate_in_currency: data?.face_item_details?.rate_in_currency,
          rate_in_inr: data?.face_item_details?.rate_in_inr,
          exchange_rate: data?.face_item_details?.exchange_rate,
          gst_val:
            data?.face_item_details?.face_invoice_details?.invoice_Details
              ?.gst_value,
          amount: data?.face_item_details?.amount,
          remark: data?.face_item_details?.remark,
          createdAt: data?.createdAt,
          updatedAt: data?.updatedAt,

          supplier_name: data?.face_item_details?.supplier_name,
          supplier_type: Array.isArray(data?.face_item_details?.supplier_type)
            ? data?.face_item_details?.supplier_type.join(', ')
            : data?.face_item_details?.supplier_type,
          branch_name: data?.face_item_details?.branch_name,
          address: data?.face_item_details?.branch_address,
          city: data?.face_item_details?.city,
          state: data?.face_item_details?.state,
          country: data?.face_item_details?.country,
          pincode: data?.face_item_details?.pincode,
          gst_number: data?.face_item_details?.gst_number,
          web_url: data?.face_item_details?.web_url,

          contact_person_name: data?.face_item_details?.contact_person_name,
          contact_person_email: data?.face_item_details?.contact_person_email,
          contact_person_mobile_no:
            data?.face_item_details?.contact_person_mobile,
          contact_person_designation:
            data?.face_item_details?.contact_person_designation,

          invoice_no: data?.face_item_details?.invoice_Details?.invoice_no,
          total_item_amount:
            data?.face_item_details?.invoice_Details?.total_item_amount,
          transporter_details:
            data?.face_item_details?.invoice_Details?.transporter_details,
          gst_percentage:
            data?.face_item_details?.invoice_Details?.gst_percentage,
          invoice_value_with_gst:
            data?.face_item_details?.invoice_Details?.invoice_value_with_gst,
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.error(
          'Error writing row to face history Excel:',
          error.message
        );
      }
    });

    const filepath = `${folderPath}/face-history-temp.xlsx`;
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Face-History-report-${timeStamp}.xlsx`;

    const destinationPath = `${folderPath}/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log('File written to:', destinationPath);

    return link;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

/**
 * Create Face Stock Report Excel
 * @param {Array} aggregatedData - Aggregated stock data by item_name and thickness
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} filter - Optional filters applied
 * @returns {String} Download link for the generated Excel file
 */
export const createFaceStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filter = {}
) => {
  try {
    const folderPath = 'public/upload/reports/inventory/face';

    // Ensure folder exists
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Face Stock Report');

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
    let title = `Core face Stock between ${formattedStartDate} and ${formattedEndDate}`;
    if (filter?.item_name) {
      title = `Core face Stock [ ${filter.item_name} ] between ${formattedStartDate} and ${formattedEndDate}`;
    }

    console.log('Generated face stock report title:', title);

    // Define columns (6 columns)
    const columnDefinitions = [
      { key: 'item_name', width: 30 },
      { key: 'thickness', width: 15 },
      { key: 'opening_balance', width: 18 },
      { key: 'received_metres', width: 18 },
      { key: 'issued_metres', width: 18 },
      { key: 'closing_bal', width: 18 },
    ];

    // Set columns
    worksheet.columns = columnDefinitions;

    // Row 1: Title row (merged across all 6 columns)
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    titleRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 6);

    // Row 2: Empty row for spacing
    worksheet.addRow([]);

    // Row 3: Column headers
    const headerRow = worksheet.addRow([
      'Item name',
      'Thickness',
      'Opening Balance',
      'Received Metres',
      'Issued Metres',
      'Closing Bal',
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
      opening_balance: 0,
      received_metres: 0,
      issued_metres: 0,
      closing_bal: 0,
    };

    // Group data by item_name
    const groupedData = {};
    aggregatedData.forEach((item) => {
      const itemName = item.item_name || 'UNKNOWN';
      if (!groupedData[itemName]) {
        groupedData[itemName] = [];
      }
      groupedData[itemName].push(item);
    });

    // Sort item names alphabetically
    const sortedItemNames = Object.keys(groupedData).sort();

    // Add data rows grouped by item_name
    sortedItemNames.forEach((itemName) => {
      const items = groupedData[itemName];
      
      // Sort items by thickness within each group
      items.sort((a, b) => (a.thickness || 0) - (b.thickness || 0));

      // Initialize subtotals for this item
      const subtotals = {
        opening_balance: 0,
        received_metres: 0,
        issued_metres: 0,
        closing_bal: 0,
      };

      // Add rows for each thickness
      items.forEach((item) => {
        const rowData = {
          item_name: itemName,
          thickness: parseFloat(item.thickness || 0).toFixed(2),
          opening_balance: parseFloat(item.opening_balance || 0).toFixed(2),
          received_metres: parseFloat(item.received_metres || 0).toFixed(2),
          issued_metres: parseFloat(item.issued_metres || 0).toFixed(2),
          closing_bal: parseFloat(item.closing_bal || 0).toFixed(2),
        };

        worksheet.addRow(rowData);

        // Accumulate subtotals
        subtotals.opening_balance += parseFloat(item.opening_balance || 0);
        subtotals.received_metres += parseFloat(item.received_metres || 0);
        subtotals.issued_metres += parseFloat(item.issued_metres || 0);
        subtotals.closing_bal += parseFloat(item.closing_bal || 0);
      });

      // Add subtotal row for this item
      const subtotalRow = worksheet.addRow({
        item_name: '',
        thickness: 'Total',
        opening_balance: subtotals.opening_balance.toFixed(2),
        received_metres: subtotals.received_metres.toFixed(2),
        issued_metres: subtotals.issued_metres.toFixed(2),
        closing_bal: subtotals.closing_bal.toFixed(2),
      });
      subtotalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' },
        };
      });

      // Accumulate grand totals
      grandTotals.opening_balance += subtotals.opening_balance;
      grandTotals.received_metres += subtotals.received_metres;
      grandTotals.issued_metres += subtotals.issued_metres;
      grandTotals.closing_bal += subtotals.closing_bal;
    });

    // Add grand total row
    const totalRow = worksheet.addRow({
      item_name: '',
      thickness: 'Total',
      opening_balance: grandTotals.opening_balance.toFixed(2),
      received_metres: grandTotals.received_metres.toFixed(2),
      issued_metres: grandTotals.issued_metres.toFixed(2),
      closing_bal: grandTotals.closing_bal.toFixed(2),
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
    const fileName = `Face-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Face stock report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating face stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};
