import mongoose from "mongoose";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { GeneratePalletLogs } from "../../../config/downloadExcel/Logs/Masters/palletNo.js";

export const ListPalletLogs = catchAsync(async (req, res) => {
  const UserModel = mongoose.connection.db.collection("palletelogs");

  const pallet = await UserModel.find().toArray();

  const exl = await GeneratePalletLogs(pallet);
  const timestamp = new Date().getTime();
  const fileName = `palletlogs${timestamp}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(exl);
});
