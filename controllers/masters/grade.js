import mongoose from 'mongoose';
import GradeModel from '../../database/schema/masters/grade.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
export const AddGradeMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const gradeData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
  };
  const newGradeList = new GradeModel(gradeData);
  const savedGrade = await newGradeList.save();
  return res.status(201).json({
    result: savedGrade,
    status: true,
    message: 'Grade created successfully',
  });
});

export const UpdateGradeMaster = catchAsync(async (req, res) => {
  const userId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res
      .status(400)
      .json({ result: [], status: false, message: 'Invalid Grade ID' });
  }
  const user = await GradeModel.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!user) {
    return res.status(404).json({
      result: [],
      status: false,
      message: 'User not found.',
    });
  }
  res.status(200).json({
    result: user,
    status: true,
    message: 'Updated successfully',
  });
});

export const ListGradeMaster = catchAsync(async (req, res) => {
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
  const totalDocument = await GradeModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const gradeList = await GradeModel.aggregate([
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
  if (gradeList) {
    return res.status(200).json({
      result: gradeList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: 'All Grade List',
    });
  }
});

export const DropdownGradeMaster = catchAsync(async (req, res) => {
  const list = await GradeModel.aggregate([
    {
      $match: {
        status: 'active',
      },
    },
    {
      $sort: { grade_name: 1 },
    },
    {
      $project: {
        grade_name: 1,
      },
    },
  ]);
  res.status(200).json({
    result: list,
    status: true,
    message: 'Grade Dropdown List',
  });
});
