import seriesModel from '../../database/schema/masters/series.schema.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../utils/errors/catchAsync.js';

export const addSeries = catchAsync(async (req, res) => {
  const { series_name, remark } = req.body;

  if (!series_name) {
    return res.json(
      new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Series name is required'
      )
    );
  }
  const checkIfAlreadyExists = await seriesModel.find({
    series_name: series_name,
  });
  if (checkIfAlreadyExists.length > 0) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        new ApiResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Series already exists'
        )
      );
  }

  const maxNumber = await seriesModel.aggregate([
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

  const newSeries = new seriesModel({
    sr_no: newMax,
    series_name,
    remark,
    created_by,
  });
  await newSeries.save();

  return res.json(
    new ApiResponse(StatusCodes.OK, 'Series created successfully', newSeries)
  );
});

export const editSeries = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Id is missing')
    );
  }

  const validateDept = await seriesModel.findById(id);
  if (!validateDept) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid series id')
    );
  }

  const updatedData = await seriesModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { runValidators: true, new: true }
  );
  if (!updatedData) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Err updating series')
    );
  }
  return res.json(
    new ApiResponse(StatusCodes.OK, 'Series updated successfully')
  );
});

export const listSeriesDetails = catchAsync(async (req, res) => {
  const { query, sortField, sortOrder, page, limit } = req.query;
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
  const sortObj = sortField ? { [sortField]: sortDirection } : {};
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
    { $unwind: '$userDetails' },
    { $match: { ...searchQuery } },
    {
      $project: {
        sr_no: 1,
        series_name: 1,
        remark: 1,
        createdAt: 1,
        created_by: 1,
        'userDetails.first_name': 1,
        'userDetails.user_name': 1,
      },
    },
    { $skip: skipped },
    { $limit: limitInt },
  ];

  if (Object.keys(sortObj).length > 0) {
    pipeline.push({ $sort: sortObj });
  }
  const allDetails = await seriesModel.aggregate(pipeline);
  if (allDetails.length === 0) {
    return res.json(new ApiResponse(StatusCodes.OK, 'NO Data found...'));
  }

  const totalDocs = await seriesModel.countDocuments({ ...searchQuery });
  const totalPage = Math.ceil(totalDocs / limitInt);
  return res.json(
    new ApiResponse(StatusCodes.OK, 'All Details fetched succesfully..', {
      allDetails,
      totalPage,
    })
  );
});

export const DropdownSeriesNameMaster = catchAsync(async (req, res) => {
  const { type } = req.query;

  const searchQuery = type
    ? {
        $or: [{ series_name: { $regex: type, $options: 'i' } }],
      }
    : {};

  const list = await seriesModel.aggregate([
    {
      $match: searchQuery,
    },
    {
      $sort: { series_name: 1 },
    },
    {
      $project: {
        series_name: 1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        'Series Name dropdown fetched successfully....',
        list
      )
    );
});
