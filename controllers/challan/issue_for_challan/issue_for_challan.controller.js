import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import IssueForChallan from './issue_for_challan.js';
import RevertIssueForChallan from './revert_issue_for_challan.js';
import issue_for_challan_model from '../../../database/schema/challan/issue_for_challan/issue_for_challan.schema.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';

export const add_issue_for_challan_data = catchAsync(async (req, res) => {
  const { issued_from, issued_item_ids, issued_data = null } = req.body;
  const userDetails = req.userDetails;
  const required_fields = ['issued_from', 'issued_item_ids'];
  for (let field of required_fields) {
    if (!req.body[field]) {
      throw new ApiError(`${field} is missing..`, StatusCodes.NOT_FOUND);
    }
  }

  if (issued_item_ids?.length === 0) {
    throw new ApiError(
      'Issued item must have at least one item',
      StatusCodes.BAD_REQUEST
    );
  }
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const issue_for_challan_handler = new IssueForChallan(
      session,
      userDetails,
      issued_from,
      issued_item_ids,
      issued_data
    );

    await issue_for_challan_handler?.add_issue_data_to_challan();

    const response = new ApiResponse(
      StatusCodes.OK,
      'Items issued for challan successfully'
    );
    await session.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.endSession();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const listing_issued_for_challan = catchAsync(async (req, res, next) => {
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
    is_challan_done: false,
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
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const issue_for_color =
    await issue_for_challan_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const totalDocument = await issue_for_challan_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Issued For challan Data Fetched Successfully',
    {
      data: issue_for_color,
      totalPages: totalPages,
    }
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetch_single_issued_for_challan_item = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const result = await issue_for_challan_model.findOne({ _id: id }).lean();

    if (!result) {
      throw new ApiError(
        'Issue for color data not found',
        StatusCodes.NOT_FOUND
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'challan Details fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const revert_issued_challan_data_by_id = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userDetails = req.userDetails;

  if (!id) {
    throw new ApiError('ID not found', StatusCodes.NOT_FOUND);
  }
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const revert_issued_challan_handler = new RevertIssueForChallan(
      id,
      userDetails,
      session
    );
    await revert_issued_challan_handler?.update_inventory_item_status();
    const delete_order_item_doc_result =
      await issue_for_challan_model.deleteOne(
        { _id: id },
        { session: session }
      );
    if (
      !delete_order_item_doc_result.acknowledged ||
      delete_order_item_doc_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to Delete issue for challan data',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Item Reverted Successfully'
    );
    await session.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session?.endSession();
  }
});
