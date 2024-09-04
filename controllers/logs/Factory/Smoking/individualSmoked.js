import mongoose from "mongoose";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import { GenerateIndividualSmokedLogs } from "../../../../config/downloadExcel/Logs/Factory/Smoking/individualSmoked.js";

export const ListSmokedIndividualsLogs = catchAsync(async (req, res) => {
  const IndividualSmoked = mongoose.connection.db.collection(
    "individualsmokelogs"
  );

  const issuedForSmoking = await IndividualSmoked.find().toArray();
  const exl = await GenerateIndividualSmokedLogs(issuedForSmoking);
  const timestamp = new Date().getTime();
  const fileName = `individualSmokedlogs${timestamp}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(exl);
});
