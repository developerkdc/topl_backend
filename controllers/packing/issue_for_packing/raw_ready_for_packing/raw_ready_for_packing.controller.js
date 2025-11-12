import { customer_model } from '../../../../database/schema/masters/customer.schema.js';
import issue_for_order_model from '../../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';

export const fetch_all_raw_ready_for_packing = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'updatedAt',
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
    is_packing_done: false,
    // is_challan_done: false,
  };

  const aggOrderDetailsLookup = {
    $lookup: {
      from: 'orders',
      localField: 'order_id',
      foreignField: '_id',
      as: 'order_details',
    },
  };
  const aggOrderItemDetailsLookup = {
    $lookup: {
      from: 'raw_order_item_details',
      localField: 'order_item_id',
      foreignField: '_id',
      as: 'raw_order_item_details',
    },
  };

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
  const aggOrderDetailsUnwind = {
    $unwind: {
      path: '$order_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggOrderItemDetailsUnwind = {
    $unwind: {
      path: '$raw_order_item_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggMatch = {
    $match: {
      ...match_query,
    },
  };
  const aggAddLength = {
    $addFields: {
      final_length: {
        $ifNull: [
          '$item_details.total_length',
          {
            $ifNull: ['$item_details.length', '$item_details.physical_length'],
          },
        ],
      },
    },
  };
  const aggAddWidth = {
    $addFields: {
      final_width: {
        $cond: {
          if: { $regexMatch: { input: '$issued_from', regex: /flitch/i } }, // check if "flitch" in issued_from
          then: {
            $max: [
              { $ifNull: ['$item_details.width1', 0] },
              { $ifNull: ['$item_details.width2', 0] },
              { $ifNull: ['$item_details.width3', 0] },
            ],
          },
          else: {
            $ifNull: ['$item_details.width', '$width'],
          },
        },
      },
    },
  };
  const aggAddSheets = {
    $addFields: {
      final_sheets: {
        $ifNull: [
          '$number_of_sheets',
          {
            $ifNull: [
              '$item_details.issued_sheets',
              {
                $ifNull: [
                  '$item_details.available_details.no_of_sheets',
                  {
                    $ifNull: [
                      '$item_details.no_of_sheet',
                      '$item_details.number_of_sheets',
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };
  const aggAddRolls = {
    $addFields: {
      final_rolls: {
        $ifNull: [
          '$item_details.issued_number_of_roll',
          '$item_details.no_of_roll',
        ],
      },
    },
  };
  const aggAddCBM = {
    $addFields: {
      final_cbm: {
        $ifNull: [
          '$cbm',
          {
            $ifNull: [
              '$item_details.physical_cmt',
              {
                $ifNull: [
                  '$item_details.flitch_cmt',
                  {
                    $ifNull: ['$item_details.crosscut_cmt', 0],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };
  const aggAddSQM = {
    $addFields: {
      final_sqm: {
        $ifNull: [
          '$item_details.issued_sqm',
          {
            $ifNull: [
              '$item_details.sqm',
              {
                $ifNull: ['$item_details.total_sq_meter', 0],
              },
            ],
          },
        ],
      },
    },
  };
  const aggSort = {
    $sort: {
      [sortBy === 'length'
        ? 'final_length'
        : sortBy === 'item_details.width'
          ? 'final_width'
          : sortBy === 'number_of_sheets'
            ? 'final_sheets'
            : sortBy === 'item_details.no_of_roll'
              ? 'final_rolls'
              : sortBy === 'cbm'
                ? 'final_cbm'
                : sortBy === 'item_details.issued_sqm'
                  ? 'final_sqm'
                  : sortBy]: sort === 'desc' ? -1 : 1,
    },
  };
  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };
  const aggLimit = {
    $limit: parseInt(limit),
  };

  const listAggregate = [
    aggOrderDetailsLookup,
    aggOrderItemDetailsLookup,
    aggOrderDetailsUnwind,
    aggOrderItemDetailsUnwind,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggAddLength,
    aggAddWidth,
    aggAddSheets,
    aggAddRolls,
    aggAddCBM,
    aggAddSQM,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const issue_for_raw_packing =
    await issue_for_order_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const totalDocument = await issue_for_order_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);
  console.log('Sort by', sortBy);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Issued For Raw Packing Data Fetched Successfully',
    {
      data: issue_for_raw_packing,
      totalPages: totalPages,
    }
  );
  return res.status(StatusCodes.OK).json(response);
});

// export const dropdownRawReadyForPacking = catchAsync(async (req, res, next) => {
//   const rawList = await issue_for_order_model.aggregate([
//     {
//       $match: {
//         is_packing_done: false, // only those not yet packed
//       },
//     },
//     {
//       $lookup: {
//         from: 'orders',
//         localField: 'order_id',
//         foreignField: '_id',
//         as: 'order_details',
//       },
//     },
//     {
//       $unwind: {
//         path: '$order_details',
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $lookup: {
//         from: 'raw_order_item_details',
//         localField: 'order_item_id',
//         foreignField: '_id',
//         as: 'raw_order_item_details',
//       },
//     },
//     {
//       $unwind: {
//         path: '$raw_order_item_details',
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $project: {
//         _id: 1,
//         order_number: '$order_details.order_number',
//         item_name: '$raw_order_item_details.item_name',
//         grade: '$raw_order_item_details.grade',
//         species: '$raw_order_item_details.species',
//         thickness: '$raw_order_item_details.thickness',
//         issued_from: 1,
//         createdAt: 1,
//         updatedAt: 1,
//       },
//     },
//     {
//       $sort: { updatedAt: -1 },
//     },
//   ]);

//   const response = new ApiResponse(
//     200,
//     'Raw Items Dropdown Fetched Successfully',
//     rawList
//   );
//   return res.status(200).json(response);
// });

export const dropdownRawReadyForPacking = catchAsync(async (req, res, next) => {
  const unfinishedRawPackingOwners = await issue_for_order_model.aggregate([
    {
      $match: {
        is_packing_done: false,
      },
    },
    {
      $lookup: {
        from: 'orders',
        localField: 'order_id',
        foreignField: '_id',
        as: 'order_details',
        pipeline: [
          {
            $project: {
              owner_name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$order_details',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: '$order_details.owner_name',
      },
    },
  ]);

  const ownerNames = unfinishedRawPackingOwners.map((item) => item._id).filter(Boolean);

  const customerList = await customer_model.aggregate([
    {
      $match: {
        status: true,
        company_name: { $in: ownerNames },
      },
    },
    {
      $project: {
        company_name: 1,
        gst_number: 1,
        pan_number: 1,
        branding_type: 1,
        credit_schedule: 1,
        freight: 1,
        local_freight: 1,
      },
    },
    {
      $sort: { company_name: 1 },
    },
  ]);

  const response = new ApiResponse(
    200,
    'Customer list for unfinished RAW packing fetched successfully',
    customerList
  );

  return res.status(200).json(response);
});
