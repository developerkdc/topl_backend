import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

export const createFleeceLogsExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/inventory/fleecePaper';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('fleece-logs');

    const columns = [
      { header: 'Inward Sr No', key: 'inward_sr_no', width: 15 },
      { header: 'Inward Date', key: 'inward_date', width: 20 },
      { header: 'Item Sr No', key: 'item_sr_no', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'Supplier Item Name', key: 'supplier_item_name', width: 20 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 10 },
      { header: 'Total Sq Meter', key: 'total_sq_meter', width: 20 },
      { header: 'Rate in Currency', key: 'rate_in_currency', width: 20 },
      { header: 'Rate in INR', key: 'rate_in_inr', width: 20 },
      { header: 'Exchange Rate', key: 'exchange_rate', width: 20 },
      { header: 'GST Value', key: 'gst_val', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Remark', key: 'remark', width: 20 },

      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Updated Date', key: 'updatedAt', width: 20 },
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
    ];

    worksheet.columns = columns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        const rowData = {
          inward_sr_no: data.fleece_invoice_details?.inward_sr_no,
          item_sr_no: data.item_sr_no,
          item_name: data.item_name,
          supplier_item_name: data.supplier_item_name,
          length: data.length,
          width: data.width,
          thickness: data.thickness,
          total_sq_meter: data.total_sq_meter,
          rate_in_currency: data.rate_in_currency,
          rate_in_inr: data.rate_in_inr,
          exchange_rate: data.exchange_rate,

          amount: data.amount,
          remark: data.remark,
          inward_date: data?.fleece_invoice_details?.inward_date,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          currency: data.fleece_invoice_details?.currency,
          no_of_workers:
            data.fleece_invoice_details?.workers_details?.no_of_workers,
          shift: data.fleece_invoice_details?.workers_details?.shift,
          working_hours:
            data.fleece_invoice_details?.workers_details?.working_hours,
          supplier_name:
            data.fleece_invoice_details?.supplier_details?.company_details
              ?.supplier_name,
          supplier_type:
            data.fleece_invoice_details?.supplier_details?.company_details?.supplier_type?.join(
              ', '
            ),
          branch_name:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.branch_name,
          address:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.address,
          city: data.fleece_invoice_details?.supplier_details?.branch_detail
            ?.city,
          state:
            data.fleece_invoice_details?.supplier_details?.branch_detail?.state,
          country:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.country,
          pincode:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.pincode,
          gst_number:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.gst_number,
          web_url:
            data.fleece_invoice_details?.supplier_details?.branch_detail
              ?.web_url,
          contact_person_name:
            data.fleece_invoice_details.supplier_details.branch_detail
              .contact_person[0].name,
          contact_person_email:
            data.fleece_invoice_details.supplier_details.branch_detail
              .contact_person[0].email,
          contact_person_designation:
            data.fleece_invoice_details.supplier_details.branch_detail
              .contact_person[0].designation,
          contact_person_mobile_no:
            data.fleece_invoice_details.supplier_details.branch_detail
              .contact_person[0].mobile_number,
          invoice_no: data.fleece_invoice_details?.invoice_Details?.invoice_no,
          total_item_amount:
            data.fleece_invoice_details?.invoice_Details?.total_item_amount,
          transporter_details:
            data.fleece_invoice_details?.invoice_Details?.transporter_details,
          gst_percentage:
            data.fleece_invoice_details?.invoice_Details?.gst_percentage,
          gst_val: data?.fleece_invoice_details?.invoice_Details?.gst_value,
          invoice_value_with_gst:
            data.fleece_invoice_details?.invoice_Details
              ?.invoice_value_with_gst,
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log('Error creating fleece logs Excel => ', error.message);
      }
    });

    const filepath =
      'public/upload/reports/inventory/fleecePaper/fleece-inventory-report.xlsx';
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Fleece-Paper-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/fleecePaper/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log('File renamed from', filepath, 'to', destinationPath);

    return link;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

export const createFleeceHistoryExcel = async (data) => {
  try {
    const folderPath = 'public/upload/reports/inventory/fleecePaper';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('fleece-history');

    const columns = [
      { header: 'Inward Sr No', key: 'inward_sr_no', width: 15 },
      { header: 'Inward Date', key: 'inward_date', width: 20 },
      { header: 'Item Sr No', key: 'item_sr_no', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'Supplier Item Name', key: 'supplier_item_name', width: 20 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 10 },
      { header: 'Total Sq Meter', key: 'total_sq_meter', width: 20 },
      { header: 'Rate in Currency', key: 'rate_in_currency', width: 20 },
      { header: 'Rate in INR', key: 'rate_in_inr', width: 20 },
      { header: 'Exchange Rate', key: 'exchange_rate', width: 20 },
      { header: 'GST Value', key: 'gst_val', width: 20 },
      { header: 'Issued Rolls', key: 'issued_number_of_roll', width: 15 },
      { header: 'Total SQM Issued', key: 'issued_sqm', width: 20 },
      { header: 'Issued Amount', key: 'issued_amount', width: 20 },
      { header: 'Issue Status', key: 'issue_status', width: 20 },
      { header: 'Remark', key: 'remark', width: 20 },
      { header: 'Created By', key: 'created_by', width: 20 },
      { header: 'Updated By', key: 'updated_by', width: 20 },
      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Updated Date', key: 'updatedAt', width: 20 },
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
    ];

    worksheet.columns = columns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    data.forEach((item) => {
      const row = {
        inward_sr_no: item.fleece_invoice_details?.inward_sr_no,
        inward_date: item.fleece_invoice_details?.inward_date,
        item_sr_no: item.fleece_item_details?.item_sr_no,
        item_name: item.fleece_item_details?.item_name,
        supplier_item_name: item.fleece_item_details?.supplier_item_name,
        length: item.fleece_item_details?.length,
        width: item.fleece_item_details?.width,
        thickness: item.fleece_item_details?.thickness,
        total_sq_meter: item.fleece_item_details?.total_sq_meter,
        rate_in_currency: item.fleece_item_details?.rate_in_currency,
        rate_in_inr: item.fleece_item_details?.rate_in_inr,
        exchange_rate: item.fleece_item_details?.exchange_rate,
        gst_val: item.gst_val,
        issued_number_of_roll: item.issued_number_of_roll,
        issued_sqm: item.issued_sqm,
        issued_amount: item.issued_amount,
        issue_status: item.issue_status,
        remark: item.remark,
        created_by:
          item.created_user_details?.user_name ||
          item.created_user_details?.first_name ||
          '',
        updated_by:
          item.updated_user_details?.user_name ||
          item.updated_user_details?.first_name ||
          '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        currency: item.fleece_invoice_details?.currency,
        no_of_workers: item.no_of_workers,
        shift: item.shift,
        working_hours: item.working_hours,
        supplier_name: item.company_details?.supplier_name,
        supplier_type: item.company_details?.supplier_type?.join(', '),
        branch_name: item.branch_detail?.branch_name,
        address: item.branch_detail?.address,
        city: item.branch_detail?.city,
        state: item.branch_detail?.state,
        country: item.branch_detail?.country,
        pincode: item.branch_detail?.pincode,
        gst_number: item.branch_detail?.gst_number,
        web_url: item.branch_detail?.web_url,
        invoice_no: item.invoice_no,
        total_item_amount: item.total_item_amount,
        transporter_details: item.transporter_details,
        gst_percentage: item.gst_percentage,
        invoice_value_with_gst: item.invoice_value_with_gst,
        contact_person_name: item.contact_person?.[0]?.name,
        contact_person_email: item.contact_person?.[0]?.email,
        contact_person_mobile_no: item.contact_person?.[0]?.mobile_number,
        contact_person_designation: item.contact_person?.[0]?.designation,
      };

      worksheet.addRow(row);
    });

    const filepath =
      'public/upload/reports/inventory/fleecePaper/fleece-history-report.xlsx';
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Fleece-Paper-History-report-${timeStamp}.xlsx`;
    const destinationPath = `public/upload/reports/inventory/fleecePaper/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    return link;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

export const createFleeceStockReportExcel = async (
  aggregatedData,
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const folderPath = 'public/upload/reports/inventory/fleecePaper';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Fleece Stock Report');

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
    let title = 'Fleece Paper Type';
    
    if (filters && filters.item_sub_category_name) {
      title += ` [ ${filters.item_sub_category_name} ]`;
    } else {
      title += ' [ ALL ]';
    }
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    title += `   stock  in the period  ${formattedStartDate} and ${formattedEndDate}`;

    console.log('Generated fleece stock report title:', title);

    // Define columns WITHOUT headers (only keys and widths)
    const columnDefinitions = [
      { key: 'fleece_sub_type', width: 20 },
      { key: 'thickness', width: 12 },
      { key: 'size', width: 15 },
      { key: 'opening_rolls', width: 12 },
      { key: 'opening_sqm', width: 12 },
      { key: 'receive_rolls', width: 12 },
      { key: 'receive_sqm', width: 12 },
      { key: 'consume_rolls', width: 12 },
      { key: 'consume_sqm', width: 12 },
      { key: 'sales_rolls', width: 12 },
      { key: 'sales_sqm', width: 12 },
      { key: 'issue_recal_rolls', width: 22 },
      { key: 'issue_recal_sqm', width: 22 },
      { key: 'closing_rolls', width: 12 },
      { key: 'closing_sqm', width: 12 },
    ];

    // Set columns (NO headers in definition)
    worksheet.columns = columnDefinitions;

    // Add title row manually
    const filterRow = worksheet.addRow([title]);
    filterRow.font = { bold: true, size: 12 };
    filterRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    filterRow.height = 20;
    worksheet.mergeCells(1, 1, 1, 15);

    // Add empty row for spacing
    worksheet.addRow([]);

    // Add header row manually (row 3)
    const headerRow = worksheet.addRow([
      'Fleece Paper Sub Type',
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
      'Issue For Rec/Pressing Roll',
      'Issue For Rec/Pressing Sq Met',
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

    // Group data by fleece_sub_type, then thickness
    const groupedData = {};
    aggregatedData.forEach((item) => {
      const subType = item.fleece_sub_type || 'OTHER';
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
      opening_rolls: 0,
      opening_sqm: 0,
      receive_rolls: 0,
      receive_sqm: 0,
      consume_rolls: 0,
      consume_sqm: 0,
      sales_rolls: 0,
      sales_sqm: 0,
      issue_recal_rolls: 0,
      issue_recal_sqm: 0,
      closing_rolls: 0,
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
              opening_rolls: 0,
              opening_sqm: 0,
              receive_rolls: 0,
              receive_sqm: 0,
              consume_rolls: 0,
              consume_sqm: 0,
              sales_rolls: 0,
              sales_sqm: 0,
              issue_recal_rolls: 0,
              issue_recal_sqm: 0,
              closing_rolls: 0,
              closing_sqm: 0,
            };

            // Add each item row
            items.forEach((item) => {
              const rowData = {
                fleece_sub_type: item.fleece_sub_type || '',
                thickness: item.thickness || 0,
                size: item.size || '',
                opening_rolls: item.opening_rolls || 0,
                opening_sqm: item.opening_sqm || 0,
                receive_rolls: item.receive_rolls || 0,
                receive_sqm: item.receive_sqm || 0,
                consume_rolls: item.consume_rolls || 0,
                consume_sqm: item.consume_sqm || 0,
                sales_rolls: item.sales_rolls || 0,
                sales_sqm: item.sales_sqm || 0,
                issue_recal_rolls: item.issue_recal_rolls || 0,
                issue_recal_sqm: item.issue_recal_sqm || 0,
                closing_rolls: item.closing_rolls || 0,
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
              fleece_sub_type: '',
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
      fleece_sub_type: 'Total',
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
    const fileName = `Fleece-Paper-Stock-Report-${timeStamp}.xlsx`;
    const filePath = `${folderPath}/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;
    console.log('Fleece stock report generated => ', downloadLink);

    return downloadLink;
  } catch (error) {
    console.error('Error creating fleece stock report:', error);
    throw new ApiError(500, error.message, error);
  }
};
