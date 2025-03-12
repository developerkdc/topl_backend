import mongoose from 'mongoose';
import { GenerateRawMaterialLogs } from '../../../../config/downloadExcel/Logs/Inventory/RawMaterials/rawmaterial.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { GenerateOtherGoodsLogs } from '../../../../config/downloadExcel/Logs/Inventory/OtherGoods/otherGoods.js';
import { GenerateOtherGoodsConsumedLogs } from '../../../../config/downloadExcel/Logs/Inventory/OtherGoods/otherGoodsConsumed.js';

export const ListOtherGoodsConsumedLogs = catchAsync(async (req, res) => {
  const otherGoodsModel = mongoose.connection.db.collection(
    'othergoodsissuedlogs'
  );

  const otherGoods = await otherGoodsModel.find().toArray();

  const exl = await GenerateOtherGoodsConsumedLogs(otherGoods);
  const timestamp = new Date().getTime();
  const fileName = `otherGoodsConsumedlogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
