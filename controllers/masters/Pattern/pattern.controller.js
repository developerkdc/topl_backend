import mongoose from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import patternModel from '../../../database/schema/masters/pattern.schema.js';

export const addPattern = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  const authUserDetail = req.userDetails;

  if (!name) {
    return next(new ApiError('Pattern Name is required', 400));
  }

  const maxNumber = await patternModel.aggregate([
    {
      $group: {
        _id: null,
        max: { $max: '$sr_no' },
      },
    },
  ]);

  const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;
  const patternData = {
    name: name,
    sr_no: maxSrNo,
    created_by: authUserDetail?._id,
    updated_by: authUserDetail?._id,
  };

  const savePatternData = new patternModel(patternData);
  await savePatternData.save();

  if (!savePatternData) {
    return next(new ApiError('Failed to insert data', 400));
  }

  const response = new ApiResponse(
    201,
    'Pattern Added Successfully',
    savePatternData
  );

  return res.status(201).json(response);
});

export const updatePattern = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, status } = req.body;
  const authUserDetail = req.userDetails;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const patternData = {
    name: name,
    status: status,
    updated_by: authUserDetail?._id,
  };

  const updatePatternData = await patternModel.updateOne(
    { _id: id },
    {
      $set: patternData,
    }
  );

  if (updatePatternData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (!updatePatternData.acknowledged || updatePatternData.modifiedCount <= 0) {
    return next(new ApiError('Failed to update document', 400));
  }

  const response = new ApiResponse(
    200,
    'Pattern Update Successfully',
    updatePatternData
  );

  return res.status(200).json(response);
});

export const fetchPatternList = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sort = 'desc',
    search = '',
  } = req.query;

  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  let search_query = {};

  if (search != '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
  };

  // Aggregation stage
  const aggCreatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'created_by',
    },
  };
  const aggUpdatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'updated_by',
    },
  };
  const aggCreatedByUnwind = {
    $unwind: {
      path: '$created_by',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUpdatedByUnwind = {
    $unwind: {
      path: '$updated_by',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggMatch = {
    $match: {
      ...match_query,
    },
  };
  const aggSort = {
    $sort: {
      [sortBy]: sort === 'desc' ? -1 : 1,
    },
  };
  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };
  const aggLimit = {
    $limit: parseInt(limit),
  };

  const listAggregate = [
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const patternData = await patternModel.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggCount,
  ]; // total aggregation pipiline

  const totalDocument = await patternModel.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(200, 'Pattern Data Fetched Successfully', {
    data: patternData,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
});

export const fetchSinglePattern = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const aggregate = [
    {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(id),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              user_name: 1,
              user_type: 1,
              dept_name: 1,
              first_name: 1,
              last_name: 1,
              email_id: 1,
              mobile_no: 1,
            },
          },
        ],
        as: 'created_by',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'updated_by',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              user_name: 1,
              user_type: 1,
              dept_name: 1,
              first_name: 1,
              last_name: 1,
              email_id: 1,
              mobile_no: 1,
            },
          },
        ],
        as: 'updated_by',
      },
    },
    {
      $unwind: {
        path: '$created_by',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$updated_by',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const patternData = await patternModel.aggregate(aggregate);

  if (patternData && patternData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    200,
    'Pattern Data Fetched Successfully',
    patternData?.[0]
  );
  return res.status(200).json(response);
});

export const dropdownPattern = catchAsync(async (req, res, next) => {
  const patternList = await patternModel.aggregate([
    {
      $match: {
        status: true,
      },
    },
    {
      $project: {
        name: 1,
      },
    },
  ]);

  const response = new ApiResponse(
    200,
    'Pattern Dropdown Fetched Successfully',
    patternList
  );
  return res.status(200).json(response);
});
