import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';
export const createMdfLogsExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/inventory/mdf';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('MDF-logs');
    const mdfColumns = [
      { header: 'Inward Sr No', key: 'inward_sr_no', width: 15 },
      { header: 'Inward Date', key: 'inward_date', width: 20 },
      { header: 'Item Sr No', key: 'item_sr_no', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'Supplier Item Name', key: 'supplier_item_name', width: 20 },
      { header: 'MDF Type', key: 'mdf_type', width: 20 },
      { header: 'MDF Sub Type', key: 'mdf_sub_type', width: 20 },
      { header: 'Pallet Number', key: 'pallet_number', width: 20 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 10 },
      { header: 'Sheets', key: 'sheets', width: 10 },
      { header: 'Total Sq Meter', key: 'total_sq_meter', width: 15 },
      { header: 'Rate in Currency', key: 'rate_in_currency', width: 20 },
      { header: 'Rate in INR', key: 'rate_in_inr', width: 20 },
      { header: 'Exchange Rate', key: 'exchange_rate', width: 15 }, // exchange rate added
      { header: 'GST Value', key: 'gst_val', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Remark', key: 'remark', width: 20 },
      //   { header: "Invoice ID", key: "invoice_id", width: 30 },

      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Updated Date', key: 'updatedAt', width: 20 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'No of Workers', key: 'no_of_workers', width: 15 },
      { header: 'Shift', key: 'shift', width: 10 },
      { header: 'Working Hours', key: 'working_hours', width: 15 },
      { header: 'Supplier Name', key: 'supplier_name', width: 30 },
      { header: 'Supplier Type', key: 'supplier_type', width: 20 },
      { header: 'Branch Name', key: 'branch_name', width: 25 },
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
      { header: 'Branch Address', key: 'address', width: 25 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Pincode', key: 'pincode', width: 15 },
      { header: 'GST Number', key: 'gst_number', width: 20 },
      { header: 'Web URL', key: 'web_url', width: 25 },
      { header: 'Invoice Date', key: 'invoice_date', width: 20 },
      { header: 'Invoice No', key: 'invoice_no', width: 20 },
      { header: 'Total Item Amount', key: 'total_item_amount', width: 20 },
      { header: 'Transporter Details', key: 'transporter_details', width: 30 },
      { header: 'GST Percentage', key: 'gst_percentage', width: 20 },
      {
        header: 'Invoice Value with GST',
        key: 'invoice_value_with_gst',
        width: 20,
      },
      { header: 'Invoice Remark', key: 'invoice_remark', width: 20 },
    ];

    worksheet.columns = mdfColumns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        // let contactPersonData = [];

        // data?.supplier_details?.branch_detail?.contact_person?.forEach((cp) => {
        //   contactPersonData.push({
        //     contact_person_name: cp.name,
        //     contact_person_email: cp.email,
        //     contact_person_mobile_number: cp.mobile_number,
        //     contact_person_designation: cp.designation,
        //   });
        // });

        // const contactPersonNames = contactPersonData
        //   .map((cp) => cp.contact_person_name)
        //   .join(", ");
        // const contactPersonEmails = contactPersonData
        //   .map((cp) => cp.contact_person_email)
        //   .join(", ");
        // const contactPersonMobileNumbers = contactPersonData
        //   .map((cp) => cp.contact_person_mobile_number)
        //   .join(", ");
        // const contactPersonDesignations = contactPersonData
        //   .map((cp) => cp.contact_person_designation)
        //   .join(", ");

        const rowData = {
          inward_sr_no: data?.mdf_invoice_details?.inward_sr_no || '',
          inward_date: data?.mdf_invoice_details?.inward_date || '',
          item_sr_no: data?.item_sr_no || '',
          item_name: data?.item_name || '',
          supplier_item_name: data?.supplier_item_name || '',
          mdf_type: data?.mdf_type || '',
          mdf_sub_type: data?.item_sub_category_name || '',
          pallet_number: data?.pallet_number || '',
          length: data?.length || '',
          width: data?.width || '',
          thickness: data?.thickness || '',
          sheets: data?.sheets || '',
          total_sq_meter: data?.total_sq_meter || '',
          rate_in_currency: data?.rate_in_currency || '',
          rate_in_inr: data?.rate_in_inr || '',
          exchange_rate: data?.exchange_rate || '',
          gst_val: data?.mdf_invoice_details?.invoice_Details?.gst_value || '',
          amount: data?.amount || '',
          remark: data?.remark || '',
          createdAt: data?.createdAt || '',
          updatedAt: data?.updatedAt || '',
          currency: data?.mdf_invoice_details?.currency || '',
          no_of_workers: data?.workers_details?.no_of_workers || '',
          shift: data?.workers_details?.shift || '',
          working_hours: data?.workers_details?.working_hours || '',
          supplier_name:
            data?.supplier_details?.company_details?.supplier_name || '',
          supplier_type:
            data?.supplier_details?.company_details?.supplier_type || '',
          branch_name: data?.supplier_details?.branch_detail?.branch_name || '',
          contact_person_name:
            data?.mdf_invoice_details?.supplier_details?.branch_detail
              ?.contact_person?.[0]?.name || '',
          contact_person_email:
            data?.mdf_invoice_details?.supplier_details?.branch_detail
              ?.contact_person?.[0]?.email || '',
          contact_person_mobile_no:
            data?.mdf_invoice_details?.supplier_details?.branch_detail
              ?.contact_person?.[0]?.mobile_number || '',
          contact_person_designation:
            data?.mdf_invoice_details?.supplier_details?.branch_detail
              ?.contact_person?.[0]?.designation || '',
          address: data?.supplier_details?.branch_detail?.address || '',
          city: data?.supplier_details?.branch_detail?.city || '',
          state: data?.supplier_details?.branch_detail?.state || '',
          country: data?.supplier_details?.branch_detail?.country || '',
          pincode: data?.supplier_details?.branch_detail?.pincode || '',
          gst_number: data?.supplier_details?.branch_detail?.gst_number || '',
          web_url: data?.supplier_details?.branch_detail?.web_url || '',
          invoice_date: data?.invoice_Details?.invoice_date || '',
          invoice_no: data?.invoice_Details?.invoice_no || '',
          total_item_amount: data?.invoice_Details?.total_item_amount || '',
          transporter_details: data?.invoice_Details?.transporter_details || '',
          gst_percentage: data?.invoice_Details?.gst_percentage || '',
          invoice_value_with_gst:
            data?.invoice_Details?.invoice_value_with_gst || '',
          invoice_remark: data?.invoice_Details?.remark || '',
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log('Error creating mdf excel => ', error.message);
      }
    });

    const filepath =
      'public/upload/reports/inventory/mdf/mdf-inventory-report.xlsx';
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `MDF-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/mdf/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log('link => ', link);
    return link;
  } catch (error) {
    throw new ApiError(500, error.message, error);
  }
};

export const createMdfHistoryExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/inventory/mdf';

    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('MDF-Logs-History');

    const columns = [
      { header: 'Inward Sr No', key: 'inward_sr_no', width: 15 },
      { header: 'Inward Date', key: 'inward_date', width: 20 },
      { header: 'Item Sr No', key: 'item_sr_no', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'MDF Type', key: 'mdf_type', width: 15 },
      { header: 'MDF Sub Type', key: 'mdf_sub_type', width: 20 },
      { header: 'Pallet Number', key: 'pallet_number', width: 15 },
      { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 15 },
      { header: 'Issued Amount', key: 'issued_amount', width: 15 },
      { header: 'Total Sq Meter', key: 'total_sq_meter', width: 18 },
      { header: 'Rate in INR', key: 'rate_in_inr', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Remark', key: 'remark', width: 25 },
      { header: 'Created By', key: 'created_by', width: 20 },
      { header: 'Updated By', key: 'updated_by', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];

    worksheet.columns = columns;

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        const item = data?.mdf_item_details || {};
        const invoice = item?.mdf_invoice_details || {};

        const rowData = {
          inward_sr_no: invoice?.inward_sr_no || '',
          inward_date: invoice?.inward_date
            ? new Date(invoice.inward_date).toLocaleDateString()
            : '',
          item_sr_no: item?.item_sr_no || '',
          item_name: item?.item_name || '',
          mdf_type: item?.mdf_type || '',
          mdf_sub_type: item?.item_sub_category_name || '',
          pallet_number: item?.pallet_number || '',
          issued_sheets: data?.issued_sheets || '',
          issued_sqm: data?.issued_sqm || '',
          issued_amount: data?.issued_amount || '',
          total_sq_meter: item?.total_sq_meter || '',
          rate_in_inr: item?.rate_in_inr || '',
          amount: item?.amount || '',
          remark: item?.remark || '',
          created_by:
            data?.created_user_details?.first_name +
              ' ' +
              data?.created_user_details?.last_name || '',
          updated_by:
            data?.updated_user_details?.first_name +
              ' ' +
              data?.updated_user_details?.last_name || '',
          createdAt: data?.createdAt
            ? new Date(data.createdAt).toLocaleString()
            : '',
          updatedAt: data?.updatedAt
            ? new Date(data.updatedAt).toLocaleString()
            : '',
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log('Error writing row to MDF history Excel =>', error.message);
      }
    });

    const timeStamp = new Date().getTime();
    const fileName = `mdf_logs_history_${timeStamp}.xlsx`;
    const filePath = `public/upload/reports/inventory/mdf/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const link = `${process.env.APP_URL}${filePath}`;
    console.log('History Excel Link =>', link);
    return link;
  } catch (error) {
    throw new ApiError(500, error.message, error);
  }
};

export const createMdfStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/inventory/mdf';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('MDF Stock Report');

    // Format dates to DD/MM/YYYY
    const formatDate = (dateStr) => {
      try {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // Return original if invalid
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (error) {
        console.error('Error formatting date:', error);
        return dateStr || 'N/A';
      }
    };

    // Build title with filter information
    let title = 'MDF Type';
    
    if (filters && filters.item_sub_category_name) {
      title += ` [ ${filters.item_sub_category_name} ]`;
    } else {
      title += ' [ ALL ]';
    }
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    title += `   stock  in the period  ${formattedStartDate} and ${formattedEndDate}`;

    console.log('Generated MDF report title:', title); // Debug log

    // Define columns WITHOUT headers (only keys and widths)
    const columnDefinitions = [
      { key: 'mdf_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_sheets', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_sheets', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_sheets', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'sales_sheets', width: 12 },
      { key: 'sales_sqm', width: 12 },
      { key: 'issue_pressing_sheets', width: 20 },
      { key: 'issue_pressing_sqm', width: 20 },
      { key: 'closing_sheets', width: 12 },
      { key: 'closing_sqm', width: 12 },
    ];

    // Set columns (NO headers in definition, so Row 1 won't be touched)
    worksheet.columns = columnDefinitions;

    // Add title row manually
    const filterRow = worksheet.addRow([title]);
    filterRow.font = { bold: true, size: 12 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    filterRow.height = 20; // Set sufficient height for title
    worksheet.mergeCells(1, 1, 1, 15); // Merge across all columns

    // Add empty row for spacing
    worksheet.addRow([]);

    // Add header row manually (row 3)
    const headerRow = worksheet.addRow([
      'MDF Sub Type',
      'Thickness',
      'Size',
      'Opening',
      'Op Metres',
      'Receive',
      'Rec Mtrs',
      'Consume',
      'Cons Mtrs',
      'Sales',
      'Sales Mtrs',
      'Issue For Pressing',
      'Issue For Pressing Sq Met',
      'Closing',
      'Cl Metres',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Group data by mdf_sub_type, then thickness
    const groupedData = {};
    aggregatedData.forEach((item) => {
      const subType = item.mdf_sub_type || 'OTHER';
      const thickness = item.thickness || 0;

      if (!groupedData[subType]) {
        groupedData[subType] = {};
      }
      if (!groupedData[subType][thickness]) {
        groupedData[subType][thickness] = [];
      }
      groupedData[subType][thickness].push(item);
    });

    // Initialize grand totals
    const grandTotals = {
      opening_sheets: 0,
      opening_sqm: 0,
      receive_sheets: 0,
      receive_sqm: 0,
      consume_sheets: 0,
      consume_sqm: 0,
      sales_sheets: 0,
      sales_sqm: 0,
      issue_pressing_sheets: 0,
      issue_pressing_sqm: 0,
      closing_sheets: 0,
      closing_sqm: 0,
    };

    // Add data rows with hierarchy
    Object.keys(groupedData)
      .sort()
      .forEach((subType) => {
        const thicknesses = groupedData[subType];

        Object.keys(thicknesses)
          .sort((a, b) => parseFloat(a) - parseFloat(b))
          .forEach((thickness) => {
            const items = thicknesses[thickness];

            // Thickness totals
            const thicknessTotals = {
              opening_sheets: 0,
              opening_sqm: 0,
              receive_sheets: 0,
              receive_sqm: 0,
              consume_sheets: 0,
              consume_sqm: 0,
              sales_sheets: 0,
              sales_sqm: 0,
              issue_pressing_sheets: 0,
              issue_pressing_sqm: 0,
              closing_sheets: 0,
              closing_sqm: 0,
            };

            // Add each item row
            items.forEach((item) => {
              const rowData = {
                mdf_sub_type: item.mdf_sub_type || '',
                thickness: item.thickness || 0,
                size: item.size || '',
                opening_sheets: item.opening_sheets || 0,
                opening_sqm: item.opening_sqm || 0,
                receive_sheets: item.receive_sheets || 0,
                receive_sqm: item.receive_sqm || 0,
                consume_sheets: item.consume_sheets || 0,
                consume_sqm: item.consume_sqm || 0,
                sales_sheets: item.sales_sheets || 0,
                sales_sqm: item.sales_sqm || 0,
                issue_pressing_sheets: item.issue_pressing_sheets || 0,
                issue_pressing_sqm: item.issue_pressing_sqm || 0,
                closing_sheets: item.closing_sheets || 0,
                closing_sqm: item.closing_sqm || 0,
              };

              worksheet.addRow(rowData);

              // Accumulate thickness totals
              Object.keys(thicknessTotals).forEach((key) => {
                thicknessTotals[key] += rowData[key] || 0;
              });
            });

            // Add thickness total row
            const thicknessTotalRow = worksheet.addRow({
              mdf_sub_type: '',
              thickness: '',
              size: 'Total',
              ...thicknessTotals,
            });
            thicknessTotalRow.eachCell((cell) => {
              cell.font = { bold: true };
            });

            // Accumulate grand totals
            Object.keys(grandTotals).forEach((key) => {
              grandTotals[key] += thicknessTotals[key];
            });
          });
      });

    // Add grand total row
    const grandTotalRow = worksheet.addRow({
      mdf_sub_type: 'Total',
      thickness: '',
      size: '',
      ...grandTotals,
    });
    grandTotalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // Save file
    const timeStamp = new Date().getTime();
    const fileName = `MDF-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('MDF stock report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating MDF stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};
