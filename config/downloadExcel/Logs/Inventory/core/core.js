import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

export const createCoreLogsExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/inventory/core';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('core-logs');
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
      { header: 'City', key: 'city', width: 20 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Pincode', key: 'pincode', width: 15 },
      { header: 'GST Number', key: 'gst_number', width: 20 },
      { header: 'Web URL', key: 'web_url', width: 25 },
      // { header: "Invoice No", key: "invoice_no", width: 20 },
      // { header: "Total Item Amount", key: "total_item_amount", width: 20 },
      // { header: "Transporter Details", key: "transporter_details", width: 30 },
      // { header: "GST Percentage", key: "gst_percentage", width: 20 },
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
      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Updated Date', key: 'updatedAt', width: 20 },
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

          inward_sr_no: data.core_invoice_details.inward_sr_no,
          inward_date: data.core_invoice_details.inward_date,
          currency: data.core_invoice_details.currency,
          no_of_workers:
            data.core_invoice_details.workers_details.no_of_workers,
          shift: data.core_invoice_details.workers_details.shift,
          working_hours:
            data.core_invoice_details.workers_details.working_hours,
          supplier_name:
            data.core_invoice_details.supplier_details.company_details
              .supplier_name,
          supplier_type:
            data.core_invoice_details.supplier_details.company_details.supplier_type.join(
              ', '
            ),
          branch_name:
            data.core_invoice_details.supplier_details.branch_detail
              .branch_name,
          address:
            data.core_invoice_details.supplier_details.branch_detail.address,
          city: data.core_invoice_details.supplier_details.branch_detail.city,
          state: data.core_invoice_details.supplier_details.branch_detail.state,
          country:
            data.core_invoice_details.supplier_details.branch_detail.country,
          pincode:
            data.core_invoice_details.supplier_details.branch_detail.pincode,
          gst_number:
            data.core_invoice_details.supplier_details.branch_detail.gst_number,
          web_url:
            data.core_invoice_details.supplier_details.branch_detail.web_url,
          contact_person_name:
            data.core_invoice_details.supplier_details.branch_detail
              .contact_person[0].name,
          contact_person_email:
            data.core_invoice_details.supplier_details.branch_detail
              .contact_person[0].email,
          contact_person_designation:
            data.core_invoice_details.supplier_details.branch_detail
              .contact_person[0].designation,
          contact_person_mobile_no:
            data.core_invoice_details.supplier_details.branch_detail
              .contact_person[0].mobile_number,
          // invoice_no: data.core_invoice_details.invoice_Details.invoice_no,
          // total_item_amount:
          //   data.core_invoice_details.invoice_Details.total_item_amount,
          // transporter_details:
          //   data.core_invoice_details.invoice_Details.transporter_details,
          // gst_percentage:
          //   data.core_invoice_details.invoice_Details.gst_percentage,
          // gst_val: data?.core_invoice_details?.invoice_Details?.gst_value,

          invoice_date:
            data?.core_invoice_details?.invoice_Details.invoice_date,
          invoice_no: data?.core_invoice_details?.invoice_Details.invoice_no,
          total_item_amount:
            data?.core_invoice_details?.invoice_Details.total_item_amount,
          transporter_details:
            data?.core_invoice_details?.invoice_Details.transporter_details,
          gst_percentage:
            data?.core_invoice_details?.invoice_Details.gst_percentage,
          gst_val: data?.core_invoice_details?.invoice_Details?.gst_value,
          invoice_value_with_gst:
            data.core_invoice_details.invoice_Details.invoice_value_with_gst,
          createdAt: data?.createdAt,
          updatedAt: data?.updatedAt,
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log('Error creating core logs Excel => ', error.message);
      }
    });

    const filepath =
      'public/upload/reports/inventory/core/core-inventory-report.xlsx';
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Core-Inventory-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/inventory/core/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log('File renamed from', filepath, 'to', destinationPath);

    return link;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

export const createCoreHistoryExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/inventory/core';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('core-history-logs');

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
      { header: 'Amount', key: 'amount', width: 15 },

      { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
      { header: 'Issued Sqm', key: 'issued_sqm', width: 15 },
      { header: 'Issued Amount', key: 'issued_amount', width: 20 },
      { header: 'Issue Status', key: 'issue_status', width: 20 },

      { header: 'Inward Date', key: 'inward_date', width: 20 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'No of Workers', key: 'no_of_workers', width: 15 },
      { header: 'Shift', key: 'shift', width: 10 },
      { header: 'Working Hours', key: 'working_hours', width: 15 },
      { header: 'Supplier Name', key: 'supplier_name', width: 30 },
      { header: 'Supplier Type', key: 'supplier_type', width: 20 },
      { header: 'Branch Name', key: 'branch_name', width: 25 },
      { header: 'Branch Address', key: 'address', width: 25 },
      { header: 'Contact Person Name', key: 'contact_person_name', width: 25 },
      { header: 'Contact Person Email', key: 'contact_person_email', width: 25 },
      { header: 'Contact Person Mobile Number', key: 'contact_person_mobile_no', width: 25 },
      { header: 'Contact Person Designation', key: 'contact_person_designation', width: 25 },
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
      { header: 'GST Value', key: 'gst_val', width: 15 },
      { header: 'Invoice Value with GST', key: 'invoice_value_with_gst', width: 20 },

      { header: 'Created By', key: 'created_by_name', width: 25 },
      { header: 'Updated By', key: 'updated_by_name', width: 25 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];

    worksheet.columns = columns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        const invoice = data?.core_item_details?.core_invoice_details || {};
        const invoiceDetails = invoice?.invoice_Details || {};
        const supplier = invoice?.supplier_details || {};
        const branch = supplier?.branch_detail || {};
        const contact = branch?.contact_person?.[0] || {};
        const company = supplier?.company_details || {};

        const rowData = {
          supplier_item_name: data?.core_item_details?.supplier_item_name || '',
          item_sr_no: data?.core_item_details?.item_sr_no || '',
          item_name: data?.core_item_details?.item_name || '',
          length: data?.core_item_details?.length || '',
          width: data?.core_item_details?.width || '',
          thickness: data?.core_item_details?.thickness || '',
          number_of_sheets: data?.core_item_details?.number_of_sheets || '',
          total_sq_meter: data?.core_item_details?.total_sq_meter || '',
          grade_name: data?.core_item_details?.grade_name || '',
          rate_in_currency: data?.core_item_details?.rate_in_currency || '',
          rate_in_inr: data?.core_item_details?.rate_in_inr || '',
          exchange_rate: data?.core_item_details?.exchange_rate || '',
          amount: data?.core_item_details?.amount || '',

          issued_sheets: data?.issued_sheets || 0,
          issued_sqm: data?.issued_sqm || 0,
          issued_amount: data?.issued_amount || 0,
          issue_status: data?.issue_status || '',

          inward_sr_no: invoice?.inward_sr_no || '',
          inward_date: invoice?.inward_date ? new Date(invoice?.inward_date).toLocaleDateString() : '',
          currency: invoice?.currency || '',
          no_of_workers: invoice?.workers_details?.no_of_workers || '',
          shift: invoice?.workers_details?.shift || '',
          working_hours: invoice?.workers_details?.working_hours || '',

          supplier_name: company?.supplier_name || '',
          supplier_type: Array.isArray(company?.supplier_type) ? company.supplier_type.join(', ') : '',
          branch_name: branch?.branch_name || '',
          address: branch?.address || '',
          city: branch?.city || '',
          state: branch?.state || '',
          country: branch?.country || '',
          pincode: branch?.pincode || '',
          gst_number: branch?.gst_number || '',
          web_url: branch?.web_url || '',

          contact_person_name: contact?.name || '',
          contact_person_email: contact?.email || '',
          contact_person_mobile_no: contact?.mobile_number || '',
          contact_person_designation: contact?.designation || '',

          invoice_date: invoiceDetails?.invoice_date ? new Date(invoiceDetails?.invoice_date).toLocaleDateString() : '',
          invoice_no: invoiceDetails?.invoice_no || '',
          total_item_amount: invoiceDetails?.total_item_amount || '',
          transporter_details: invoiceDetails?.transporter_details || '',
          gst_percentage: invoiceDetails?.gst_percentage || '',
          gst_val: invoiceDetails?.gst_value || '',
          invoice_value_with_gst: invoiceDetails?.invoice_value_with_gst || '',

          created_by_name: `${data?.created_user_details?.first_name || ''} ${data?.created_user_details?.last_name || ''}`.trim(),
          updated_by_name: `${data?.updated_user_details?.first_name || ''} ${data?.updated_user_details?.last_name || ''}`.trim(),
          createdAt: data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : '',
          updatedAt: data?.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : '',
        };

        worksheet.addRow(rowData);
      } catch (err) {
        console.error('Error adding row:', err.message);
      }
    });

    const filepath = `${folderPath}/core-history-report.xlsx`;
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Core-History-report-${timeStamp}.xlsx`;
    const destinationPath = `${folderPath}/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log('File saved:', destinationPath);
    return link;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

