import mongoose from "mongoose";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import { GenerateIssuedForSmokingLogs } from "../../../../config/downloadExcel/Logs/Factory/Smoking/issuedForSmoking.js";
import { GenerateIssuedForDyingLogs } from "../../../../config/downloadExcel/Logs/Factory/Dying/issuedForDying.js";

export const ListIssuedForDyingLogs = catchAsync(async (req, res) => {
  const IssuedDyingModel = mongoose.connection.db.collection(
    "issuedfordyingindividuallogs"
  );

  const issuedForDying = await IssuedDyingModel.find().toArray();
  const exl = await GenerateIssuedForDyingLogs(issuedForDying);
  const timestamp = new Date().getTime();
  const fileName = `issuedForDyinglogs${timestamp}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(exl);
});
