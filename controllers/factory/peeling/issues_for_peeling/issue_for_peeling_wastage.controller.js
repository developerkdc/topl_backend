import issues_for_peeling_wastage_model from '../../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_wastage.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';

export const fetch_issue_for_peeling_wastage_details = catchAsync(
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
    } = req.body.searchFields || {};

    const { filter } = req.body;

    let search_query = {};

    if (search != '' && req?.body?.searchFields) {
      const search_data = DynamicSearch(
        search,
        boolean,
        numbers,
        string,
        arrayField
      );

      if (search_data?.length === 0) {
        throw new ApiError('NO Data found...', StatusCodes.NOT_FOUND);
      }
      search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const match_query = {
      ...search_query,
      ...filterData,
    };

    const aggLookupIssueForPeeling = {
      $lookup: {
        from: 'issues_for_peelings',
        localField: 'issue_for_peeling_id',
        foreignField: '_id',
        as: 'issue_for_peeling_details',
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

    const aggMatch = {
      $match: {
        ...match_query,
      },
    };

    const aggUnwindIssueForPeeling = {
      $unwind: {
        path: '$issue_for_peeling_details',
        preserveNullAndEmptyArrays: true,
      },
    };

    const aggUnwindCreatedUser = {
      $unwind: {
        path: '$created_user_details',
        preserveNullAndEmptyArrays: true,
      },
    };
    const aggUnwindUpdatdUser = {
      $unwind: {
        path: '$updated_user_details',
        preserveNullAndEmptyArrays: true,
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
      aggLookupIssueForPeeling,
      aggUnwindIssueForPeeling,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatdUser,
      aggMatch,
      aggSort,
      aggSkip,
      aggLimit,
    ];

    const result =
      await issues_for_peeling_wastage_model.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      aggLookupIssueForPeeling,
      aggUnwindIssueForPeeling,
      aggCreatedUserDetails,
      aggUnwindCreatedUser,
      aggUpdatedUserDetails,
      aggUnwindUpdatdUser,
      aggMatch,
      aggCount,
    ];
    const total_docs =
      await issues_for_peeling_wastage_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Data fetched successfully',
      {
        data: result,
        totalPages: totalPages,
      }
    );
    return res.status(StatusCodes.OK).json(response);
  }
);
