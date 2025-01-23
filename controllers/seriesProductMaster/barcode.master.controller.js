import catchAsync from '../../utils/errors/catchAsync.js';
import ApiError from '../../utils/errors/apiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';
import barcodeModel from '../../database/schema/seriesProductMaster/barcode.master.schema.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../utils/dymanicFilter.js';
import mongoose from 'mongoose';

export const addBarcode = catchAsync(async (req, res, next) => {
  // const requiredFields = ['code', 'base', 'size', 'category', 'instructions'];
  const reqBody = req.body;
  const authUserDetails = req.userDetails;

  // for (let field of requiredFields) {
  //     if (!reqBody[field]) {
  //         return next(
  //             new ApiError(`${field} is missing ...`, StatusCodes.NOT_FOUND)
  //         );
  //     }
  // }
  const maxNumber = await barcodeModel.aggregate([{
    $group: {
      _id: null,
      max: { $max: "$sr_no" }
    }
  }]);

  const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1
  const barcodeDetails = {
    ...reqBody,
    sr_no: maxSrNo,
    created_by: authUserDetails?._id,
    updated_by: authUserDetails?._id,
  };
  const newBarcode = new barcodeModel(barcodeDetails);

  await newBarcode.save();

  const response = new ApiResponse(
    StatusCodes.CREATED,
    'Barcode Added Successfully',
    newBarcode
  );

  return res.status(StatusCodes.CREATED).json(response);
});

export const updateBarcodeDetails = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const reqBody = req.body;
  const authUserDetails = req.userDetails;

  if (!id) {
    return next(new ApiError('Barcode id is missing', StatusCodes.NOT_FOUND));
  }
  const updatedDetails = {
    ...reqBody,
    updated_by: authUserDetails?._id,
  };

  const updateResponse = await barcodeModel.updateOne(
    { _id: id },
    {
      $set: updatedDetails,
    },
    { new: true, runValidators: true }
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
    'Barcode Updated Successfully',
    updateResponse
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetchBarcodeList = catchAsync(async (req, res, next) => {
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

  const barcodeData = await barcodeModel.aggregate(listAggregate);

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

  const totalDocument = await barcodeModel.aggregate(totalAggregate);
  console.log(totalDocument);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Barcode Details Fetched Successfully',
    {
      data: barcodeData,
      totalPages: totalPages,
    }
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetchSingleBarcode = catchAsync(async (req, res, next) => {
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

  const barcodeData = await barcodeModel.aggregate(aggregate);

  if (barcodeData && barcodeData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    StatusCodes.OK,
    'Barcode Data Fetched Successfully',
    barcodeData?.[0]
  );
  return res.status(StatusCodes.OK).json(response);
});

export const dropdownBarcode = catchAsync(async (req, res, next) => {
  const barcodeList = await barcodeModel.aggregate([
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
    'Barcode Dropdown Fetched Successfully',
    barcodeList
  );

  return res.status(StatusCodes.OK).json(response);
});
