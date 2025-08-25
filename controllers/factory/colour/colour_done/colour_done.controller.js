import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { plywood_resizing_done_details_model } from '../../../../database/schema/factory/plywood_resizing_factory/resizing_done/resizing.done.schema.js';
import { issue_for_color_model } from '../../../../database/schema/factory/colour/issue_for_colour/issue_for_colour.schema.js';
import { color_done_details_model } from '../../../../database/schema/factory/colour/colour_done/colour_done.schema.js';
import color_history_model from '../../../../database/schema/factory/colour/colour_history/colour_history.schema.js';
import { createFactoryColorDoneExcel } from '../../../../config/downloadExcel/Logs/Factory/Color/ColorDone/index.js';
import { createFactoryColorHistoryExcel } from '../../../../config/downloadExcel/Logs/Factory/Color/ColorHistory/index.js';

export const create_color = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { color_done_details } = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!color_done_details) {
      throw new ApiError(
        'Color Done details not found.',
        StatusCodes.NOT_FOUND
      );
    }
    if (!isValidObjectId(color_done_details?.issue_for_color_id)) {
      throw new ApiError(
        'Invalid Issue for Color ID.',
        StatusCodes.BAD_REQUEST
      );
    }

    const issue_for_color_details = await issue_for_color_model
      .findById(color_done_details?.issue_for_color_id)
      .session(session)
      .lean();

    if (!issue_for_color_details) {
      throw new ApiError(
        'Issue for color Details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    const [max_sr_no] = await color_done_details_model.aggregate([
      {
        $group: {
          _id: null,
          max_sr_no: {
            $max: '$sr_no',
          },
        },
      },
    ]);
    const updated_color_done_details = {
      ...color_done_details,
      sr_no: max_sr_no ? max_sr_no?.max_sr_no + 1 : 1,
      pressing_details_id: issue_for_color_details?.pressing_details_id,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    const [create_color_result] = await color_done_details_model.create(
      [updated_color_done_details],
      { session }
    );

    if (!create_color_result) {
      throw new ApiError(
        'Failed to add color done data',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_issue_for_color_details =
      await issue_for_color_model.updateOne(
        { _id: issue_for_color_details?._id },
        {
          $inc: {
            'available_details.no_of_sheets':
              -create_color_result?.no_of_sheets,
            'available_details.sqm': -create_color_result?.sqm,
            'available_details.amount': -create_color_result?.amount,
          },
          $set: {
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_color_details?.matchedCount === 0) {
      throw new ApiError(
        'Issue for color Details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    if (
      !update_issue_for_color_details?.acknowledged ||
      update_issue_for_color_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issue for color details',
        StatusCodes.BAD_REQUEST
      );
    }
    const response = new ApiResponse(
      StatusCodes.CREATED,
      'color Created Successfully',
      create_color_result
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

export const update_color_done = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { id } = req.params;
  const { color_details } = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!id) {
      throw new ApiError('ID is missing.', StatusCodes.BAD_REQUEST);
    }
    if (!color_details) {
      throw new ApiError('color details are missing.', StatusCodes.BAD_REQUEST);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID.', StatusCodes.BAD_REQUEST);
    }

    const issue_for_color_details = await issue_for_color_model
      .findById(id)
      .lean()
      .session(session);

    if (!issue_for_color_details) {
      throw new ApiError(
        'Issue for color details not found.',
        StatusCodes.BAD_REQUEST
      );
    }
    const color_done_data = await plywood_resizing_done_details_model
      ?.findById(id)
      .lean();

    if (!color_done_data) {
      throw new ApiError('color done data not found', StatusCodes.NOT_FOUND);
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Resizing Item Updated Successfully',
      update_color_done_result
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

export const listing_color_done = catchAsync(async (req, res) => {
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
  const aggLookUpColourIssuedDetails = {
    $lookup: {
      from: 'issue_for_colour_details_view',
      localField: 'issue_for_color_id',
      foreignField: '_id',
      as: 'issue_for_colour_details',
    },
  };
  const aggIssuedColourDetailsUnwind = {
    $unwind: {
      path: '$issue_for_colour_details',
      preserveNullAndEmptyArrays: true,
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
    aggLookUpColourIssuedDetails,
    aggIssuedColourDetailsUnwind,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const color_done_list =
    await color_done_details_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const [totalDocument] =
    await color_done_details_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'color Done Data Fetched Successfully',
    {
      data: color_done_list,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

export const fetch_single_color_done_item_with_issue_for_color_data =
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
          from: 'issue_for_colour_view_model',
          localField: 'issue_for_color_id',
          foreignField: '_id',
          as: 'issue_for_color_details',
        },
      },
      {
        $unwind: {
          path: '$issue_for_color_details',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const result = await color_done_details_model.aggregate(pipeline);
    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'color details fetched successfully',
          result
        )
      );
  });

export const revert_color_done_items = catchAsync(async (req, res) => {
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

    const color_done_data = await color_done_details_model
      .findById(id)
      .session(session)
      .lean();

    if (!color_done_data) {
      throw new ApiError('color done data not found', StatusCodes.NOT_FOUND);
    }

    const delete_color_done_data_result =
      await color_done_details_model.deleteOne(
        { _id: color_done_data?._id },
        { session }
      );

    if (
      !delete_color_done_data_result?.acknowledged ||
      delete_color_done_data_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete color done details',
        StatusCodes.BAD_REQUEST
      );
    }
    const update_issue_for_color_update_result =
      await issue_for_color_model.updateOne(
        { _id: color_done_data?.issue_for_color_id },
        {
          $inc: {
            'available_details.sqm': color_done_data?.available_details?.sqm,
            'available_details.no_of_sheets':
              color_done_data?.available_details?.no_of_sheets,
            'available_details.amount':
              color_done_data?.available_details?.amount,
          },
          $set: {
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_color_update_result?.matchedCount === 0) {
      throw new ApiError(
        'Issue for color details not found.',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_issue_for_color_update_result.acknowledged ||
      update_issue_for_color_update_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issue for color details',
        StatusCodes.BAD_REQUEST
      );
    }
    const response = new ApiResponse(
      StatusCodes.OK,
      'color items Reverted Successfully',
      delete_color_done_data_result
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

export const listing_color_history = catchAsync(async (req, res) => {
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
      from: 'issue_for_colour_details_view',
      localField: 'issue_for_color_id',
      foreignField: '_id',
      as: 'issue_for_colour_details',
    },
  };
  const aggLookUpDoneDetails = {
    $lookup: {
      from: 'color_done_details',
      localField: 'issued_item_id',
      foreignField: '_id',
      as: 'color_done_details',
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
      path: '$issue_for_colour_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggDoneDetailsUnwind = {
    $unwind: {
      path: '$color_done_details',
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

  const color_history_list = await color_history_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const [totalDocument] = await color_history_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Color History Data Fetched Successfully',
    {
      data: color_history_list,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

export const download_excel_color_done = catchAsync(async (req, res) => {
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
  const aggLookUpColourIssuedDetails = {
    $lookup: {
      from: 'issue_for_colour_details_view',
      localField: 'issue_for_color_id',
      foreignField: '_id',
      as: 'issue_for_colour_details',
    },
  };
  const aggIssuedColourDetailsUnwind = {
    $unwind: {
      path: '$issue_for_colour_details',
      preserveNullAndEmptyArrays: true,
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
    aggLookUpColourIssuedDetails,
    aggIssuedColourDetailsUnwind,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    // aggSort,
    // aggSkip,
    // aggLimit,
  ]; // aggregation pipiline

  const data = await color_done_details_model.aggregate(listAggregate);
  await createFactoryColorDoneExcel(data, req, res);
});

export const download_excel_color_history = catchAsync(async (req, res) => {
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
      from: 'issue_for_colour_details_view',
      localField: 'issue_for_color_id',
      foreignField: '_id',
      as: 'issue_for_colour_details',
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
      path: '$issue_for_colour_details',
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
    // aggSort,
    // aggSkip,
    // aggLimit,
  ];

  const data = await color_history_model.aggregate(listAggregate);
  await createFactoryColorHistoryExcel(data, req, res);
});
