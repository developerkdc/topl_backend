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
      { header: 'Invoice Value with GST', key: 'invoice_value_with_gst', width: 20 },
      { header: 'Contact Person Name', key: 'contact_person_name', width: 25 },
      { header: 'Contact Person Email', key: 'contact_person_email', width: 25 },
      { header: 'Contact Person Mobile Number', key: 'contact_person_mobile_no', width: 25 },
      { header: 'Contact Person Designation', key: 'contact_person_designation', width: 25 },
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
        created_by: item.created_user_details?.user_name || item.created_user_details?.first_name || '',
        updated_by: item.updated_user_details?.user_name || item.updated_user_details?.first_name || '',
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

    const filepath = 'public/upload/reports/inventory/fleecePaper/fleece-history-report.xlsx';
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
