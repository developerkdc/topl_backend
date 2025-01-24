import mongoose from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import transporterModel, {
  transporter_type,
} from '../../../database/schema/masters/transporter.schema.js';

export const addTransporter = catchAsync(async (req, res, next) => {
  const { name, branch, transport_id, type } = req.body;
  const authUserDetail = req.userDetails;

  const requiredField = ['name', 'type'];

  for (let field of requiredField) {
    if (!req.body[field]) {
      return next(new ApiError(`${field} field is required`, 400));
    }
  }


  const maxNumber = await transporterModel.aggregate([{
    $group: {
      _id: null,
      max: { $max: "$sr_no" }
    }
  }]);

  const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1

  const transporterData = {
    sr_no: maxSrNo,
    name: name,
    branch: branch,
    transport_id: transport_id,
    type: type,
    created_by: authUserDetail?._id,
    updated_by: authUserDetail?._id,
  };

  const saveTransporterData = new transporterModel(transporterData);
  await saveTransporterData.save();

  if (!saveTransporterData) {
    return next(new ApiError('Failed to insert data', 400));
  }

  const response = new ApiResponse(
    201,
    'Transporter Added Successfully',
    saveTransporterData
  );

  return res.status(201).json(response);
});

export const updateTransporter = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, branch, transport_id, type, status } = req.body;
  const authUserDetail = req.userDetails;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const transporterData = {
    name: name,
    branch: branch,
    transport_id: transport_id,
    type: type,
    status: status,
    updated_by: authUserDetail?._id,
  };

  const updateTransporterData = await transporterModel.updateOne(
    { _id: id },
    {
      $set: transporterData,
    }
  );

  if (updateTransporterData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (
    !updateTransporterData.acknowledged ||
    updateTransporterData.modifiedCount <= 0
  ) {
    return next(new ApiError('Failed to update document', 400));
  }

  const response = new ApiResponse(
    200,
    'Transporter Update Successfully',
    updateTransporterData
  );

  return res.status(200).json(response);
});

export const fetchTransporterList = catchAsync(async (req, res, next) => {
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

  const transporterData = await transporterModel.aggregate(listAggregate);

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

  const totalDocument = await transporterModel.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    200,
    'Transporter Data Fetched Successfully',
    {
      data: transporterData,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

export const fetchSingleTransporter = catchAsync(async (req, res, next) => {
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

  const transporterData = await transporterModel.aggregate(aggregate);

  if (transporterData && transporterData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    200,
    'Transporter Data Fetched Successfully',
    transporterData?.[0]
  );
  return res.status(200).json(response);
});

export const dropdownTransporter = catchAsync(async (req, res, next) => {
  const transporterList = await transporterModel.aggregate([
    {
      $match: {
        status: true,
      },
    },
    {
      $project: {
        name: 1,
        branch: 1,
        transport_id: 1,
        transporter_type: 1,
      },
    },
  ]);

  const response = new ApiResponse(
    200,
    'Transporter Dropdown Fetched Successfully',
    transporterList
  );
  return res.status(200).json(response);
});
