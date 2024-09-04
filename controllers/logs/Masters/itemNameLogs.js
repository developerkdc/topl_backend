import mongoose from "mongoose";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { GenerateItemNameLogs } from "../../../config/downloadExcel/Logs/Masters/itemName.js";

export const ListItemNameLogs = catchAsync(async (req, res) => {
  const ItemNameModel = mongoose.connection.db.collection("itemnamelogs");

  const itemName = await ItemNameModel.find().toArray();

  const exl = await GenerateItemNameLogs(itemName);
  const timestamp = new Date().getTime();
  const fileName = `itemNamelogs${timestamp}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(exl);
});
