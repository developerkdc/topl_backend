import mongoose from "mongoose";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import { GenerateGroupingLogs } from "../../../../config/downloadExcel/Logs/Factory/Grouping/groupingDone.js";

export const ListGroupingDoneLogs = catchAsync(async (req, res) => {
  const GroupingDoneModel = mongoose.connection.db.collection(
    "grouplogs"
  );

  const grouping = await GroupingDoneModel.find().toArray();
  const exl = await GenerateGroupingLogs(grouping);
  const timestamp = new Date().getTime();
  const fileName = `GroupingDonelogs${timestamp}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(exl);
});
