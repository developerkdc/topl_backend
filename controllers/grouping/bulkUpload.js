import mongoose from "mongoose";
import { GroupModel } from "../../database/schema/group/groupCreated/groupCreated.schema.js";
import { RawMaterialModel } from "../../database/schema/inventory/raw/raw.schema.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { IssuedForGroupingModel } from "../../database/schema/group/issueForGrouping/issueForGrouping.schema.js";
import fs from "fs";
import GroupImagesModel from "../../database/schema/images/groupImages.schema.js";
import XLSX from "xlsx";

export const BulkUploadForCreateGroup = catchAsync(async (req, res, next) => {
  const file = req.file;
  if (!file || !file.path) {
    return res.status(400).json({
      result: [],
      status: false,
      message: "No file uploaded or file path not found.",
    });
  }
  const session = await GroupModel.startSession();
  session.startTransaction();

  try {
    const workbook = XLSX.readFile(file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, {
      dateNF: "dd-mm-yyyy",
      raw: false,
    });
    if (data.length === 0) {
      return res.status(400).json({
        result: [],
        status: false,
        message: "No items found in the uploaded file.",
      });
    }
    const requiredGroupFields = [
      "date_of_grouping",
      "group_grade",
      "group_no_of_pattas_original",
      "group_no_of_pattas_available",
      "total_item_sqm_original",
      "total_item_sqm_available",
      "group_length",
      "group_width",
      "group_pcs",
      "group_sqm_available",
      "group_pallete_no",
      "group_physical_location",
      "orientation",
      "book_type",
      "group_grade",
      "group_no",
      "user_name",
    ];
    for (const item of data) {
      for (const field of requiredGroupFields) {
        if (item[field] === "") {
          return res.status(400).json({
            result: [],
            status: false,
            message: `${field} is required for all items.`,
          });
        }
      }
      const GroupData = data.map((item) => ({
        date_of_grouping: item?.date_of_grouping,
        group_no: Number(item?.group_no),
        group_no_of_pattas_available: parseFloat(
          item?.group_no_of_pattas_available
        ),
        group_no_of_pattas_original: parseFloat(
          item?.group_no_of_pattas_original
        ),
        total_item_sqm_original: parseFloat(item?.total_item_sqm_original),
        total_item_sqm_available: parseFloat(item?.total_item_sqm_available),
        group_length: parseFloat(item?.group_length),
        group_width: parseFloat(item?.group_width),
        group_pcs: parseFloat(item?.group_pcs),
        group_sqm_available: parseFloat(item?.group_sqm_available),
        group_pallete_no: item?.group_pallete_no,
        group_physical_location: item?.group_physical_location,
        orientation: item?.orientation,
        book_type: item?.book_type,
        group_grade: item?.group_grade,
        created_employee_id: item?.created_employee_id,
      }));
      const savedGroupData = await GroupModel.insertMany(GroupData, {
        session,
      });

      const imagesData = savedGroupData.map((group) => ({
        group_images: [],
        group_no: group.group_no,
      }));
      await GroupImagesModel.insertMany(imagesData, { session });
      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        result: savedGroupData,
        status: true,
        message: "Group created successfully",
      });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
export const BulkUploadForCreateGroupItemsDetails = catchAsync(
  async (req, res, next) => {
    const file = req.file;
    if (!file || !file.path) {
      return res.status(400).json({
        result: [],
        status: false,
        message: "No file uploaded or file path not found.",
      });
    }
    const session = await GroupModel.startSession();
    session.startTransaction();

    try {
      const workbook = XLSX.readFile(file.path);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      if (data.length === 0) {
        return res.status(400).json({
          result: [],
          status: false,
          message: "No items found in the uploaded file.",
        });
      }
      const requiredGroupFields = ["item_id", "group_no"];

      const updateOperations = [];
      const updateItemIds = [];

      for (const item of data) {
        for (const field of requiredGroupFields) {
          if (item[field] === "") {
            return res.status(400).json({
              result: [],
              status: false,
              message: `${field} is required for all items.`,
            });
          }
        }
        updateOperations.push({
          updateMany: {
            filter: { group_no: Number(item.group_no) },
            update: { $push: { item_details: item.item_id } },
          },
        });
        updateItemIds.push(item.item_id);
      }

      await GroupModel.bulkWrite(updateOperations, { session });

      const groupedItems = await RawMaterialModel.find({
        _id: { $in: updateItemIds },
        status: "grouped",
      }).session(session);

      if (groupedItems.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: false,
          message: "Cannot create group because some items are already grouped.",
        });
      }

      await RawMaterialModel.updateMany(
        { _id: { $in: updateItemIds } },
        { status: "grouped" }
      ).session(session);

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        result: [],
        status: true,
        message: "Items added to groups successfully",
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }
);
