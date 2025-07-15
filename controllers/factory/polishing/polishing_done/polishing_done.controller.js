import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { plywood_resizing_done_details_model } from '../../../../database/schema/factory/plywood_resizing_factory/resizing_done/resizing.done.schema.js';
import {
  issue_for_polishing_model,
  issue_for_polishing_view_model,
} from '../../../../database/schema/factory/polishing/issue_for_polishing/issue_for_polishing.schema.js';
import { polishing_done_details_model } from '../../../../database/schema/factory/polishing/polishing_done/polishing_done.schema.js';
import polishing_history_model from '../../../../database/schema/factory/polishing/polishing_history/polishing.history.schema.js';

export const create_polishing = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { polishing_done_details } = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!polishing_done_details) {
      throw new ApiError(
        'polishing Done details not found.',
        StatusCodes.NOT_FOUND
      );
    }
    if (!isValidObjectId(polishing_done_details?.issue_for_polishing_id)) {
      throw new ApiError(
        'Invalid Issue for polishing ID.',
        StatusCodes.BAD_REQUEST
      );
    }

    const issue_for_polishing_details = await issue_for_polishing_model
      .findById(polishing_done_details?.issue_for_polishing_id)
      .session(session)
      .lean();

    if (!issue_for_polishing_details) {
      throw new ApiError(
        'Issue for polishing Details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    const [max_sr_no] = await polishing_done_details_model.aggregate([
      {
        $group: {
          _id: null,
          max_sr_no: {
            $max: '$sr_no',
          },
        },
      },
    ]);
    const updated_polishing_done_details = {
      ...polishing_done_details,
      sr_no: max_sr_no ? max_sr_no?.max_sr_no + 1 : 1,
      pressing_details_id: issue_for_polishing_details?.pressing_details_id,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    const [create_polishing_result] = await polishing_done_details_model.create(
      [updated_polishing_done_details],
      { session }
    );

    if (!create_polishing_result) {
      throw new ApiError(
        'Failed to add polishing done data',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_issue_for_polishing_details =
      await issue_for_polishing_model.updateOne(
        { _id: issue_for_polishing_details?._id },
        {
          $inc: {
            'available_details.no_of_sheets':
              -create_polishing_result?.no_of_sheets,
            'available_details.sqm': -create_polishing_result?.sqm,
            'available_details.amount': -create_polishing_result?.amount,
          },
          $set: {
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_polishing_details?.matchedCount === 0) {
      throw new ApiError(
        'Issue for polishing Details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    if (
      !update_issue_for_polishing_details?.acknowledged ||
      update_issue_for_polishing_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issue for polishing details',
        StatusCodes.BAD_REQUEST
      );
    }
    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Polishing Created Successfully',
      create_polishing_result
    );
    await session.commitTransaction();
    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const update_polishing_done = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { id } = req.params;
  const { polishing_details } = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!id) {
      throw new ApiError('ID is missing.', StatusCodes.BAD_REQUEST);
    }
    if (!polishing_details) {
      throw new ApiError(
        'polishing details are missing.',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID.', StatusCodes.BAD_REQUEST);
    }

    const issue_for_polishing_details = await issue_for_polishing_model
      .findById(id)
      .lean()
      .session(session);

    if (!issue_for_polishing_details) {
      throw new ApiError(
        'Issue for polishing details not found.',
        StatusCodes.BAD_REQUEST
      );
    }
    const polishing_done_data = await plywood_resizing_done_details_model
      ?.findById(id)
      .lean();

    if (!polishing_done_data) {
      throw new ApiError(
        'polishing done data not found',
        StatusCodes.NOT_FOUND
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Resizing Item Updated Successfully',
      update_polishing_done_result
    );
    await session.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const listing_polishing_done = catchAsync(async (req, res) => {
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
  };

  // Aggregation stage
  const aggCommonMatch = {
    $match: {
      'available_details.no_of_sheets': { $gt: 0 },
    },
  };

  const aggLookUpIssuedDetails = {
    $lookup: {
      from: 'issue_for_polishing_details_view',
      localField: 'issue_for_polishing_id',
      foreignField: '_id',
      as: 'issue_for_polishing_details',
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

  const aggIssuedCncDetailsUnwind = {
    $unwind: {
      path: '$issue_for_polishing_details',
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
    aggLookUpIssuedDetails,
    aggIssuedCncDetailsUnwind,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const polishing_done_list =
    await polishing_done_details_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const [totalDocument] =
    await polishing_done_details_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'polishing Done Data Fetched Successfully',
    {
      data: polishing_done_list,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

export const fetch_single_polishing_done_item_with_issue_for_polishing_data =
  catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const pipeline = [
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(id),
        },
      },
      {
        $lookup: {
          from: 'issue_for_polishing_details_view',
          localField: 'issue_for_polishing_id',
          foreignField: '_id',
          as: 'issue_for_polishing_details',
        },
      },
      {
        $unwind: {
          path: '$issue_for_polishing_details',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const result = await polishing_done_details_model.aggregate(pipeline);
    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'polishing details fetched successfully',
          result
        )
      );
  });

export const revert_polishing_done_items = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userDetails = req.userDetails;
  if (!id) {
    throw new ApiError('ID is missing', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const polishing_done_data = await polishing_done_details_model
      .findById(id)
      .session(session)
      .lean();

    if (!polishing_done_data) {
      throw new ApiError(
        'polishing done data not found',
        StatusCodes.NOT_FOUND
      );
    }

    const delete_polishing_done_data_result =
      await polishing_done_details_model.deleteOne(
        { _id: polishing_done_data?._id },
        { session }
      );

    if (
      !delete_polishing_done_data_result?.acknowledged ||
      delete_polishing_done_data_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete polishing done details',
        StatusCodes.BAD_REQUEST
      );
    }
    const update_issue_for_polishing_update_result =
      await issue_for_polishing_model.updateOne(
        { _id: polishing_done_data?.issue_for_polishing_id },
        {
          $inc: {
            'available_details.sqm':
              polishing_done_data?.available_details?.sqm,
            'available_details.no_of_sheets':
              polishing_done_data?.available_details?.no_of_sheets,
            'available_details.amount':
              polishing_done_data?.available_details?.amount,
          },
          $set: {
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_polishing_update_result?.matchedCount === 0) {
      throw new ApiError(
        'Issue for polishing details not found.',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_issue_for_polishing_update_result.acknowledged ||
      update_issue_for_polishing_update_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issue for polishing details',
        StatusCodes.BAD_REQUEST
      );
    }
    const response = new ApiResponse(
      StatusCodes.OK,
      'polishing items Reverted Successfully',
      delete_polishing_done_data_result
    );
    await session.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const listing_polishing_history = catchAsync(async (req, res) => {
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
  };

  // Aggregation stage
  // const aggCommonMatch = {
  //   $match: {
  //     'available_details.no_of_sheets': { $gt: 0 },
  //   },
  // };

  const aggLookUpIssuedDetails = {
    $lookup: {
      from: 'issue_for_polishing_details_view',
      localField: 'issue_for_polishing_id',
      foreignField: '_id',
      as: 'issue_for_polishing_details',
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
  const aggIssuedCncDetailsUnwind = {
    $unwind: {
      path: '$issue_for_polishing_details',
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
    // aggCommonMatch,
    aggLookUpIssuedDetails,
    aggIssuedCncDetailsUnwind,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const polishing_history_list =
    await polishing_history_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const [totalDocument] =
    await polishing_history_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Polishing History Data Fetched Successfully',
    {
      data: polishing_history_list,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});
