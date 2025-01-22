import mongoose from 'mongoose';
import ItemCodeModel from '../../database/schema/masters/itemCode.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
export const AddItemCodeMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const itemCodeData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
  };
  const newItemCodeList = new ItemCodeModel(itemCodeData);
  const savedItemCode = await newItemCodeList.save();
  return res.status(201).json({
    result: savedItemCode,
    status: true,
    message: 'Item code created successfully',
  });
});

export const UpdateItemCodeMaster = catchAsync(async (req, res) => {
  const itemCodeId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(itemCodeId)) {
    return res
      .status(400)
      .json({ result: [], status: false, message: 'Invalid item code ID' });
  }
  const itemCode = await ItemCodeModel.findByIdAndUpdate(
    itemCodeId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!itemCode) {
    return res.status(404).json({
      result: [],
      status: false,
      message: 'Item code not found.',
    });
  }
  res.status(200).json({
    result: itemCode,
    status: true,
    message: 'Updated successfully',
  });
});

export const ListItemCodeMaster = catchAsync(async (req, res) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = 'updated_at',
    sort = 'desc',
  } = req.query;
  const search = req.query.search || '';
  let searchQuery = {};
  if (search != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(
      search,
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
  const totalDocument = await ItemCodeModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const itemCodeList = await ItemCodeModel.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'created_employee_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: 'created_employee_id',
      },
    },
    {
      $unwind: {
        path: '$created_employee_id',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: { ...searchQuery },
    },
    {
      $sort: { [sortBy]: sort == 'desc' ? -1 : 1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);
  if (itemCodeList) {
    return res.status(200).json({
      result: itemCodeList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: 'All Item Code List',
    });
  }
});
export const DropdownItemCodeMaster = catchAsync(async (req, res) => {
  const list = await ItemCodeModel.aggregate([
    {
      $match: {
        status: 'active',
      },
    },
    {
      $project: {
        item_code: 1,
      },
    },
  ]);
  res.status(200).json({
    result: list,
    status: true,
    message: 'Item Code Dropdown List',
  });
});
