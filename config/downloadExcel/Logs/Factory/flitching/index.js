import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

export const createFlitchingDoneExcel = async (newData) => {
  try {
    const folderPath = 'public/upload/reports/factory/flitching';
    try {
      await fs.access(folderPath);
    } catch (error) {
      await fs.mkdir(folderPath, { recursive: true });
      console.log('Folder created:', folderPath);
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('flitching-done');
    const columns = [
      { header: 'Machine Name', key: 'machine_name', width: 20 },
      { header: 'Log No', key: 'log_no', width: 15 },
      { header: 'Flitch Code', key: 'flitch_code', width: 15 },
      { header: 'Log No Code', key: 'log_no_code', width: 15 },
      { header: 'Flitch Formula', key: 'flitch_formula', width: 20 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width1', key: 'width1', width: 10 },
      { header: 'Width2', key: 'width2', width: 10 },
      { header: 'Width3', key: 'width3', width: 10 },
      { header: 'Height', key: 'height', width: 10 },
      { header: 'Flitch CMT', key: 'flitch_cmt', width: 15 },
      { header: 'SQM Factor', key: 'sqm_factor', width: 15 },
      { header: 'Wastage SQM', key: 'wastage_sqm', width: 15 },
      { header: 'Wastage Length', key: 'wastage_length', width: 15 },
      { header: 'Per CMT Cost', key: 'per_cmt_cost', width: 20 },
      { header: 'Cost Amount', key: 'cost_amount', width: 15 },
      { header: 'Expense Amount', key: 'expense_amount', width: 10 },
      { header: 'Required Hours', key: 'required_hours', width: 15 },
      { header: 'Required Workers', key: 'required_workers', width: 15 },
      { header: 'Flitching Completed', key: 'flitching_completed', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 20 },
      { header: 'Flitching Date', key: 'flitching_date', width: 20 },
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
          flitch_code: data?.flitch_code,
          log_no_code: data?.log_no_code,
          flitch_formula: data?.flitch_formula,
          length: data?.length,
          width1: data?.width1,
          width2: data?.width2,
          width3: data.width3,
          height: data?.height,
          flitch_cmt: data?.flitch_cmt,
          sqm_factor: data?.sqm_factor,
          wastage_sqm: data?.wastage_info.wastage_sqm,
          wastage_length: data?.wastage_info.wastage_length,
          per_cmt_cost: data?.per_cmt_cost,
          cost_amount: data?.cost_amount,
          expense_amount: data?.expense_amount,
          required_hours: data?.required_hours,
          required_workers: data?.required_workers,
          flitching_completed: data?.flitching_completed,
          remarks: data?.remarks,
          flitching_date: new Date(
            data?.worker_details?.flitching_date
          ).toLocaleDateString(),
          workers: data?.worker_details?.workers,
          shift: data?.worker_details?.shift,
          working_hours: data?.worker_details?.working_hours,
          createdAt: new Date(data?.createdAt).toLocaleDateString(),
          updatedAt: new Date(data?.updatedAt).toLocaleDateString(),
        };

        worksheet.addRow(rowData);
      } catch (error) {
        console.log('Error flitching done Excel => ', error.message);
      }
    });

    const filepath =
      'public/upload/reports/factory/flitching/flitching-done-report.xlsx';
    await workbook.xlsx.writeFile(filepath);

    const timeStamp = new Date().getTime();
    const dwnldFileName = `Flitching-Done-report-${timeStamp}.xlsx`;

    const destinationPath = `public/upload/reports/factory/flitching/${dwnldFileName}`;
    await fs.rename(filepath, destinationPath);

    const link = `${process.env.APP_URL}${destinationPath}`;
    console.log('File renamed from', filepath, 'to', destinationPath);

    return link;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};
