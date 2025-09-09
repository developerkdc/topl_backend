import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { plywood_resizing_done_details_model } from '../../../../database/schema/factory/plywood_resizing_factory/resizing_done/resizing.done.schema.js';
import { issue_for_canvas_model } from '../../../../database/schema/factory/canvas/issue_for_canvas/issue_for_canvas.schema.js';
import { canvas_done_details_model } from '../../../../database/schema/factory/canvas/canvas_done/canvas_done.schema.js';
import canvas_history_model from '../../../../database/schema/factory/canvas/canvas_history/canvas.history.schema.js';
import { createFactoryCanvasDoneExcel } from '../../../../config/downloadExcel/Logs/Factory/Canvas/CanvasDone/index.js';
import { createFactoryCanvasHistoryExcel } from '../../../../config/downloadExcel/Logs/Factory/Canvas/CanvasHistory/index.js';

export const create_canvas = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { canvas_done_details } = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!canvas_done_details) {
      throw new ApiError(
        'Canvas Done details not found.',
        StatusCodes.NOT_FOUND
      );
    }
    if (!isValidObjectId(canvas_done_details?.issue_for_canvas_id)) {
      throw new ApiError(
        'Invalid Issue for canvas ID.',
        StatusCodes.BAD_REQUEST
      );
    }

    const issue_for_canvas_details = await issue_for_canvas_model
      .findById(canvas_done_details?.issue_for_canvas_id)
      .session(session)
      .lean();

    if (!issue_for_canvas_details) {
      throw new ApiError(
        'Issue for canvas Details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    const [max_sr_no] = await canvas_done_details_model.aggregate([
      {
        $group: {
          _id: null,
          max_sr_no: {
            $max: '$sr_no',
          },
        },
      },
    ]);
    const updated_canvas_done_details = {
      ...canvas_done_details,
      sr_no: max_sr_no ? max_sr_no?.max_sr_no + 1 : 1,
      pressing_details_id: issue_for_canvas_details?.pressing_details_id,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    const [create_canvas_result] = await canvas_done_details_model.create(
      [updated_canvas_done_details],
      { session }
    );

    if (!create_canvas_result) {
      throw new ApiError(
        'Failed to add canvas done data',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_issue_for_canvas_details =
      await issue_for_canvas_model.updateOne(
        { _id: issue_for_canvas_details?._id },
        {
          $inc: {
            'available_details.no_of_sheets':
              -create_canvas_result?.no_of_sheets,
            'available_details.sqm': -create_canvas_result?.sqm,
            'available_details.amount': -create_canvas_result?.amount,
          },
          $set: {
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_canvas_details?.matchedCount === 0) {
      throw new ApiError(
        'Issue for canvas Details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    if (
      !update_issue_for_canvas_details?.acknowledged ||
      update_issue_for_canvas_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issue for canvas details',
        StatusCodes.BAD_REQUEST
      );
    }
    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Canvas Created Successfully',
      create_canvas_result
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

export const update_canvas_done = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { id } = req.params;
  const { canvas_details } = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!id) {
      throw new ApiError('ID is missing.', StatusCodes.BAD_REQUEST);
    }
    if (!canvas_details) {
      throw new ApiError(
        'canvas details are missing.',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID.', StatusCodes.BAD_REQUEST);
    }

    const issue_for_canvas_details = await issue_for_canvas_model
      .findById(id)
      .lean()
      .session(session);

    if (!issue_for_canvas_details) {
      throw new ApiError(
        'Issue for canvas details not found.',
        StatusCodes.BAD_REQUEST
      );
    }
    const canvas_done_data = await plywood_resizing_done_details_model
      ?.findById(id)
      .lean();

    if (!canvas_done_data) {
      throw new ApiError('canvas done data not found', StatusCodes.NOT_FOUND);
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Resizing Item Updated Successfully',
      update_canvas_done_result
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

export const listing_canvas_done = catchAsync(async (req, res) => {
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
      from: 'issue_for_canvas_details_view',
      localField: 'issue_for_canvas_id',
      foreignField: '_id',
      as: 'issue_for_canvas_details',
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
      path: '$issue_for_canvas_details',
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

  const canvas_done_list =
    await canvas_done_details_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const [totalDocument] =
    await canvas_done_details_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'canvas Done Data Fetched Successfully',
    {
      data: canvas_done_list,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

export const fetch_single_canvas_done_item_with_issue_for_canvas_data =
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
          from: 'issue_for_canvas_details_view',
          localField: 'issue_for_canvas_id',
          foreignField: '_id',
          as: 'issue_for_canvas_details',
        },
      },
      {
        $unwind: {
          path: '$issue_for_canvas_details',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const result = await canvas_done_details_model.aggregate(pipeline);
    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'canvas details fetched successfully',
          result
        )
      );
  });

export const revert_canvas_done_items = catchAsync(async (req, res) => {
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

    const canvas_done_data = await canvas_done_details_model
      .findById(id)
      .session(session)
      .lean();

    if (!canvas_done_data) {
      throw new ApiError('canvas done data not found', StatusCodes.NOT_FOUND);
    }

    const delete_canvas_done_data_result =
      await canvas_done_details_model.deleteOne(
        { _id: canvas_done_data?._id },
        { session }
      );

    if (
      !delete_canvas_done_data_result?.acknowledged ||
      delete_canvas_done_data_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete canvas done details',
        StatusCodes.BAD_REQUEST
      );
    }
    const update_issue_for_canvas_update_result =
      await issue_for_canvas_model.updateOne(
        { _id: canvas_done_data?.issue_for_canvas_id },
        {
          $inc: {
            'available_details.sqm': canvas_done_data?.available_details?.sqm,
            'available_details.no_of_sheets':
              canvas_done_data?.available_details?.no_of_sheets,
            'available_details.amount':
              canvas_done_data?.available_details?.amount,
          },
          $set: {
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_canvas_update_result?.matchedCount === 0) {
      throw new ApiError(
        'Issue for canvas details not found.',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_issue_for_canvas_update_result.acknowledged ||
      update_issue_for_canvas_update_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issue for canvas details',
        StatusCodes.BAD_REQUEST
      );
    }
    const response = new ApiResponse(
      StatusCodes.OK,
      'canvas items Reverted Successfully'
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

export const listing_canvas_history = catchAsync(async (req, res) => {
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
      from: 'issue_for_canvas_details_view',
      localField: 'issue_for_canvas_id',
      foreignField: '_id',
      as: 'issue_for_canvas_details',
    },
  };
  const aggLookUpDoneDetails = {
    $lookup: {
      from: 'canvas_done_details',
      localField: 'issued_item_id',
      foreignField: '_id',
      as: 'canvas_done_details',
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
  const aggDoneDetailsUnwind = {
    $unwind: {
      path: '$canvas_done_details',
      preserveNullAndEmptyArrays: true,
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
      path: '$issue_for_canvas_details',
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
    aggLookUpDoneDetails,
    aggDoneDetailsUnwind,
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

  const canvas_history_list =
    await canvas_history_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const [totalDocument] = await canvas_history_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Canvas History Data Fetched Successfully',
    {
      data: canvas_history_list,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

// Canvas Done Export Api

export const download_excel_canvas_done = catchAsync(async (req, res) => {
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
      from: 'issue_for_canvas_details_view',
      localField: 'issue_for_canvas_id',
      foreignField: '_id',
      as: 'issue_for_canvas_details',
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
      path: '$issue_for_canvas_details',
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
    // aggSort,
    // aggSkip,
    // aggLimit,
  ]; // aggregation pipiline

  const data = await canvas_done_details_model.aggregate(listAggregate);

  await createFactoryCanvasDoneExcel(data, req, res);
});

export const download_excel_canvas_history = catchAsync(async (req, res) => {
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
      from: 'issue_for_canvas_details_view',
      localField: 'issue_for_canvas_id',
      foreignField: '_id',
      as: 'issue_for_canvas_details',
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
      path: '$issue_for_canvas_details',
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

  const data = await canvas_history_model.aggregate(listAggregate);
  await createFactoryCanvasHistoryExcel(data, req, res);
});
