import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

export const GenerateOtherGoodsLogs = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/inventory/othergoods';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('othergood-logs');

    const OtherGoodsColumns = [
      { header: 'Inward Sr No', key: 'inward_sr_no', width: 15 },
      { header: 'Inward Date', key: 'inward_date', width: 15 },
      { header: 'Item Sr No', key: 'item_sr_no', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'Item Description', key: 'item_description', width: 20 },
      { header: 'Item Subcategory', key: 'subcategory_name', width: 20 },
      { header: 'Department Name', key: 'department_name', width: 25 },
      { header: 'Machine Name', key: 'machine_name', width: 25 },
      { header: 'Brand Name', key: 'brand_name', width: 15 },
      { header: 'Total Quantity', key: 'total_quantity', width: 15 },
      { header: 'Rate In Currency', key: 'rate_in_currency', width: 20 },
      { header: 'Exchange Rate', key: 'exchange_rate', width: 15 },
      { header: 'Rate in INR', key: 'rate_in_inr', width: 15 },

      { header: 'Amount', key: 'amount', width: 20 },
      { header: 'Supplier Name', key: 'supplier_name', width: 25 },
      { header: 'Supplier Type', key: 'supplier_type', width: 20 },
      { header: 'Contact Person Name', key: 'contact_person_name', width: 25 },
      {
        header: 'Contact Person Email',
        key: 'contact_person_email',
        width: 25,
      },
      {
        header: 'Contact Person Designation',
        key: 'contact_person_designation',
        width: 25,
      },
      {
        header: 'Contact Person Mobile Number',
        key: 'contact_person_mobile_no',
        width: 25,
      },
      { header: 'Invoice Date', key: 'invoice_date', width: 20 },
      { header: 'Invoice No', key: 'invoice_no', width: 20 },
      { header: 'Total Item Amount', key: 'total_item_amount', width: 20 },
      { header: 'Transporter Details', key: 'transporter_details', width: 30 },
      { header: 'GST Percentage', key: 'gst_percentage', width: 20 },
      { header: 'GST Value', key: 'gst_val', width: 15 },
      {
        header: 'Invoice Value with GST',
        key: 'invoice_value_with_gst',
        width: 20,
      },

      { header: 'Remark', key: 'remark', width: 20 },
    ];

    worksheet.columns = OtherGoodsColumns;

    newData.forEach((data) => {
      // data.othergoods_invoice_details.supplier_details.branch_detail.contact_person.forEach(
      //   (person) => {
      worksheet.addRow({
        inward_sr_no: data?.othergoods_invoice_details?.inward_sr_no,
        inward_date: data?.othergoods_invoice_details?.inward_date,
        item_sr_no: data?.item_sr_no,
        item_name: data?.item_name,
        item_description: data?.item_description,
        subcategory_name: data?.item_sub_category_name,
        department_name: data?.department_name,
        machine_name: data?.machine_name,
        brand_name: data?.brand_name,
        total_quantity: data?.total_quantity,
        rate_in_currency: data?.rate_in_currency || '-',
        exchange_rate: data?.exchange_rate || '-',
        rate_in_inr: data?.rate_in_inr || '-',
        amount: data?.amount,
        supplier_name:
          data?.othergoods_invoice_details?.supplier_details?.company_details
            .supplier_name,
        supplier_type:
          data?.othergoods_invoice_details?.supplier_details?.company_details
            .supplier_type,
        contact_person_name:
          data?.othergoods_invoice_details?.supplier_details?.branch_detail
            ?.contact_person[0]?.name,
        contact_person_email:
          data?.othergoods_invoice_details?.supplier_details?.branch_detail
            ?.contact_person[0]?.email,
        contact_person_designation:
          data?.othergoods_invoice_details?.supplier_details?.branch_detail
            ?.contact_person[0]?.designation,
        contact_person_mobile_no:
          data?.othergoods_invoice_details?.supplier_details?.branch_detail
            ?.contact_person[0]?.mobile_number,
        // invoice_no:
        //   data?.othergoods_invoice_details?.invoice_Details?.invoice_no,
        // invoice_date: new Date(
        //   data?.othergoods_invoice_details?.invoice_Details?.invoice_date
        // ).toLocaleDateString(),
        invoice_date:
          data?.othergoods_invoice_details?.invoice_Details.invoice_date,
        invoice_no:
          data?.othergoods_invoice_details?.invoice_Details.invoice_no,
        total_item_amount:
          data?.othergoods_invoice_details?.invoice_Details.total_item_amount,
        transporter_details:
          data?.othergoods_invoice_details?.invoice_Details.transporter_details,
        gst_percentage:
          data?.othergoods_invoice_details?.invoice_Details.gst_percentage,
        gst_val: data?.othergoods_invoice_details?.invoice_Details?.gst_value,
        invoice_value_with_gst:
          data?.othergoods_invoice_details?.invoice_Details
            .invoice_value_with_gst,
        remark: data?.remark,
      });
    });
    // });

    const filepath =
      'public/upload/reports/inventory/othergoods/othergoods-inventory-report.xlsx';
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `OTHERGOODS-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/othergoods/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log('link => ', link);
    return link;
  } catch (error) {
    throw new ApiError('Error generating Excel file', 500, error);
  }
};

export const GenerateOtherGoodsLogsHistory = async (newData) => {
  try {
    console.log(
      'Received newData for generating other goods logs:',
      JSON.stringify(newData, null, 2)
    );

    const folderPath = 'public/upload/reports/inventory/othergoods';

    // Ensure the folder exists
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('othergood-logs');

    // Define worksheet columns
    worksheet.columns = [
      { header: 'Inward Sr No', key: 'inward_sr_no', width: 15 },
      { header: 'Inward Date', key: 'inward_date', width: 15 },
      { header: 'Item Sr No', key: 'item_sr_no', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'Item Description', key: 'item_description', width: 20 },
      { header: 'Item Subcategory', key: 'subcategory_name', width: 20 },
      { header: 'Department Name', key: 'department_name', width: 25 },
      { header: 'Machine Name', key: 'machine_name', width: 25 },
      { header: 'Brand Name', key: 'brand_name', width: 15 },
      { header: 'Total Quantity', key: 'total_quantity', width: 15 },
      { header: 'Rate In Currency', key: 'rate_in_currency', width: 20 },
      { header: 'Exchange Rate', key: 'exchange_rate', width: 15 },
      { header: 'Rate in INR', key: 'rate_in_inr', width: 15 },
      { header: 'Amount', key: 'amount', width: 20 },
      { header: 'Supplier Name', key: 'supplier_name', width: 25 },
      { header: 'Supplier Type', key: 'supplier_type', width: 20 },
      { header: 'Contact Person Name', key: 'contact_person_name', width: 25 },
      {
        header: 'Contact Person Email',
        key: 'contact_person_email',
        width: 25,
      },
      {
        header: 'Contact Person Designation',
        key: 'contact_person_designation',
        width: 25,
      },
      {
        header: 'Contact Person Mobile Number',
        key: 'contact_person_mobile_no',
        width: 25,
      },
      { header: 'Invoice Date', key: 'invoice_date', width: 20 },
      { header: 'Invoice No', key: 'invoice_no', width: 20 },
      { header: 'Total Item Amount', key: 'total_item_amount', width: 20 },
      { header: 'Transporter Details', key: 'transporter_details', width: 30 },
      { header: 'GST Percentage', key: 'gst_percentage', width: 20 },
      { header: 'GST Value', key: 'gst_val', width: 15 },
      {
        header: 'Invoice Value with GST',
        key: 'invoice_value_with_gst',
        width: 20,
      },
      { header: 'Remark', key: 'remark', width: 20 },
    ];

    // Add data rows
    newData.forEach((data, index) => {
      const itemDetails = data?.other_goods_item_details || {};
      const invoiceDetails =
        itemDetails?.othergoods_invoice_details?.invoice_Details || {};
      const supplierDetails =
        itemDetails?.othergoods_invoice_details?.supplier_details
          ?.company_details || {};
      const contactPerson =
        itemDetails?.othergoods_invoice_details?.supplier_details?.branch_detail
          ?.contact_person?.[0] || {};

      const rowData = {
        inward_sr_no:
          itemDetails?.othergoods_invoice_details?.inward_sr_no || '',
        inward_date: itemDetails?.othergoods_invoice_details?.inward_date || '',
        item_sr_no: itemDetails?.item_sr_no || '',
        item_name: itemDetails?.item_name || '',
        item_description: itemDetails?.item_description || '',
        subcategory_name: itemDetails?.item_sub_category_name || '',
        department_name: itemDetails?.department_name || '',
        machine_name: itemDetails?.machine_name || '',
        brand_name: itemDetails?.brand_name || '',
        total_quantity: itemDetails?.total_quantity ?? '',
        rate_in_currency: itemDetails?.rate_in_currency ?? '',
        exchange_rate: itemDetails?.exchange_rate ?? '',
        rate_in_inr: itemDetails?.rate_in_inr ?? '',
        amount: itemDetails?.amount ?? '',
        supplier_name: supplierDetails?.supplier_name || '',
        supplier_type: supplierDetails?.supplier_type || '',
        contact_person_name: contactPerson?.name || '',
        contact_person_email: contactPerson?.email || '',
        contact_person_designation: contactPerson?.designation || '',
        contact_person_mobile_no: contactPerson?.mobile_number || '',
        invoice_date: invoiceDetails?.invoice_date || '',
        invoice_no: invoiceDetails?.invoice_no || '',
        total_item_amount: invoiceDetails?.total_item_amount ?? '',
        transporter_details: invoiceDetails?.transporter_details || '',
        gst_percentage: invoiceDetails?.gst_percentage ?? '',
        gst_val: invoiceDetails?.gst_value ?? '',
        invoice_value_with_gst: invoiceDetails?.invoice_value_with_gst ?? '',
        remark: data?.remark || '',
      };

      worksheet.addRow(rowData);
    });

    // Write to a temporary file
    const tempFilePath = `${folderPath}/othergoods-inventory-report.xlsx`;
    await workbook.xlsx.writeFile(tempFilePath);

    // Rename with timestamp
    const timeStamp = Date.now();
    const finalFileName = `OTHERGOODS-Inventory-report-${timeStamp}.xlsx`;
    const finalPath = `${folderPath}/${finalFileName}`;
    await fs.rename(tempFilePath, finalPath);

    // Construct public download URL
    const link = `${process.env.APP_URL}${finalPath.replace('public/', '')}`;
    console.log('Excel file generated successfully at:', link);

    return link;
  } catch (error) {
    console.error('Error generating other goods Excel file:', error);
    throw new ApiError('Error generating Excel file', 500, error);
  }
};

export const createOtherGoodsStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/inventory/othergoods';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Other Goods Stock Report');

    // Format dates to DD/MM/YYYY
    const formatDate = (dateStr) => {
      try {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
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
    let title = 'Other Goods';
    
    if (filters && filters.item_name) {
      title += ` [ ${filters.item_name} ]`;
    } else {
      title += ' [ ALL ]';
    }
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    title += `   stock  in the period  ${formattedStartDate} and ${formattedEndDate}`;

    console.log('Generated report title:', title);

    // Define columns WITHOUT headers (only keys and widths)
    const columnDefinitions = [
      { key: 'item_name', width: 25 },
      { key: 'item_sub_category_name', width: 30 },
      { key: 'opening_quantity', width: 15 },
      { key: 'opening_amount', width: 15 },
      { key: 'receive_quantity', width: 15 },
      { key: 'receive_amount', width: 15 },
      { key: 'consume_quantity', width: 15 },
      { key: 'consume_amount', width: 15 },
      { key: 'sales_quantity', width: 15 },
      { key: 'sales_amount', width: 15 },
      { key: 'closing_quantity', width: 15 },
      { key: 'closing_amount', width: 15 },
    ];

    // Set columns (NO headers in definition, so Row 1 won't be touched)
    worksheet.columns = columnDefinitions;

    // Add title row manually
    const filterRow = worksheet.addRow([title]);
    filterRow.font = { bold: true, size: 12 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    filterRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 12); // Merge across all columns

    // Add empty row for spacing
    worksheet.addRow([]);

    // Add header row manually (row 3)
    const headerRow = worksheet.addRow([
      'Item Name',
      'Item Sub Category',
      'Opening (Qty)',
      'Opening (Amount)',
      'Receive (Qty)',
      'Receive (Amount)',
      'Consume (Qty)',
      'Consume (Amount)',
      'Sales (Qty)',
      'Sales (Amount)',
      'Closing (Qty)',
      'Closing (Amount)',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Group data by item_name, then item_sub_category_name
    const groupedData = {};
    aggregatedData.forEach((item) => {
      const itemName = item.item_name || 'UNKNOWN';
      const itemSubCategory = item.item_sub_category_name || '';

      if (!groupedData[itemName]) {
        groupedData[itemName] = [];
      }
      groupedData[itemName].push(item);
    });

    // Initialize grand totals
    const grandTotals = {
      opening_quantity: 0,
      opening_amount: 0,
      receive_quantity: 0,
      receive_amount: 0,
      consume_quantity: 0,
      consume_amount: 0,
      sales_quantity: 0,
      sales_amount: 0,
      closing_quantity: 0,
      closing_amount: 0,
    };

    // Add data rows with hierarchy
    Object.keys(groupedData)
      .sort()
      .forEach((itemName) => {
        const items = groupedData[itemName];

        // Item name totals
        const itemTotals = {
          opening_quantity: 0,
          opening_amount: 0,
          receive_quantity: 0,
          receive_amount: 0,
          consume_quantity: 0,
          consume_amount: 0,
          sales_quantity: 0,
          sales_amount: 0,
          closing_quantity: 0,
          closing_amount: 0,
        };

        // Add each sub category row
        items.forEach((item) => {
          const rowData = {
            item_name: item.item_name || '',
            item_sub_category_name: item.item_sub_category_name || '',
            opening_quantity: item.opening_quantity || 0,
            opening_amount: item.opening_amount || 0,
            receive_quantity: item.receive_quantity || 0,
            receive_amount: item.receive_amount || 0,
            consume_quantity: item.consume_quantity || 0,
            consume_amount: item.consume_amount || 0,
            sales_quantity: item.sales_quantity || 0,
            sales_amount: item.sales_amount || 0,
            closing_quantity: item.closing_quantity || 0,
            closing_amount: item.closing_amount || 0,
          };

          worksheet.addRow(rowData);

          // Accumulate item totals
          Object.keys(itemTotals).forEach((key) => {
            itemTotals[key] += rowData[key] || 0;
          });
        });

        // Add item total row
        const itemTotalRow = worksheet.addRow({
          item_name: '',
          item_sub_category_name: 'Total',
          ...itemTotals,
        });
        itemTotalRow.eachCell((cell) => {
          cell.font = { bold: true };
        });

        // Accumulate grand totals
        Object.keys(grandTotals).forEach((key) => {
          grandTotals[key] += itemTotals[key];
        });
      });

    // Add grand total row
    const grandTotalRow = worksheet.addRow({
      item_name: 'Total',
      item_sub_category_name: '',
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
    const fileName = `OtherGoods-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Stock report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating other goods stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};
