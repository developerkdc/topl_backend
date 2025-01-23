import mongoose from 'mongoose';
import UnitModel from '../../database/schema/masters/unit.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';

export const AddUnitMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const unitData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
  };
  const newUnitList = new UnitModel(unitData);
  const savedUnit = await newUnitList.save();
  return res.status(201).json({
    result: savedUnit,
    status: true,
    message: 'Unit created successfully',
  });
});

export const UpdateUnitMaster = catchAsync(async (req, res) => {
  const unitId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(unitId)) {
    return res
      .status(400)
      .json({ result: [], status: false, message: 'Invalid unit ID' });
  }
  const unit = await UnitModel.findByIdAndUpdate(
    unitId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!unit) {
    return res.status(404).json({
      result: [],
      status: false,
      message: 'Unit not found.',
    });
  }
  res.status(200).json({
    result: unit,
    status: true,
    message: 'Updated successfully',
  });
});

export const ListUnitMaster = catchAsync(async (req, res) => {
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
  const totalDocument = await UnitModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const unitList = await UnitModel.aggregate([
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
  ]).collation({ locale: 'en', caseLevel: true });
  if (unitList) {
    return res.status(200).json({
      result: unitList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: 'All UnitList List',
    });
  }
});

export const DropdownUnitMaster = catchAsync(async (req, res) => {
  const list = await UnitModel.aggregate([
    {
      $match: {
        status: 'active',
      },
    },
    {
      $sort: { unit_name: 1 },
    },
    {
      $project: {
        unit_name: 1,
      },
    },
  ]);
  res.status(200).json({
    result: list,
    status: true,
    message: 'Unit Dropdown List',
  });
});
