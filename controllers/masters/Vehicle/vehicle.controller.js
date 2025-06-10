import mongoose from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import vehicleModel from '../../../database/schema/masters/vehicle.js';
import transporterModel from '../../../database/schema/masters/transporter.schema.js';

export const addVehicle = catchAsync(async (req, res, next) => {
  const { vehicle_number, transporter_id } = req.body;
  const authUserDetail = req.userDetails;

  const transporterDetailsByID = await transporterModel.findOne({
    _id: transporter_id,
  });

  if (!transporterDetailsByID) {
    return next(new ApiError('Transporter not found', 404));
  }

  const maxNumber = await vehicleModel.aggregate([
    {
      $group: {
        _id: null,
        max: { $max: '$sr_no' },
      },
    },
  ]);

  const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;

  const vehicleData = {
    sr_no: maxSrNo,
    ...req.body,
    transporter_details: { ...transporterDetailsByID },
    created_by: authUserDetail?._id,
    updated_by: authUserDetail?._id,
  };

  const saveVehicleData = await vehicleModel.create(vehicleData);
  // new vehicleModel(vehicleData);
  // await saveVehicleData.save();

  if (!saveVehicleData) {
    return next(new ApiError('Failed to insert data', 400));
  }

  const response = new ApiResponse(
    201,
    'Vehicle Added Successfully',
    saveVehicleData
  );

  return res.status(201).json(response);
});

export const updateVehicle = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { vehicle_number, status, transporter_id } = req.body;
  const authUserDetail = req.userDetails;

  const transporterDetailsByID = await transporterModel.findOne({
    _id: transporter_id,
  });

  if (!transporterDetailsByID) {
    return next(new ApiError('Transporter not found', 404));
  }
  const vehicleData = {
    ...req.body,
    transporter_details: { ...transporterDetailsByID },
    status: status,
    updated_by: authUserDetail?._id,
  };

  const updateVehicleData = await vehicleModel.updateOne(
    { _id: id },
    {
      $set: vehicleData,
    }
  );

  if (updateVehicleData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (!updateVehicleData.acknowledged || updateVehicleData.modifiedCount <= 0) {
    return next(new ApiError('Failed to update document', 400));
  }

  const response = new ApiResponse(
    200,
    'Vehicle Update Successfully',
    updateVehicleData
  );

  return res.status(200).json(response);
});

export const updateVehicleStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const vehicleData = {
    ...req.body,
  };

  const updateVehicleData = await vehicleModel.updateOne(
    { _id: id },
    {
      $set: vehicleData,
    }
  );

  if (updateVehicleData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (!updateVehicleData.acknowledged || updateVehicleData.modifiedCount <= 0) {
    return next(new ApiError('Failed to update document', 400));
  }

  const response = new ApiResponse(
    200,
    'Vehicle Update Successfully',
    updateVehicleData
  );

  return res.status(200).json(response);
});

// export const fetchVehicleList = catchAsync(async (req, res, next) => {
//   const {
//     page = 1,
//     limit = 10,
//     sortBy = 'createdAt',
//     sort = 'desc',
//     search = '',
//   } = req.query;

//   const {
//     string,
//     boolean,
//     numbers,
//     arrayField = [],
//   } = req?.body?.searchFields || {};

//   const filter = req.body?.filter;

//   let search_query = {};

//   if (search != '' && req?.body?.searchFields) {
//     const search_data = DynamicSearch(
//       search,
//       boolean,
//       numbers,
//       string,
//       arrayField
//     );
//     if (search_data?.length == 0) {
//       return res.status(404).json({
//         statusCode: 404,
//         status: false,
//         data: {
//           data: [],
//         },
//         message: 'Results Not Found',
//       });
//     }
//     search_query = search_data;
//   }

//   const filterData = dynamic_filter(filter);

//   const match_query = {
//     ...filterData,
//     ...search_query,
//   };

//   // Aggregation stage
//   const aggCreatedByLookup = {
//     $lookup: {
//       from: 'users',
//       localField: 'created_by',
//       foreignField: '_id',
//       pipeline: [
//         {
//           $project: {
//             user_name: 1,
//             user_type: 1,
//             dept_name: 1,
//             first_name: 1,
//             last_name: 1,
//             email_id: 1,
//             mobile_no: 1,
//           },
//         },
//       ],
//       as: 'created_by',
//     },
//   };
//   const aggUpdatedByLookup = {
//     $lookup: {
//       from: 'users',
//       localField: 'updated_by',
//       foreignField: '_id',
//       pipeline: [
//         {
//           $project: {
//             user_name: 1,
//             user_type: 1,
//             dept_name: 1,
//             first_name: 1,
//             last_name: 1,
//             email_id: 1,
//             mobile_no: 1,
//           },
//         },
//       ],
//       as: 'updated_by',
//     },
//   };
//   const aggCreatedByUnwind = {
//     $unwind: {
//       path: '$created_by',
//       preserveNullAndEmptyArrays: true,
//     },
//   };
//   const aggUpdatedByUnwind = {
//     $unwind: {
//       path: '$updated_by',
//       preserveNullAndEmptyArrays: true,
//     },
//   };
//   const aggMatch = {
//     $match: {
//       ...match_query,
//     },
//   };
//   const aggSort = {
//     $sort: {
//       [sortBy]: sort === 'desc' ? -1 : 1,
//     },
//   };
//   const aggSkip = {
//     $skip: (parseInt(page) - 1) * parseInt(limit),
//   };
//   const aggLimit = {
//     $limit: parseInt(limit),
//   };

//   const listAggregate = [
//     aggCreatedByLookup,
//     aggCreatedByUnwind,
//     aggUpdatedByLookup,
//     aggUpdatedByUnwind,
//     aggMatch,
//     aggSort,
//     aggSkip,
//     aggLimit,
//   ]; // aggregation pipiline

//   const vehicleData = await vehicleModel.aggregate(listAggregate);

//   const aggCount = {
//     $count: 'totalCount',
//   }; // count aggregation stage

//   const totalAggregate = [
//     aggCreatedByLookup,
//     aggCreatedByUnwind,
//     aggUpdatedByLookup,
//     aggUpdatedByUnwind,
//     aggMatch,
//     aggCount,
//   ]; // total aggregation pipiline

//   const totalDocument = await vehicleModel.aggregate(totalAggregate);

//   const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

//   const response = new ApiResponse(200, 'Vehicle Data Fetched Successfully', {
//     data: vehicleData,
//     totalPages: totalPages,
//   });
//   return res.status(200).json(response);
// });

export const fetchSingleVehicle = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const userLookup = [
    {
      $lookup: {
        from: 'users',
        let: { createdId: '$created_by', updatedId: '$updated_by' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$_id', '$$createdId'] },
                  { $eq: ['$_id', '$$updatedId'] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
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
        as: 'user_data',
      },
    },
    {
      $addFields: {
        created_by: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$user_data',
                as: 'user',
                cond: { $eq: ['$$user._id', '$created_by'] },
              },
            },
            0,
          ],
        },
        updated_by: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$user_data',
                as: 'user',
                cond: { $eq: ['$$user._id', '$updated_by'] },
              },
            },
            0,
          ],
        },
      },
    },
  ];

  const aggregate = [
    {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(id),
      },
    },
    ...userLookup,
    {
      $project: {
        user_data: 0,
      },
    },




    // {
    //   $lookup: {
    //     from: 'users',
    //     localField: 'created_by',
    //     foreignField: '_id',
    //     pipeline: [
    //       {
    //         $project: {
    //           user_name: 1,
    //           user_type: 1,
    //           dept_name: 1,
    //           first_name: 1,
    //           last_name: 1,
    //           email_id: 1,
    //           mobile_no: 1,
    //         },
    //       },
    //     ],
    //     as: 'created_by',
    //   },
    // },
    // {
    //   $lookup: {
    //     from: 'users',
    //     localField: 'updated_by',
    //     foreignField: '_id',
    //     pipeline: [
    //       {
    //         $project: {
    //           user_name: 1,
    //           user_type: 1,
    //           dept_name: 1,
    //           first_name: 1,
    //           last_name: 1,
    //           email_id: 1,
    //           mobile_no: 1,
    //         },
    //       },
    //     ],
    //     as: 'updated_by',
    //   },
    // },
    // {
    //   $unwind: {
    //     path: '$created_by',
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
    // {
    //   $unwind: {
    //     path: '$updated_by',
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
  ];

  const vehicleData = await vehicleModel.aggregate(aggregate);

  if (vehicleData && vehicleData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    200,
    'Vehicle Data Fetched Successfully',
    vehicleData?.[0]
  );
  return res.status(200).json(response);
});

export const dropdownVehicle = catchAsync(async (req, res, next) => {
  const { invoice_date, type, transporter_id } = req.query;
  var matchQuery = {
    status: true,
  };

  if (invoice_date) {
    const date = new Date(invoice_date);
    matchQuery.invoice_date = {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lte: new Date(date.setHours(23, 59, 59, 999)),
    };
  }

  if (type) {
    matchQuery.type = type;
  }

  if (transporter_id) {
    if (!mongoose.isValidObjectId(transporter_id)) {
      return next(new ApiError('Invalid Transporter ID', 400));
    }
    matchQuery.transporter_id =
      mongoose.Types.ObjectId.createFromHexString(transporter_id);
  }

  const vehicleList = await vehicleModel.aggregate([
    {
      $match: {
        ...matchQuery,
      },
    },
  ]);

  const response = new ApiResponse(
    200,
    'Vehicle Dropdown Fetched Successfully',
    vehicleList
  );
  return res.status(200).json(response);
});

export const fetchVehicleList = catchAsync(async (req, res, next) => {
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

  const userLookup = {
    $lookup: {
      from: 'users',
      let: { createdId: '$created_by', updatedId: '$updated_by' },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ['$_id', '$$createdId'] },
                { $eq: ['$_id', '$$updatedId'] },
              ],
            },
          },
        },
        {
          $project: {
            _id: 1,
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
      as: 'user_data',
    },
  };

  const pipeline = [
    userLookup,
    {
      $addFields: {
        created_by: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$user_data',
                as: 'user',
                cond: { $eq: ['$$user._id', '$created_by'] },
              },
            },
            0,
          ],
        },
        updated_by: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$user_data',
                as: 'user',
                cond: { $eq: ['$$user._id', '$updated_by'] },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        user_data: 0,
      },
    },
    {
      $match: match_query,
    },
    {
      $sort: {
        [sortBy]: sort === 'desc' ? -1 : 1,
      },
    },
    {
      $facet: {
        paginatedResults: [
          { $skip: (parseInt(page) - 1) * parseInt(limit) },
          { $limit: parseInt(limit) },
        ],
        totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const result = await vehicleModel.aggregate(pipeline);

  const vehicleData = result[0]?.paginatedResults || [];
  const totalCount = result[0]?.totalCount?.[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const response = new ApiResponse(200, 'Vehicle Data Fetched Successfully', {
    data: vehicleData,
    totalPages,
  });

  return res.status(200).json(response);
});

// export const listItemCategories = catchAsync(async (req, res) => {
//   const {
//     query,
//     sortField = 'UpdatedAt',
//     sortOrder = 'desc',
//     page = 1,
//     limit = 10,
//   } = req.query;

//   const {
//     string,
//     boolean,
//     numbers,
//     arrayField = [],
//   } = req?.body?.searchFields || {};

//   const filter = req.body?.filter;
//   let search_query = {};

//   if (query != '' && req?.body?.searchFields) {
//     const search_data = DynamicSearch(
//       query,
//       boolean,
//       numbers,
//       string,
//       arrayField
//     );
//     if (search_data?.length == 0) {
//       return res.status(404).json({
//         statusCode: 404,
//         status: false,
//         data: {
//           data: [],
//         },
//         message: 'Results Not Found',
//       });
//     }
//     search_query = search_data;
//   }

//   const filterData = dynamic_filter(filter);

//   const match_query = {
//     ...filterData,
//     ...search_query,
//   };

//   const userLookup = {
//     $lookup: {
//       from: 'users',
//       let: { createdId: '$created_by', updatedId: '$updated_by' },
//       pipeline: [
//         {
//           $match: {
//             $expr: {
//               $or: [
//                 { $eq: ['$_id', '$$createdId'] },
//                 { $eq: ['$_id', '$$updatedId'] },
//               ],
//             },
//           },
//         },
//         {
//           $project: {
//             _id: 1,
//             user_name: 1,
//             user_type: 1,
//             dept_name: 1,
//             first_name: 1,
//             last_name: 1,
//             email_id: 1,
//             mobile_no: 1,
//           },
//         },
//       ],
//       as: 'user_data',
//     },
//   };

//   const pipeline = [
//     userLookup,
//     {
//       $addFields: {
//         created_by: {
//           $arrayElemAt: [
//             {
//               $filter: {
//                 input: '$user_data',
//                 as: 'user',
//                 cond: { $eq: ['$$user._id', '$created_by'] },
//               },
//             },
//             0,
//           ],
//         },
//         updated_by: {
//           $arrayElemAt: [
//             {
//               $filter: {
//                 input: '$user_data',
//                 as: 'user',
//                 cond: { $eq: ['$$user._id', '$updated_by'] },
//               },
//             },
//             0,
//           ],
//         },
//       },
//     },
//     {
//       $project: {
//         user_data: 0,
//       },
//     },
//     {
//       $match: match_query,
//     },
//     {
//       $sort: {
//         [sortField]: sortOrder === 'desc' ? -1 : 1,
//       },
//     },
//     {
//       $facet: {
//         paginatedResults: [
//           { $skip: (parseInt(page) - 1) * parseInt(limit) },
//           { $limit: parseInt(limit) },
//         ],
//         totalCount: [{ $count: 'count' }],
//       },
//     },
//   ];

//   // if (Object.keys(sortObj).length > 0) {
//   //   pipeline.push({ $sort: sortObj });
//   // }
//   const categoryDetails = await itemCategoryModel.aggregate(pipeline);

//   const allDetails = categoryDetails[0]?.paginatedResults || [];
//   const totalCount = categoryDetails[0]?.totalCount?.[0]?.count || 0;
//   const totalPages = Math.ceil(totalCount / limit);

//   return res.json(
//     new ApiResponse(StatusCodes.OK, 'All Details fetched successfully.', {
//       allDetails,
//       totalPages,
//     })
//   );
// });