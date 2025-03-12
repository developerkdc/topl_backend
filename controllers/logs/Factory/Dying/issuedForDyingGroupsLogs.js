import mongoose from 'mongoose';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { GenerateIssuedForDyingGroupsLogs } from '../../../../config/downloadExcel/Logs/Factory/Dying/issuedForDyingGroups.js';

export const ListIssuedForDyingGrpLogs = catchAsync(async (req, res) => {
  const IssuedForGroupingGrpModel = mongoose.connection.db.collection(
    'issuedfordyinggrouplogs'
  );

  const issueForSmokingGrouping =
    await IssuedForGroupingGrpModel.find().toArray();
  const exl = await GenerateIssuedForDyingGroupsLogs(issueForSmokingGrouping);
  const timestamp = new Date().getTime();
  const fileName = `IssuedForDyinglogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
