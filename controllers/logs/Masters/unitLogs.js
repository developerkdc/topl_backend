import mongoose from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { GenerateUnitsLogs } from '../../../config/downloadExcel/Logs/Masters/units.js';

export const ListUnitsLogs = catchAsync(async (req, res) => {
  const UnitModel = mongoose.connection.db.collection('unitlogs');

  const units = await UnitModel.find().toArray();

  const exl = await GenerateUnitsLogs(units);
  const timestamp = new Date().getTime();
  const fileName = `unitslogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
