import mongoose from "mongoose";
import ItemNameModel from "../../database/schema/masters/itemName.schema.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";

import XLSX from "xlsx";
export const AddItemNameMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const itemNameData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
  };
  const newItemNameList = new ItemNameModel(itemNameData);
  const savedItemName = await newItemNameList.save();
  return res.status(201).json({
    result: savedItemName,
    status: true,
    message: "ItemName created successfully",
  });
});

export const UpdateItemNameMaster = catchAsync(async (req, res) => {
  const ItemNameId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(ItemNameId)) {
    return res.status(400).json({ result: [], status: false, message: "Invalid item name ID" });
  }
  const ItemName = await ItemNameModel.findByIdAndUpdate(ItemNameId, { $set: updateData }, { new: true, runValidators: true });
  if (!ItemName) {
    return res.status(404).json({
      result: [],
      status: false,
      message: "Item name not found.",
    });
  }
  res.status(200).json({
    result: ItemName,
    status: true,
    message: "Updated successfully",
  });
});

export const ListItemNameMaster = catchAsync(async (req, res) => {
  const { string, boolean, numbers, arrayField = [] } = req?.body?.searchFields || {};
  const { page = 1, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;
  const search = req.query.search || "";
  let searchQuery = {};
  if (search != "" && req?.body?.searchFields) {
    const searchdata = DynamicSearch(search, boolean, numbers, string, arrayField);
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          user: [],
        },
        message: "Results Not Found",
      });
    }
    searchQuery = searchdata;
  }
  const totalDocument = await ItemNameModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const itemNameList = await ItemNameModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "created_employee_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: "created_employee_id",
      },
    },
    {
      $unwind: {
        path: "$created_employee_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: { ...searchQuery },
    },
    {
      $sort: { [sortBy]: sort == "desc" ? -1 : 1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);
  if (itemNameList) {
    return res.status(200).json({
      result: itemNameList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: "All Item Name List",
    });
  }
});

export const DropdownItemNameMaster = catchAsync(async (req, res) => {
  // console.log(req.query,"13777");
  const { type } = req.query;

  var matchQuery = {
    status: "active",
  };
  if (type && type != "") {
    matchQuery = {
      ...matchQuery,
      type: type,
    };
  }
  const list = await ItemNameModel.aggregate([
    {
      $match: matchQuery,
    },
    {
      $project: {
        item_name: 1,
      },
    },
  ]);
  res.status(200).json({
    result: list,
    status: true,
    message: "Item Name Dropdown List",
  });
});

// export const BulkUploadItemMaster = catchAsync(async (req, res, next) => {
//   const file = req.file;
//   const workbook = XLSX.readFile(file.path);
//   const worksheet = workbook.Sheets[workbook.SheetNames[0]];
//   const data = XLSX.utils.sheet_to_json(worksheet);

//   const session = await ItemNameModel.startSession();
//   session.startTransaction();

//   try {
//     if (data.length === 0) {
//       return res.status(400).json({
//         result: [],
//         status: false,
//         message: "No items found in the uploaded file.",
//       });
//     }

//     const authUserDetail = req.userDetails;

//     for (const item of data) {
//       const requiredFields = ["item_name"];

//       for (const field of requiredFields) {
//         if (!item[field]) {
//           await session.abortTransaction();
//           session.endSession();
//           return res.status(400).json({
//             result: [],
//             status: false,
//             message: `${field} is required for all items.`,
//           });
//         }
//       }

//       const itemMasterData = {
//         item_name: item.item_name,
//         item_name_remarks: item.item_name_remarks,
//         created_employee_id: authUserDetail._id,
//       };

//       const newItemMaster = new ItemNameModel(itemMasterData);
//       const savedItemMaster = await newItemMaster.save({ session });
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return res.status(201).json({
//       result: [],
//       status: true,
//       message: "Item Master bulk uploaded successfully.",
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     return next(error);
//   }
// });

export const BulkUploadItemMaster = catchAsync(async (req, res, next) => {
  const file = req.file;
  const workbook = XLSX.readFile(file.path);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const session = await ItemNameModel.startSession();
  session.startTransaction();

  try {
    if (data.length === 0) {
      throw new Error("No items found in the uploaded file.");
    }

    const authUserDetail = req.userDetails;
    const bulkInsertData = [];

    for (const item of data) {
      const requiredFields = ["item_name"];

      for (const field of requiredFields) {
        if (!item[field]) {
          throw new Error(`${field} is required for all items.`);
        }
      }

      const itemMasterData = {
        item_name: item.item_name,
        item_name_remarks: item.item_name_remarks,
        created_employee_id: authUserDetail._id,
      };

      bulkInsertData.push(itemMasterData);
    }

    await ItemNameModel.insertMany(bulkInsertData, { session });
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      result: [],
      status: true,
      message: "Item Master bulk uploaded successfully.",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({
      result: [],
      status: false,
      message: error.message || "An error occurred while uploading item master.",
    });
  }
});
