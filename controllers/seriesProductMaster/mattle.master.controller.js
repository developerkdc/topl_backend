import catchAsync from '../../utils/errors/catchAsync.js';
import ApiError from '../../utils/errors/apiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../utils/dymanicFilter.js';
import mongoose from 'mongoose';
import mattleModel from '../../database/schema/seriesProductMaster/mattle.master.schema.js';

export const addMattle = catchAsync(async (req, res, next) => {
  const reqBody = req.body;
  const authUserDetails = req.userDetails;
  const image = req.file;
  const required_array_fields = [
    'size',
    "veneer_sub_category",
    "base_sub_category",
    'instructions',
    'base',
    'process_flow',
  ];
  let field;
  try {
    for (field of required_array_fields) {
      reqBody[field] = JSON.parse(reqBody[field]);
      if (!Array.isArray(reqBody[field])) {
        return next(
          new ApiError(
            `Invalid Data Type : ${field} Must be an array`,
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }
  } catch (error) {
    throw new ApiError(
      `Invalid Data Type : ${field} Must be an array`,
      StatusCodes.BAD_REQUEST
    );
  }
  const maxNumber = await mattleModel.aggregate([
    {
      $group: {
        _id: null,
        max: { $max: '$sr_no' },
      },
    },
  ]);

  const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;
  const itemDetails = {
    ...reqBody,
    sr_no: maxSrNo,
    image: image,
    created_by: authUserDetails?._id,
    updated_by: authUserDetails?._id,
  };
  const newData = new mattleModel(itemDetails);

  await newData.save();

  const response = new ApiResponse(
    StatusCodes.CREATED,
    'Item Added Successfully',
    newData
  );

  return res.status(StatusCodes.CREATED).json(response);
});

export const updateMattleDetails = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const reqBody = req.body;
  const authUserDetails = req.userDetails;
  const image = req.file ? req.file : reqBody?.image;

  if (!id) {
    return next(new ApiError('Id is missing', StatusCodes.NOT_FOUND));
  }

  const required_array_fields = [
    'size',
    "veneer_sub_category",
    "base_sub_category",
    'base',
    'process_flow',
  ];
  let field;
  try {
    for (field of required_array_fields) {
      reqBody[field] = JSON.parse(reqBody[field]);
      if (!Array.isArray(reqBody[field])) {
        return next(
          new ApiError(
            `Invalid Data Type : ${field} Must be an array`,
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }
  } catch (error) {
    throw new ApiError(
      `Invalid Data Type : ${field} Must be an array`,
      StatusCodes.BAD_REQUEST
    );
  }

  const updatedDetails = {
    ...reqBody,
    image: image,
    updated_by: authUserDetails?._id,
  };

  const updateResponse = await mattleModel.updateOne(
    { _id: id },
    {
      $set: updatedDetails,
    },
    { runValidators: true }
  );

  if (updateResponse.matchedCount <= 0) {
    return next(new ApiError('Document Not Found..', StatusCodes.NOT_FOUND));
  }
  if (!updateResponse.acknowledged || updateResponse.modifiedCount <= 0) {
    return next(
      new ApiError(
        'Failed to update document',
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }

  const response = new ApiResponse(
    StatusCodes.OK,
    'Item Updated Successfully',
    updateResponse
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetchMattleList = catchAsync(async (req, res, next) => {
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

  const result = await mattleModel.aggregate(listAggregate);

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

  const totalDocument = await mattleModel.aggregate(totalAggregate);
  console.log(totalDocument);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Mattle Details Fetched Successfully',
    {
      data: result,
      totalPages: totalPages,
    }
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetchSingleMattle = catchAsync(async (req, res, next) => {
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

  const result = await mattleModel.aggregate(aggregate);

  if (result && result?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    StatusCodes.OK,
    'Data Fetched Successfully',
    result?.[0]
  );
  return res.status(StatusCodes.OK).json(response);
});

export const dropdownMattle = catchAsync(async (req, res, next) => {
  const result = await mattleModel.aggregate([
    {
      $match: { status: true },
    },
    {
      $project: {
        code: 1,
      },
    },
  ]);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Mattle Dropdown Fetched Successfully',
    result
  );

  return res.status(StatusCodes.OK).json(response);
});

export const updateStatus = catchAsync(async (req, res, next) => {
  const { id, status } = req.body;

  if (!id) {
    throw new ApiError('ID is missing', StatusCodes.BAD_REQUEST);
  }

  const update_result = await mattleModel.findByIdAndUpdate(id, {
    $set: {
      status: status,
    },
  });

  if (!update_result) {
    throw new ApiError('Failed to update status', StatusCodes.BAD_REQUEST);
  }

  const response = new ApiResponse(
    StatusCodes.OK,
    'Status Updated Sucessfully'
  );

  return res.status(StatusCodes.OK).json(response);
});
