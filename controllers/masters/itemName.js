import mongoose from 'mongoose';
import ItemNameModel from '../../database/schema/masters/itemName.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';

import XLSX from 'xlsx';
import ApiError from '../../utils/errors/apiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';

export const AddItemNameMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const { item_name, category, color, item_subcategory, item_name_code } =
    req.body;
  if (!item_name || !category || !item_subcategory) {
    return res.json(
      new ApiResponse(StatusCodes.NOT_FOUND, 'all fields are required')
    );
  }

  const maxNumber = await ItemNameModel.aggregate([
    {
      $group: {
        _id: null,
        max: {
          $max: '$sr_no',
        },
      },
    },
  ]);

  const created_by = authUserDetail.id;

  const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
  const itemNameData = {
    sr_no: newMax,
    item_name,
    color,
    category,
    item_subcategory,
    item_name_code,
    created_by,
  };
  const newItemNameList = new ItemNameModel(itemNameData);
  const savedItemName = await newItemNameList.save();
  return res
    .status(201)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        'Item created successfully..',
        savedItemName
      )
    );
});

export const UpdateItemNameMaster = catchAsync(async (req, res) => {
  const ItemNameId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(ItemNameId)) {
    return res
      .status(400)
      .json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid id'));
  }
  const ItemName = await ItemNameModel.findByIdAndUpdate(
    ItemNameId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!ItemName) {
    return res
      .status(404)
      .json(new ApiResponse(StatusCodes.NOT_FOUND, 'Item Not found...'));
  }
  res
    .status(200)
    .json(new ApiResponse(StatusCodes.OK, 'Item Updated successfully...'));
});

export const ListItemNameMaster = catchAsync(async (req, res) => {
  const {
    query,
    sortField = 'updatedAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const skipped = (pageInt - 1) * limitInt;

  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  const sortObj = sortField
    ? { [sortField]: sortDirection }
    : { updatedAt: -1 };
  let searchQuery = {};
  if (query != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(
      query,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          user: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    {
      $lookup: {
        from: 'item_categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    {
      $lookup: {
        from: 'item_subcategories',
        localField: 'item_subcategory',
        foreignField: '_id',
        as: 'subCategoryDetails',
      },
    },
    { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
    // { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
    { $match: { ...searchQuery } },

    {
      $project: {
        sr_no: 1,
        item_name: 1,
        createdAt: 1,
        created_by: 1,
        'userDetails.first_name': 1,
        'userDetails.user_name': 1,
        'categoryDetails._id': 1,
        'categoryDetails.category': 1,
        'subCategoryDetails.name': 1,
        'subCategoryDetails._id': 1,
        item_name_code: 1,
        color: 1,
      },
    },
    { $sort: sortObj },
    { $skip: skipped },
    { $limit: limitInt },
  ];

  // if (Object.keys(sortObj).length > 0) {
  //   pipeline.push({ $sort: sortObj });
  // }
  const allDetails = await ItemNameModel.aggregate(pipeline);

  if (allDetails.length === 0) {
    return res.json(new ApiResponse(StatusCodes.OK, 'NO Data found...'));
  }
  const totalDocs = await ItemNameModel.countDocuments({ ...searchQuery });
  const totalPage = Math.ceil(totalDocs / limitInt);
  return res.json(
    new ApiResponse(StatusCodes.OK, 'All Details fetched succesfully..', {
      allDetails,
      totalPage,
    })
  );
});

export const DropdownItemNameMaster = catchAsync(async (req, res) => {
  const { type, subcategory } = req.query;

  const searchQuery = {};

  if (type) {
    searchQuery['categoryDetails.category'] = type;
  }

  if (subcategory) {
    searchQuery['subCategoryDetails.name'] = subcategory;
  }

  if (type && subcategory) {
    searchQuery['$and'] = [
      { 'categoryDetails.category': type },
      { 'subCategoryDetails.name': subcategory },
    ];
  }

  const list = await ItemNameModel.aggregate([
    {
      $lookup: {
        from: 'item_categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    {
      $lookup: {
        from: 'item_subcategories',
        localField: 'item_subcategory',
        foreignField: '_id',
        as: 'subCategoryDetails',
      },
    },
    // {
    //   $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true },
    // },
    // {
    //   $unwind: {
    //     path: '$subCategoryDetails',
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
    {
      $match: searchQuery,
    },
    {
      $sort: { item_name: 1 },
    },
    {
      $project: {
        item_name: 1,
        category: 1,
        item_subcategory: 1,
        color: 1,
        item_name_code: 1,
      },
    },
    {
      $sort: { item_name: 1 },
    },
  ]).collation({ locale: 'en', caseLevel: true });

  res
    .status(200)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        'Item Name dropdown fetched successfully....',
        list
      )
    );
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
      throw new Error('No items found in the uploaded file.');
    }

    const authUserDetail = req.userDetails;
    const bulkInsertData = [];

    for (const item of data) {
      const requiredFields = ['item_name'];

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
      message: 'Item Master bulk uploaded successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({
      result: [],
      status: false,
      message:
        error.message || 'An error occurred while uploading item master.',
    });
  }
});
