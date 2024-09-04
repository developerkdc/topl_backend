import mongoose from "mongoose";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import { GenerateIssuedForSmokingGroupsLogs } from "../../../../config/downloadExcel/Logs/Factory/Smoking/issuedForSmokingGroups.js";

export const ListIssuedForSmokingGrpLogs = catchAsync(async (req, res) => {
  const IssuedForSmokingGrpModel = mongoose.connection.db.collection(
    "issuedforsmokinggrouplogs"
  );

  const issueForSmokingGrouping = await IssuedForSmokingGrpModel.find().toArray();
  const exl = await GenerateIssuedForSmokingGroupsLogs(issueForSmokingGrouping);
  const timestamp = new Date().getTime();
  const fileName = `IssuedForSmokinglogs${timestamp}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(exl);
});
