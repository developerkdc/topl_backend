import catchAsync from '../../utils/errors/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';
import machineModel from '../../database/schema/masters/machine.schema.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import mongoose from 'mongoose';

export const addMachine = catchAsync(async (req, res) => {
  const { machine_name, department } = req.body;

  if (!machine_name || !department) {
    return res.json(
      new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'all fields are required'
      )
    );
  }
  const checkIfAlreadyExists = await machineModel.find({
    machine_name: machine_name,
  });
  if (checkIfAlreadyExists.length > 0) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        new ApiResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Machine Name already exists'
        )
      );
  }

  const maxNumber = await machineModel.aggregate([
    {
      $group: {
        _id: null,
        max: {
          $max: '$sr_no',
        },
      },
    },
  ]);

  const created_by = req.userDetails.id;

  const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
  const newMachine = new machineModel({
    sr_no: newMax,
    machine_name,
    department,
    created_by,
  });
  await newMachine.save();

  return res.json(
    new ApiResponse(StatusCodes.OK, 'Machine created successfully', newMachine)
  );
});

export const editMachineDetails = catchAsync(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Id is missing')
    );
  }

  const validateMachine = await machineModel.findById(id);
  if (!validateMachine) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid machine id')
    );
  }

  const updatedData = await machineModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { runValidators: true, new: true }
  );
  if (!updatedData) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Err updating machine')
    );
  }
  return res.json(
    new ApiResponse(StatusCodes.OK, 'department updated successfully')
  );
});

export const MachineDetails = catchAsync(async (req, res) => {
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
        from: 'departments',
        localField: 'department',
        foreignField: '_id',
        as: 'departmentDetails',
      },
    },
    { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
    {
      $unwind: { path: '$departmentDetails', preserveNullAndEmptyArrays: true },
    },
    { $match: { ...searchQuery } },
    {
      $project: {
        sr_no: 1,
        machine_name: 1,
        createdAt: 1,
        created_by: 1,
        'userDetails.first_name': 1,
        'userDetails.user_name': 1,
        'departmentDetails._id': 1,
        'departmentDetails.dept_name': 1,
      },
    },
    { $sort: sortObj },
    { $skip: skipped },
    { $limit: limitInt },
  ];

  // if (Object.keys(sortObj).length > 0) {
  //   pipeline.push({ $sort: sortObj });
  // }
  const allDetails = await machineModel.aggregate(pipeline);
  if (allDetails.length === 0) {
    return res.json(new ApiResponse(StatusCodes.OK, 'NO Data found...'));
  }

  const totalDocs = await machineModel.countDocuments({ ...searchQuery });
  const totalPage = Math.ceil(totalDocs / limitInt);
  return res.json(
    new ApiResponse(StatusCodes.OK, 'All Details fetched succesfully..', {
      allDetails,
      totalPage,
    })
  );
});

export const DropdownMachineNameMaster = catchAsync(async (req, res) => {
  const { type } = req.query;

  const searchQuery = type
    ? {
      $or: [{ 'deptDetails.dept_name': { $regex: type, $options: 'i' } }],
    }
    : {};

  const list = await machineModel.aggregate([
    {
      $lookup: {
        from: 'departments',
        localField: 'department',
        foreignField: '_id',
        as: 'deptDetails',
      },
    },
    {
      $unwind: '$deptDetails',
    },
    {
      $match: searchQuery,
    },
    {
      $sort: { machine_name: 1 },
    },
    {
      $project: {
        machine_name: 1,
      },
    },
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        'Machine Name dropdown fetched successfully....',
        list
      )
    );
});

export const DropdownMachineNameMasterById = catchAsync(async (req, res) => {
  const { id } = req.query;

  // const searchQuery = type
  //   ? {
  //     $or: [{ "deptDetails.dept_name": { $regex: type, $options: "i" } }],
  //   }
  //   : {};

  const list = await machineModel.aggregate([
    {
      $lookup: {
        from: 'departments',
        localField: 'department',
        foreignField: '_id',
        as: 'deptDetails',
      },
    },
    {
      $unwind: '$deptDetails',
    },
    {
      $match: { department: new mongoose.Types.ObjectId(id) },
    },
    {
      $sort: { machine_name: 1 },
    },
    {
      $project: {
        machine_name: 1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        'Machine Name dropdown fetched successfully....',
        list
      )
    );
});
