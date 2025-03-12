import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

export const createCrosscuttingDoneExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/factory/crosscutting';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('crosscutting-done');
    const columns = [
      { header: 'Machine Name', key: 'machine_name', width: 20 },
      { header: 'Log No', key: 'log_no', width: 15 },
      { header: 'Code', key: 'code', width: 10 },
      { header: 'Log No Code', key: 'log_no_code', width: 15 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Girth', key: 'girth', width: 10 },
      { header: 'Crosscut CMT', key: 'crosscut_cmt', width: 15 },
      { header: 'Cost Amount', key: 'cost_amount', width: 15 },
      { header: 'Per CMT Cost', key: 'per_cmt_cost', width: 20 },
      { header: 'Expense Amount', key: 'expense_amount', width: 15 },
      { header: 'SQM Factor', key: 'sqm_factor', width: 15 },
      { header: 'Wastage SQM', key: 'wastage_sqm', width: 15 },
      { header: 'Wastage Length', key: 'wastage_length', width: 15 },
      { header: 'Required Hours', key: 'required_hours', width: 15 },
      { header: 'Required Workers', key: 'required_workers', width: 15 },
      { header: 'Crosscut Completed', key: 'remarks', width: 20 },
      { header: 'Crosscut Date', key: 'crosscut_date', width: 20 },
      { header: 'Workers', key: 'workers', width: 10 },
      { header: 'Shift', key: 'shift', width: 10 },
      { header: 'Working Hours', key: 'working_hours', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];

    worksheet.columns = columns;
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    newData?.forEach((data) => {
      try {
        const rowData = {
          machine_name: data?.machine_name,
          log_no: data?.log_no,
          code: data?.code,
          log_no_code: data?.log_no_code,
          length: data?.length,
          girth: data?.girth,
          crosscut_cmt: data?.crosscut_cmt,
          cost_amount: data?.cost_amount,
          per_cmt_cost: data?.per_cmt_cost,
          expense_amount: data?.expense_amount,
          sqm_factor: data?.sqm_factor,
          wastage_sqm: data?.wastage_info?.wastage_sqm,
          wastage_length: data?.wastage_info?.wastage_length,
          required_hours: data?.required_hours,
          required_workers: data?.required_workers,
          remarks: data?.remarks,
          crosscut_date: new Date(
            data?.worker_details?.crosscut_date
          ).toLocaleDateString(),
          workers: data?.worker_details?.workers,
          shift: data?.worker_details?.shift,
          working_hours: data?.worker_details?.working_hours,
          createdAt: new Date(data?.createdAt).toLocaleDateString(),
          updatedAt: new Date(data?.updatedAt).toLocaleDateString(),
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log('Error crosscutting done Excel => ', error.message);
      }
    });

    const filepath =
      'public/upload/reports/factory/crosscutting/crosscutting-done-report.xlsx';
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `CrossCutting-Done-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/factory/crosscutting/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log('File renamed from', filepath, 'to', destinationPath);

    return link;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};
