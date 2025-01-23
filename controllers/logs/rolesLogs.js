import mongoose from 'mongoose';
import catchAsync from '../../utils/errors/catchAsync.js';
import { GenerateRoleLogs } from '../../config/downloadExcel/Logs/roles.js';

export const ListRolesLogs = catchAsync(async (req, res) => {
  const RolesModel = await mongoose.connection.db.collection('roleslogs');

  const roles = await RolesModel.find().toArray();

  const exl = await GenerateRoleLogs(roles);
  const timestamp = new Date().getTime();
  const fileName = `roles&permissionlogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
