import mongoose from 'mongoose';
import polishModel from '../../../database/schema/masters/polish.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';

export const addPolish = catchAsync(async (req, res, next) => {
  const { name, code} = req.body;
  const authUserDetail = req.userDetails;

  if (!name) {
    return next(new ApiError('Polish Name is required', 400));
  }
  if (!code) {
    return next(new ApiError('Polish Code is required', 400));
  }

  const maxNumber = await polishModel.aggregate([
    {
      $group: {
        _id: null,
        max: { $max: '$sr_no' },
      },
    },
  ]);

  const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;
  const polishData = {
    ...req.body,
    sr_no: maxSrNo,
    created_by: authUserDetail?._id,
    updated_by: authUserDetail?._id,
  };

  const savePolishData = new polishModel(polishData);
  await savePolishData.save();

  if (!savePolishData) {
    return next(new ApiError('Failed to insert data', 400));
  }

  const response = new ApiResponse(
    201,
    'Polish Added Successfully',
    savePolishData
  );

  return res.status(201).json(response);
});

export const updatePolish = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, status } = req.body;
  const authUserDetail = req.userDetails;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const polishData = {
    ...req.body,
    updated_by: authUserDetail?._id,
  };

  const updatePolishData = await polishModel.updateOne(
    { _id: id },
    {
      $set: polishData,
    }
  );

  if (updatePolishData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (
    !updatePolishData.acknowledged ||
    updatePolishData.modifiedCount <= 0
  ) {
    return next(new ApiError('Failed to update document', 500));
  }

  const response = new ApiResponse(
    200,
    'Polish Update Successfully',
    updatePolishData
  );

  return res.status(200).json(response);
});

export const fetchPolishList = catchAsync(async (req, res, next) => {
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

  const polishData = await polishModel.aggregate(listAggregate);

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

  const totalDocument = await polishModel.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(200, 'Polish Data Fetched Successfully', {
    data: polishData,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
});

export const fetchSinglePolish = catchAsync(async (req, res, next) => {
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

  const polishData = await polishModel.aggregate(aggregate);

  if (polishData && polishData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    200,
    'Polish Data Fetched Successfully',
    polishData?.[0]
  );
  return res.status(200).json(response);
});

export const dropdownPolish = catchAsync(async (req, res, next) => {
  const polishList = await polishModel.aggregate([
    {
      $match: {
        status: true,
      },
    },
    {
      $project: {
        name: 1,
        code:1
      },
    },
  ]);

  const response = new ApiResponse(
    200,
    'Polish Dropdown Fetched Successfully',
    polishList
  );
  return res.status(200).json(response);
});
