import mongoose from 'mongoose';
import catchAsync from '../../utils/errors/catchAsync.js';
import { GenerateUserLogs } from '../../config/downloadExcel/Logs/user.js';

export const ListUserLogs = catchAsync(async (req, res) => {
  const UserModel = await mongoose.connection.db.collection('userlogs');

  const user = await UserModel.find().toArray();

  console.log(user, 'dawdawdawdawdad');
  const exl = await GenerateUserLogs(user);
  const timestamp = new Date().getTime();
  const fileName = `userlogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
