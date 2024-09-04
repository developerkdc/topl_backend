import mongoose from "mongoose";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import { GenerateGroupingHistoryLogs } from "../../../../config/downloadExcel/Logs/Factory/Grouping/groupingHistory.js";

export const ListGroupingHistoryLogs = catchAsync(async (req, res) => {
  const GroupingHistoryModel =
    mongoose.connection.db.collection("grouphistorylogs");
  const groupinghistory = await GroupingHistoryModel.find().toArray();
  const exl = await GenerateGroupingHistoryLogs(groupinghistory);
  const timestamp = new Date().getTime();
  const fileName = `GroupingHistorylogs${timestamp}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(exl);
});
