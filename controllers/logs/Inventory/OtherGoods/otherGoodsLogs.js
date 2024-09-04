import mongoose from "mongoose";
import { GenerateRawMaterialLogs } from "../../../../config/downloadExcel/Logs/Inventory/RawMaterials/rawmaterial.js";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import { GenerateOtherGoodsLogs } from "../../../../config/downloadExcel/Logs/Inventory/OtherGoods/otherGoods.js";

export const ListOtherGoodsLogs = catchAsync(async (req, res) => {
  const otherGoodsModel = mongoose.connection.db.collection("othergoodslogs");

  const otherGoods = await otherGoodsModel.find().toArray();

  const exl = await GenerateOtherGoodsLogs(otherGoods);
  const timestamp = new Date().getTime();
  const fileName = `otherGoodslogs${timestamp}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(exl);
});
