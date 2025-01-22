import mongoose from 'mongoose';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { GenerateGroupSmokedLogs } from '../../../../config/downloadExcel/Logs/Factory/Smoking/groupsSmoked.js';

export const ListSmokedGroupsLogs = catchAsync(async (req, res) => {
  const GroupSmoked = mongoose.connection.db.collection('groupsmokelogs');

  const issuedForSmoking = await GroupSmoked.find().toArray();
  const exl = await GenerateGroupSmokedLogs(issuedForSmoking);
  const timestamp = new Date().getTime();
  const fileName = `groupSmokedlogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
