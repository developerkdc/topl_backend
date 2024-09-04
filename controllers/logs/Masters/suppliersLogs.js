import mongoose from "mongoose";

import { GenerateSuppliersLogs } from "../../../config/downloadExcel/Logs/Masters/suppliers.js";
import catchAsync from "../../../utils/errors/catchAsync.js";

export const ListSuppliersLogs = catchAsync(async (req, res) => {
  const SupplierModel = mongoose.connection.db.collection("supplierlogs");

  const suppliers = await SupplierModel.find().toArray();

  const exl = await GenerateSuppliersLogs(suppliers);
  const timestamp = new Date().getTime();
  const fileName = `supplierslogs${timestamp}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(exl);
});
