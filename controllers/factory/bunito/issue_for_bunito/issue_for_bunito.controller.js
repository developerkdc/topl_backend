import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import {
  issue_for_bunito_model,
  issue_for_bunito_view_model,
} from '../../../../database/schema/factory/bunito/issue_for_bunito/issue_for_bunito.schema.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';
import { createFactoryIssueForBunitoExcel } from '../../../../config/downloadExcel/Logs/Factory/Bunito/IssueForBunito/index.js';
import { runConditionalHydratedPagination } from '../../../../utils/pagination/runConditionalHydratedPagination.js';

export const listing_issued_for_bunito = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, sortBy = 'updatedAt', sort = 'desc' } =
    req.query;
  const aggCommonMatch = {
    $match: {
      'available_details.no_of_sheets': { $gt: 0 },
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
  const aggMatch = {
    $match: {
      ...{},
    },
  };

  const orderItems = [
    {
      $lookup: {
        from: 'series_product_order_item_details',
        localField: 'order_item_id',
        foreignField: '_id',
        as: 'series_items',
      },
    },
    {
      $lookup: {
        from: 'decorative_order_item_details',
        localField: 'order_item_id',
        foreignField: '_id',
        as: 'decorative_items',
      },
    },
    {
      $addFields: {
        order_item_details: {
          $cond: {
            if: { $gt: [{ $size: '$series_items' }, 0] },
            then: { $arrayElemAt: ['$series_items', 0] },
            else: { $arrayElemAt: ['$decorative_items', 0] },
          },
        },
      },
    },
  ];

  const listAggregate = [
    aggCommonMatch,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    ...orderItems,
  ];
  const optimizedResult = await runConditionalHydratedPagination({
    model: issue_for_bunito_model,
    hydrateModel: issue_for_bunito_view_model,
    req,
    staticMatch: {
      is_bunito_done: false,
      'available_details.no_of_sheets': { $gt: 0 },
    },
    joinedFieldPrefixes: [
      'created_by.',
      'updated_by.',
      'order_details.',
      'order_item_details.',
      'series_items.',
      'decorative_items.',
      'pressing_details.',
      'grouping_details.',
      'pressing_done_consumed_items_details.',
      'created_user_details.',
      'updated_user_details.',
    ],
    hydratePipelineBuilder: (pageIds) => [
      {
        $match: {
          _id: { $in: pageIds },
        },
      },
      aggCreatedByLookup,
      aggCreatedByUnwind,
      aggUpdatedByLookup,
      aggUpdatedByUnwind,
      ...orderItems,
    ],
    fallbackRunner: async ({
      pageNumber,
      pageLimit,
      sortBy: fallbackSortBy,
      sort: fallbackSort,
      matchQuery,
    }) => {
      aggMatch.$match = matchQuery;

      const aggSort = {
        $sort: {
          [fallbackSortBy]: fallbackSort === 'desc' ? -1 : 1,
        },
      };
      const aggSkip = {
        $skip: (pageNumber - 1) * pageLimit,
      };
      const aggLimit = {
        $limit: pageLimit,
      };

      const fallbackAggregate = [...listAggregate, aggSort, aggSkip, aggLimit];

      const [data, totalDocument] = await Promise.all([
        issue_for_bunito_view_model
          .aggregate(fallbackAggregate)
          .allowDiskUse(true),
        issue_for_bunito_view_model
          .aggregate([...listAggregate, { $count: 'totalCount' }])
          .allowDiskUse(true),
      ]);

      return {
        searchMiss: false,
        data,
        totalPages: Math.ceil((totalDocument?.[0]?.totalCount || 0) / pageLimit),
      };
    },
  });

  if (optimizedResult.searchMiss) {
    return res.status(404).json({
      statusCode: 404,
      status: false,
      data: {
        data: [],
      },
      message: 'Results Not Found',
    });
  }

  const response = new ApiResponse(
    StatusCodes.OK,
    'Issue For Bunito Data Fetched Successfully',
    {
      data: optimizedResult.data,
      totalPages: optimizedResult.totalPages,
    }
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetch_single_issue_for_bunito_item = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const result = await issue_for_bunito_view_model
      .findOne({ _id: id })
      .lean();

    const response = new ApiResponse(
      StatusCodes.OK,
      'Bunito Details fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const download_excel_issued_for_bunito = catchAsync(
  async (req, res, next) => {
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
      is_bunito_done: false,
    };

    const aggCommonMatch = {
      $match: {
        'available_details.no_of_sheets': { $gt: 0 },
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
      aggCommonMatch,
      aggCreatedByLookup,
      aggCreatedByUnwind,
      aggUpdatedByLookup,
      aggUpdatedByUnwind,
      aggMatch,
      // aggSort,
      // aggSkip,
      // aggLimit,
    ]; // aggregation pipiline

    const data = await issue_for_bunito_view_model.aggregate(listAggregate);
    await createFactoryIssueForBunitoExcel(data, req, res);
  }
);
