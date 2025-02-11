import { StatusCodes } from '../../../../utils/constants.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';
import { issue_for_dressing_model } from '../../../../database/schema/factory/slicing/slicing_done.schema.js';

export const list_issue_for_dressing = catchAsync(async (req, res) => {
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

  const matchQuery = {
    ...search_query,
    ...filterData,
  };

  const aggMatch = {
    $match: {
      ...matchQuery,
    },
  };

  const aggSort = {
    $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
  };

  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };

  const aggLimit = {
    $limit: parseInt(limit),
  };

  const all_aggregates = [aggMatch, aggSort, aggSkip, aggLimit];

  const list_issue_for_dressing =
    await issue_for_dressing_model.aggregate(all_aggregates);

  const aggCount = {
    $count: 'totalCount',
  };

  const aggCountTotalDocs = [aggMatch, aggCount];

  const total_docs =
    await issue_for_dressing_model.aggregate(aggCountTotalDocs);

  const totalPages = Math.ceil(
    (total_docs?.[0]?.totalCount || 0) / parseInt(limit)
  );

  const response = new ApiResponse(
    StatusCodes.OK,
    'Issue for Dressing List Fetched Successfully',
    { data: list_issue_for_dressing, totalPages: totalPages }
  );

  return res.status(StatusCodes.OK).json(response);
});

export const fetch_single_issue_of_dressing_item = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }

    const result = await issue_for_dressing_model.findById(id);

    if (!result) {
      throw new ApiError('No Data Found', StatusCodes.NOT_FOUND);
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Data fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  }
);
