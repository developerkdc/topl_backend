import mongoose from 'mongoose';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { GenerateIssuedForGroupingLogs } from '../../../../config/downloadExcel/Logs/Factory/Grouping/issuedForGrouping.js';

export const ListIssuedForGroupingLogs = catchAsync(async (req, res) => {
  const IssuedGroupingModel = mongoose.connection.db.collection(
    'issuedforgroupinglogs'
  );

  const issuedGrouping = await IssuedGroupingModel.find().toArray();
  const exl = await GenerateIssuedForGroupingLogs(issuedGrouping);
  const timestamp = new Date().getTime();
  const fileName = `issuedForGroupinglogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
