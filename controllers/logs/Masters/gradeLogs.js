import mongoose from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { GenerateGradeLogs } from '../../../config/downloadExcel/Logs/Masters/grade.js';

export const ListGradeLogs = catchAsync(async (req, res) => {
  const GradeModel = mongoose.connection.db.collection('gradelogs');

  const grade = await GradeModel.find().toArray();

  const exl = await GenerateGradeLogs(grade);
  const timestamp = new Date().getTime();
  const fileName = `gradelogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
