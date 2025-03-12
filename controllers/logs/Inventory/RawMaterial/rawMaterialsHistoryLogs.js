import mongoose from 'mongoose';
import { GenerateRawMaterialLogs } from '../../../../config/downloadExcel/Logs/Inventory/RawMaterials/rawmaterial.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';

export const ListRawMaterialHistoryLogs = catchAsync(async (req, res) => {
  const RawMaterialModel = mongoose.connection.db.collection(
    'rawmaterialhistorylogs'
  );

  const rawMaterial = await RawMaterialModel.find().toArray();

  const exl = await GenerateRawMaterialLogs(rawMaterial);
  const timestamp = new Date().getTime();
  const fileName = `rawmateriallogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
