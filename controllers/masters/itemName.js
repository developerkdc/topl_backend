import mongoose from 'mongoose';
import ItemNameModel from '../../database/schema/masters/itemName.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';

import XLSX from 'xlsx';
import ApiError from '../../utils/errors/apiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';
import { StockItemJSONtoXML } from '../../utils/tally-utils/TallyLedgerCreation.js';
import { sendToTally } from '../../utils/tally-utils/TallyService.js';

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
    ...req.body,
    created_by,
  };
  const newItemNameList = new ItemNameModel(itemNameData);
  const savedItemName = await newItemNameList.save();

  try {
    await create_stock_item_helper(savedItemName._id);
  } catch (err) {
    console.error("Tally sync failed manually update item to sync it to tally:", savedItemName._id, err.message);
  }

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

  try {
    await create_stock_item_helper(ItemName._id);
  } catch (err) {
    console.error("Tally sync failed:", ItemName._id, err.message);
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
        _id: 1,
        sr_no: 1,
        item_name: 1,
        alternate_item_name_details: 1,
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
  // const totalDocs = await ItemNameModel.countDocuments({ ...searchQuery });

  const totalDocs = await ItemNameModel.aggregate([
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
      $count: "totalCount"
    }
  ]);

  const totalPage = Math.ceil(totalDocs?.[0]?.totalCount / limitInt);
  return res.json(
    new ApiResponse(StatusCodes.OK, 'All Details fetched succesfully..', {
      allDetails,
      totalPage,
    })
  );
});

export const DropdownItemNameMaster = catchAsync(async (req, res) => {
  const { type, subcategory, process } = req.query;

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
        _id: 1,
        sr_no: 1,
        item_name: 1,
        category: 1,
        item_subcategory: 1,
        color: 1,
        item_name_code: 1,
        alternate_item_name_details: 1,
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

// add tally item name ONLY FOR TESTING API
export const create_stock_item = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    const pipeline = [
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(id),
        },
      },
      {
        $lookup: {
          from: 'item_name',
          localField: '_id',
          foreignField: 'item_id',
          as: 'item_name_details',
        },
        // $lookup: {
        //   from: 'item_categories',
        //   localField: 'category',
        //   foreignField: '_id',
        //   as: 'categoryDetails',
        // },
      },
      {
        $unwind: { path: '$item_name_details', preserveNullAndEmptyArrays: true },
      },
      // {
      //   $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true },
      // },
    ];
    const result = await ItemNameModel.aggregate(pipeline);
    const item = result[0];
    console.log("item: ", item);
    if (!item) return res.status(404).json({ error: "Item not found" });
    const xml = StockItemJSONtoXML(item);

    if (!xml)
      return res.status(500).json({ error: "XML generation failed" });

    const response = await sendToTally(xml);
    // console.log("Tally Response:", response);
    res.status(200).json({
      success: true,
      message: "Invoice pushed to Tally",
      response,
    });
  } catch (err) {
    next(err);
  }
});

// add tally item name
export const create_stock_item_helper = async (itemId) => {
  const pipeline = [
    { $match: { _id: mongoose.Types.ObjectId.createFromHexString(itemId.toString()) } },
    {
      $lookup: {
        from: 'item_name',
        localField: '_id',
        foreignField: 'item_id',
        as: 'item_name_details',
      },
    },
    { $unwind: { path: '$item_name_details', preserveNullAndEmptyArrays: true } },
  ];

  const result = await ItemNameModel.aggregate(pipeline);
  const item = result[0];
  if (!item) throw new Error(`Item not found: ${itemId}`);

  const xml = StockItemJSONtoXML(item);
  if (!xml) throw new Error("XML generation failed");

  const response = await sendToTally(xml);
  if (response.includes("<ERRORS>0</ERRORS>")) {
    await ItemNameModel.findByIdAndUpdate(itemId, {
      tally_item_name: item.item_name,
    });
  }
  return response;
};