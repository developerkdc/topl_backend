import mongoose from 'mongoose';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { GenerateIssuedForSmokingLogs } from '../../../../config/downloadExcel/Logs/Factory/Smoking/issuedForSmoking.js';

export const ListIssuedForSmokingLogs = catchAsync(async (req, res) => {
  const IssuedSmokingModel = mongoose.connection.db.collection(
    'issuedforsmokingindividuallogs'
  );

  const issuedForSmoking = await IssuedSmokingModel.find().toArray();
  const exl = await GenerateIssuedForSmokingLogs(issuedForSmoking);
  const timestamp = new Date().getTime();
  const fileName = `issuedForSmokinglogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
