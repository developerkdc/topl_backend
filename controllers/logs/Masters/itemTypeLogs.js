import mongoose from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { GenerateItemNameLogs } from '../../../config/downloadExcel/Logs/Masters/itemName.js';
import { GenerateItemCodeLogs } from '../../../config/downloadExcel/Logs/Masters/itemCode.js';

export const ListItemCodeLogs = catchAsync(async (req, res) => {
  const ItemCodeModel = mongoose.connection.db.collection('itemcodelogs');

  const itemCode = await ItemCodeModel.find().toArray();

  const exl = await GenerateItemCodeLogs(itemCode);
  const timestamp = new Date().getTime();
  const fileName = `itemCodelogs${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(exl);
});
