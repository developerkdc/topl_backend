import issue_for_tapping_wastage_model from '../../../../database/schema/factory/tapping/tapping_wastage/tapping_wastage.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';

export const fetch_all_tapping_wastage = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    sortBy = 'updatedAt',
    sort = 'desc',
    limit = 10,
    search = '',
  } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req.body?.searchFields || {};

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
    ...search_query,
    ...filterData,
  };

  const aggOrderRelatedData = [
    {
      $lookup: {
        from: 'orders',
        localField: 'order_id',
        pipeline: [
          {
            $project: {
              order_no: 1,
              owner_name: 1,
              orderDate: 1,
              order_category: 1,
              series_product: 1,
            },
          },
        ],
        foreignField: '_id',
        as: 'order_details',
      },
    },
    {
      $unwind: {
        path: '$order_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'series_product_order_item_details',
        localField: 'order_item_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              item_no: 1,
              order_id: 1,
              item_name: 1,
              item_sub_category_name: 1,
              group_no: 1,
              photo_number: 1,
            },
          },
        ],
        as: 'series_product_order_item_details',
      },
    },
    {
      $unwind: {
        path: '$series_product_order_item_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'decorative_order_item_details',
        localField: 'order_item_id',
        pipeline: [
          {
            $project: {
              item_no: 1,
              order_id: 1,
              item_name: 1,
              item_sub_category_name: 1,
              group_no: 1,
              photo_number: 1,
            },
          },
        ],
        foreignField: '_id',
        as: 'decorative_order_item_details',
      },
    },
    {
      $unwind: {
        path: '$decorative_order_item_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        order_item_details: {
          $cond: {
            if: {
              $ne: [{ $type: '$decorative_order_item_details' }, 'missing'],
            },
            then: '$decorative_order_item_details',
            else: '$series_product_order_item_details',
          },
        },
      },
    },
  ];
  const aggLookupIssueDetails = {
    $lookup: {
      from: 'issue_for_tappings',
      foreignField: '_id',
      localField: 'issue_for_tapping_item_id',
      pipeline:[
        ...aggOrderRelatedData
      ],
      as: 'issue_for_tapping_details',
    },
  };
  const aggUnwindIssueDetails = {
    $unwind: {
      path: '$issue_for_tapping_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggCreatedUserDetails = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            first_name: 1,
            last_name: 1,
            user_name: 1,
            user_type: 1,
            email_id: 1,
          },
        },
      ],
      as: 'created_user_details',
    },
  };
  const aggUpdatedUserDetails = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            first_name: 1,
            last_name: 1,
            user_name: 1,
            user_type: 1,
            email_id: 1,
          },
        },
      ],
      as: 'updated_user_details',
    },
  };
  const aggGroupNoLookup = {
    $lookup: {
      from: 'grouping_done_items_details',
      localField: 'issue_for_tapping_details.group_no',
      foreignField: 'group_no',
      pipeline: [
        {
          $project: {
            group_no: 1,
            photo_no: 1,
            photo_id: 1,
          },
        },
      ],
      as: 'grouping_done_items_details',
    },
  };
  const aggGroupNoUnwind = {
    $unwind: {
      path: '$grouping_done_items_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUnwindCreatedUser = {
    $unwind: {
      path: '$created_user_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUnwindUpdatedUser = {
    $unwind: {
      path: '$updated_user_details',
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

  const list_aggregate = [
    aggLookupIssueDetails,
    aggUnwindIssueDetails,
    aggGroupNoLookup,
    aggGroupNoUnwind,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatedUser,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ];

  const result =
    await issue_for_tapping_wastage_model.aggregate(list_aggregate);

  const aggCount = {
    $count: 'totalCount',
  };

  const count_total_docs = [
    aggLookupIssueDetails,
    aggUnwindIssueDetails,
    aggGroupNoLookup,
    aggGroupNoUnwind,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatedUser,
    aggMatch,
    aggCount,
  ];

  const total_docs =
    await issue_for_tapping_wastage_model.aggregate(count_total_docs);

  const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Data Fetched Successfully',
    {
      data: result,
      totalPages: totalPages,
    }
  );
  return res.status(StatusCodes.OK).json(response);
});
