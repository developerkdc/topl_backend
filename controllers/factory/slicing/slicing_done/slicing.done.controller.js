import { StatusCodes } from '../../../../utils/constants.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import {
  issues_for_status,
  issue_for_slicing,
  slicing_done_from,
} from '../../../../database/Utils/constants/constants.js';

import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import {
  slicing_done_items_model,
  slicing_done_other_details_model,
} from '../../../../database/schema/factory/slicing/slicing_done.schema.js';
import { issued_for_slicing_model } from '../../../../database/schema/factory/slicing/issue_for_slicing/issuedForSlicing.js';
import issue_for_slicing_available_model from '../../../../database/schema/factory/slicing/issue_for_slicing/issue_for_slicing_available_schema.js';
import issue_for_slicing_wastage_model from '../../../../database/schema/factory/slicing/issue_for_slicing/issue_for_slicing_wastage_schema.js';

export const add_slicing_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const {
      other_details,
      items_details,
      type = null,
      wastage_details,
      available_details,
    } = req.body;
    for (let i of ['other_details', 'items_details']) {
      if (!req.body?.[i]) {
        throw new ApiError(`Please provide ${i} details`, 400);
      }
    }
    if (!Array.isArray(items_details)) {
      throw new ApiError('items_details must be array', 400);
    }
    if (items_details?.length < 0) {
      throw new ApiError('Atleast one items is required', 400);
    }
    if (type === issue_for_slicing.wastage) {
      if (!wastage_details) {
        throw new ApiError('Please provide wastage details', 400);
      }
    }
    if (type === issue_for_slicing.rest_roller) {
      if (!available_details) {
        throw new ApiError('Please provide available details', 400);
      }
    }

    // issue for slicing
    const fetch_issue_for_slicing_data = await issued_for_slicing_model.findOne(
      { _id: other_details?.issue_for_slicing_id }
    );
    if (!fetch_issue_for_slicing_data) {
      throw new ApiError('Issue for slicing data not found', 400);
    }
    if (fetch_issue_for_slicing_data?.is_slicing_completed) {
      throw new ApiError(
        'Already created slicing done for this issue for slicing',
        400
      );
    }

    // Other goods details
    const add_other_details_data =
      await slicing_done_other_details_model.create(
        [
          {
            ...other_details,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        {
          session,
        }
      );
    const other_details_data = add_other_details_data?.[0];

    if (!other_details_data) {
      throw new ApiError('Failed to add other details', 400);
    }
    const add_other_details_id = other_details_data?._id;

    // item details
    const items_details_data = items_details?.map((item, index) => {
      item.slicing_done_other_details_id = add_other_details_id;
      item.created_by = userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });
    const add_items_details_data = await slicing_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length === 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage or re-slicing
    const issue_for_slicing_id = other_details_data?.issue_for_slicing_id;
    const issue_for_slicing_type =
      await issued_for_slicing_model.findOneAndUpdate(
        { _id: issue_for_slicing_id },
        {
          $set: {
            type: type,
            is_slicing_completed: true,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    if (!issue_for_slicing_type) {
      throw new ApiError('Failed to add type', 400);
    }

    if (
      issue_for_slicing_type?.type?.toLowerCase() ===
      issue_for_slicing.wastage?.toLowerCase()
    ) {
      const wastage_details_data = {
        ...wastage_details,
        issue_for_slicing_id: issue_for_slicing_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_wastage_details_data =
        await issue_for_slicing_wastage_model.create([wastage_details_data], {
          session,
        });
      if (add_wastage_details_data?.length <= 0) {
        throw new ApiError('Failed to add wastage details', 400);
      }
    }

    if (
      issue_for_slicing_type?.type?.toLowerCase() ===
      issue_for_slicing.rest_roller?.toLowerCase()
    ) {
      const available_details_data = {
        ...available_details,
        issue_for_slicing_id: issue_for_slicing_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_available_details_data =
        await issue_for_slicing_available_model.create(
          [available_details_data],
          {
            session,
          }
        );
      if (add_available_details_data?.length === 0) {
        throw new ApiError('Failed to add available details', 400);
      }
    }

    await session.commitTransaction();

    const response = new ApiResponse(201, 'Slicing Done Successfully', {
      other_details: other_details_data,
      items_details: add_items_details_data,
    });

    return res.status(201).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const fetch_all_slicing_done_items = catchAsync(
  async (req, res, next) => {
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

    const aggLookupSlicingDoneOtherDetails = {
      $lookup: {
        from: 'slicing_done_other_details',
        localField: 'slicing_done_other_details_id',
        foreignField: '_id',
        as: 'slicing_done_other_details',
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
        issue_status: null,
      },
    };
    const aggUnwindOtherDetails = {
      $unwind: {
        path: '$slicing_done_other_details',
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
      aggLookupSlicingDoneOtherDetails,
      aggUnwindOtherDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggSort,
      aggSkip,
      aggLimit,
    ];

    const result = await slicing_done_items_model?.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      aggLookupSlicingDoneOtherDetails,
      aggUnwindOtherDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggCount,
    ];

    const total_docs =
      await slicing_done_items_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(200, 'Data Fetched Successfully', {
      data: result,
      totalPages: totalPages,
    });
    return res.status(200).json(response);
  }
);

export const fetch_all_details_by_slicing_done_id = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;

    if (!id && !mongoose.isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
    }

    const pipeline = [
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(id),
        },
      },
      {
        $lookup: {
          from: 'issued_for_slicings',
          foreignField: '_id',
          localField: 'issue_for_slicing_id',
          as: 'issued_for_slicing_details',
        },
      },
      {
        $unwind: {
          path: '$issued_for_slicing_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'issue_for_slicing_wastage',
          foreignField: 'issue_for_slicing_id',
          localField: 'issue_for_slicing_id',
          as: 'issue_for_slicing_wastage_details',
        },
      },
      {
        $lookup: {
          from: 'issue_for_slicing_available',
          foreignField: 'issue_for_slicing_id',
          localField: 'issue_for_slicing_id',
          as: 'issue_for_slicing_available_details',
        },
      },
      {
        $unwind: {
          path: '$issue_for_slicing_wastage_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$issue_for_slicing_available_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'slicing_done_items',
          foreignField: 'slicing_done_other_details_id',
          localField: '_id',
          as: 'slicing_done_items_details',
        },
      },
    ];
    const result = await slicing_done_other_details_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Details Fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_slicing_done_history = catchAsync(async (req, res, next) => {
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
    issue_status: { $ne: null },
  };
  const aggMatch = {
    $match: {
      ...match_query,
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
          },
        },
      ],
      as: 'updated_user_details',
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

  const aggLimit = {
    $limit: parseInt(limit),
  };

  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };

  const aggSort = {
    $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
  };
  const list_aggregate = [
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatdUser,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ];

  const result = await slicing_done_items_model.aggregate(list_aggregate);

  const aggCount = {
    $count: 'totalCount',
  };

  const count_total_docs = [
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatdUser,
    aggMatch,
    aggCount,
  ];

  const total_docs = await slicing_done_items_model.aggregate(count_total_docs);

  const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Data fetched successfully...',
    {
      data: result,
      totalPages: totalPages,
    }
  );

  return res.status(StatusCodes.OK).json(response);
});

export const edit_slicing_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { slicing_done_id } = req.params;
    if (!slicing_done_id && !mongoose.isValidObjectId(slicing_done_id)) {
      throw new ApiError('Invalid peeling done id', 400);
    }
    const {
      other_details,
      items_details,
      type = null,
      wastage_details,
      available_details,
    } = req.body;
    for (let i of ['other_details', 'items_details']) {
      if (!req.body?.[i]) {
        throw new ApiError(`Please provide ${i} details`, 400);
      }
    }
    if (!Array.isArray(items_details)) {
      throw new ApiError('items_details must be array', 400);
    }
    if (items_details?.length < 0) {
      throw new ApiError('Atl east one items is required', 400);
    }
    if (type === issue_for_slicing.wastage) {
      if (!wastage_details) {
        throw new ApiError('Please provide wastage details', 400);
      }
    }
    if (type === issue_for_slicing.rest_roller) {
      if (!available_details) {
        throw new ApiError('Please provide available details', 400);
      }
    }

    const verify_other_details = await slicing_done_other_details_model.findOne(
      { _id: slicing_done_id }
    );

    if (!verify_other_details) {
      throw new ApiError(
        'Slicing Done Data not found.',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!verify_other_details?.isEditable) {
      throw new ApiError(
        'Slicing Done item is not editable',
        StatusCodes.BAD_REQUEST
      );
    }
    // Other goods details
    const add_other_details_data =
      await slicing_done_other_details_model.findOneAndUpdate(
        { _id: slicing_done_id },
        {
          $set: {
            ...other_details,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    const other_details_data = add_other_details_data;

    if (!other_details_data) {
      throw new ApiError('Failed to update other details', 400);
    }
    const add_other_details_id = other_details_data?._id;

    // item details

    const items_details_data = items_details?.map((item, index) => {
      item.slicing_done_other_details_id = add_other_details_id;
      item.created_by = item.created_by ? item.created_by : userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });

    const delete_items_details = await slicing_done_items_model.deleteMany(
      { slicing_done_other_details_id: add_other_details_id },
      {
        session,
      }
    );

    if (
      !delete_items_details.acknowledged ||
      delete_items_details.deletedCount <= 0
    ) {
      throw new ApiError('Failed to delete items details', 400);
    }

    const add_items_details_data = await slicing_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage or re-slicing
    const issue_for_slicing_id = other_details_data?.issue_for_slicing_id;

    const issue_for_slicing_type =
      await issued_for_slicing_model.findOneAndUpdate(
        { _id: issue_for_slicing_id },
        {
          $set: {
            type: type,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    if (!issue_for_slicing_type) {
      throw new ApiError(
        'Failed to add type in issue for slicing details',
        400
      );
    }

    //delete wastage
    const delete_wastage = await issue_for_slicing_wastage_model.deleteOne(
      { issue_for_slicing_id: issue_for_slicing_id },
      {
        session,
      }
    );

    if (!delete_wastage.acknowledged) {
      throw new ApiError('Failed to delete wastage details', 400);
    }

    //delete re-flitching
    const delete_available = await issue_for_slicing_available_model.deleteOne(
      { issue_for_slicing_id: issue_for_slicing_id },
      {
        session,
      }
    );

    if (!delete_available.acknowledged) {
      throw new ApiError('Failed to delete available details ', 400);
    }

    //add wastage
    if (
      issue_for_slicing_type?.type?.toLowerCase() ===
        issue_for_slicing.wastage?.toLowerCase() &&
      wastage_details
    ) {
      const wastage_details_data = {
        ...wastage_details,
        issue_for_slicing_id: issue_for_slicing_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };

      const add_wastage_details_data =
        await issue_for_slicing_wastage_model.create([wastage_details_data], {
          session,
        });
      if (add_wastage_details_data?.length <= 0) {
        throw new ApiError('Failed to add wastage details', 400);
      }
    }

    // add available
    if (
      issue_for_slicing_type?.type?.toLowerCase() ===
        issue_for_slicing.rest_roller?.toLowerCase() &&
      available_details
    ) {
      const re_slicing_details_data = {
        ...available_details,
        issue_for_slicing_id: issue_for_slicing_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_available_details_data =
        await issue_for_slicing_available_model.create(
          [re_slicing_details_data],
          {
            session,
          }
        );
      if (add_available_details_data?.length <= 0) {
        throw new ApiError('Failed to add rejection details', 400);
      }
    }
    await session.commitTransaction();
    const response = new ApiResponse(201, 'Slicing Done Updated Successfully', {
      other_details: other_details_data,
      items_details: add_items_details_data,
    });

    return res.status(200).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const revert_slicing_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { other_details_id } = req.params;
    const userDetails = req.userDetails;

    if (!other_details_id) {
      throw new ApiError('Please provide other details id', 400);
    }

    const other_details =
      await slicing_done_other_details_model.findById(other_details_id);
    if (!other_details) {
      throw new ApiError('Other details not found', 404);
    }

    const issue_for_slicing_details = await issued_for_slicing_model.findById(
      other_details?.issue_for_slicing_id
    );

    if (!issue_for_slicing_details) {
      throw new ApiError('Issue for slicing Details not found...');
    }
    const items_details = await slicing_done_items_model.find({
      slicing_done_other_details_id: other_details?._id,
    });
    if (items_details?.length <= 0) {
      throw new ApiError('Items details not found', 404);
    }

    const delete_other_details_result =
      await slicing_done_other_details_model.findByIdAndDelete(
        other_details_id,
        {
          session,
        }
      );

    if (!delete_other_details_result) {
      throw new ApiError(
        'Unable to delete slicing done other details',
        StatusCodes.BAD_REQUEST
      );
    }
    const delete_slicing_done_items_result =
      await slicing_done_items_model.deleteMany(
        { slicing_done_other_details_id: other_details?._id },
        { session }
      );

    if (
      !delete_slicing_done_items_result?.acknowledged ||
      delete_slicing_done_items_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Unable to delete slicing items',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      issue_for_slicing_details?.type?.toLowerCase() ===
      issue_for_slicing?.wastage?.toLowerCase()
    ) {
      const delete_issue_for_slicing_wastage_result =
        await issue_for_slicing_wastage_model?.deleteOne(
          { issue_for_slicing_id: other_details?.issue_for_slicing_id },
          { session }
        );

      if (
        !delete_issue_for_slicing_wastage_result?.acknowledged ||
        delete_issue_for_slicing_wastage_result?.deletedCount === 0
      ) {
        throw new ApiError(
          'Unable to delete issue for slicing wastage details',
          StatusCodes.BAD_REQUEST
        );
      }
    }
    if (
      issue_for_slicing_details?.type?.toLowerCase() ===
      issue_for_slicing?.rest_roller?.toLowerCase()
    ) {
      const delete_issue_for_slicing_available_result =
        await issue_for_slicing_available_model.deleteOne(
          { issue_for_slicing_id: other_details?.issue_for_slicing_id },
          { session }
        );

      if (
        !delete_issue_for_slicing_available_result?.acknowledged ||
        delete_issue_for_slicing_available_result?.deletedCount === 0
      ) {
        throw new ApiError(
          'Unable to delete issue for slicing available details',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    const update_other_details_editable_status_for_done_items =
      await issued_for_slicing_model.updateOne(
        { _id: other_details?.issue_for_slicing_id },
        {
          $set: {
            type: null,
            is_slicing_completed: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (
      !update_other_details_editable_status_for_done_items.acknowledged ||
      update_other_details_editable_status_for_done_items.modifiedCount === 0
    ) {
      throw new ApiError(
        'Unable Update Issue for slicing Type Status',
        StatusCodes.BAD_REQUEST
      );
    }
    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Slicing Done Items Reverted Successfully',
      {
        other_details,
        items_details,
      }
    );

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const add_reslicing_done = catchAsync(async (req, res, next) => {
  const { other_details, items_details, type, wastage_details } = req.body;
  const userDetails = req.userDetails;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    for (let field of ['other_details', 'items_details', 'type']) {
      if (!req.body?.[field]) {
        throw new ApiError(`${field} is missing...`, StatusCodes.BAD_REQUEST);
      }
    }
    if (type?.toLowerCase() === issue_for_slicing?.wastage?.toLowerCase()) {
      if (!wastage_details) {
        throw new ApiError(
          'Wastage details are required..',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    const add_other_details_data =
      await slicing_done_other_details_model.create(
        [
          {
            ...other_details,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        { session }
      );

    const other_details_data = add_other_details_data?.[0];

    if (!other_details_data) {
      throw new ApiError(
        'Failed to add other details',
        StatusCodes.BAD_REQUEST
      );
    }
    const add_other_details_id = other_details_data?._id;
    const issue_for_slicing_id = other_details_data?.issue_for_slicing_id;

    //update slicing done other details to false as items will not be edited since reslicing is done for that item
    const update_is_editable_status =
      await slicing_done_other_details_model?.updateMany(
        {
          issue_for_slicing_id: issue_for_slicing_id,
          _id: { $ne: add_other_details_id },
        },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (
      !update_is_editable_status?.acknowledged ||
      update_is_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Editable status in other details',
        StatusCodes.BAD_REQUEST
      );
    }

    //item_details
    const items_details_data = items_details?.map((item) => {
      item.slicing_done_other_details_id = add_other_details_id;
      item.slicing_done_from = slicing_done_from?.re_slicing;
      (item.created_by = userDetails?._id),
        (item.updated_by = userDetails?._id);
      return item;
    });

    const add_items_details_data = await slicing_done_items_model.insertMany(
      items_details_data,
      { session }
    );

    if (add_items_details_data?.length === 0) {
      throw new ApiError('Failed to add Slicing Item Details', StatusCodes.OK);
    }

    // const update_other_details_editable_status_for_done_items = await issued_for_slicing_model?.findOneAndUpdate({ _id: issue_for_slicing_id }, {
    //   $set: {
    //     type: type,
    //     updated_by: userDetails?._id
    //   }
    // }, { new: true, runValidators: true, session });

    // if (!update_other_details_editable_status_for_done_items) {
    //   throw new ApiError("Failed to update issue for slicing type", StatusCodes.BAD_REQUEST)
    // };

    //add wastage details
    if (type?.toLowerCase() === issue_for_slicing?.wastage?.toLowerCase()) {
      const add_wastage_details = await issue_for_slicing_wastage_model.create(
        [
          {
            ...wastage_details,
            issue_for_slicing_id: issue_for_slicing_id,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        { session }
      );

      if (add_wastage_details?.length === 0) {
        throw new ApiError(
          'Failed to add wastage details',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    const update_issue_for_slicing_available_slicing_status =
      await issue_for_slicing_available_model?.updateOne(
        { issue_for_slicing_id: issue_for_slicing_id },
        {
          $set: {
            is_reslicing_done: true,
          },
        },
        { session }
      );

    if (
      !update_issue_for_slicing_available_slicing_status?.acknowledged ||
      update_issue_for_slicing_available_slicing_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issue for slicing available slicing done status',
        StatusCodes.BAD_REQUEST
      );
    }

    await session.commitTransaction();

    const response = new ApiResponse(
      StatusCodes.OK,
      'Re-Slicing Done Sucessfully',
      {
        other_details: other_details,
        items_details: items_details,
        wastage_details: wastage_details,
      }
    );

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    console.log('err => ', error);
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const revert_re_slicing_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { other_details_id } = req.params;
    if (!other_details_id) {
      throw new ApiError('Please provide other details id', 400);
    }

    const other_details =
      await slicing_done_other_details_model.findById(other_details_id);
    if (!other_details) {
      throw new ApiError('Other details not found', 404);
    }

    const issue_for_slicing_details = await issued_for_slicing_model.findById(
      other_details?.issue_for_slicing_id
    );

    if (!issue_for_slicing_details) {
      throw new ApiError('Issue for slicing Details not found...');
    }
    const items_details = await slicing_done_items_model.find({
      slicing_done_other_details_id: other_details?._id,
    });
    if (items_details?.length <= 0) {
      throw new ApiError('Items details not found', 404);
    }

    const delete_other_details_result =
      await slicing_done_other_details_model.findByIdAndDelete(
        other_details_id,
        {
          session,
        }
      );

    if (!delete_other_details_result) {
      throw new ApiError(
        'Unable to delete slicing done other details',
        StatusCodes.BAD_REQUEST
      );
    }
    const delete_slicing_done_items_result =
      await slicing_done_items_model.deleteMany(
        { slicing_done_other_details_id: other_details?._id },
        { session }
      );

    if (
      !delete_slicing_done_items_result?.acknowledged ||
      delete_slicing_done_items_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Unable to delete slicing items',
        StatusCodes.BAD_REQUEST
      );
    }

    const delete_issue_for_slicing_wastage_result =
      await issue_for_slicing_wastage_model?.deleteOne(
        { issue_for_slicing_id: other_details?.issue_for_slicing_id },
        { session }
      );

    if (
      !delete_issue_for_slicing_wastage_result?.acknowledged ||
      delete_issue_for_slicing_wastage_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Unable to delete issue for slicing wastage details',
        StatusCodes.BAD_REQUEST
      );
    }

    // if (
    //   issue_for_slicing_details?.type?.toLowerCase() ===
    //   issue_for_slicing?.rest_roller?.toLowerCase()
    // ) {
    //   const delete_issue_for_slicing_available_result =
    //     await issue_for_slicing_available_model.deleteOne(
    //       { issue_for_slicing_id: other_details?.issue_for_slicing_id },
    //       { session }
    //     );

    //   if (
    //     !delete_issue_for_slicing_available_result?.acknowledged ||
    //     delete_issue_for_slicing_available_result?.deletedCount === 0
    //   ) {
    //     throw new ApiError(
    //       'Unable to delete issue for slicing available details',
    //       StatusCodes.BAD_REQUEST
    //     );
    //   }
    // }

    const update_other_details_editable_status_for_done_items =
      await slicing_done_other_details_model.updateOne(
        {
          issue_for_slicing_id: other_details?.issue_for_slicing_id,
          _id: { $ne: other_details_id },
        },
        {
          $set: {
            isEditable: true,
          },
        },
        { session }
      );

    if (
      !update_other_details_editable_status_for_done_items.acknowledged ||
      update_other_details_editable_status_for_done_items.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to Update slicing done editable Status',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_is_reslicing_done_status =
      await issue_for_slicing_available_model?.updateOne(
        { issue_for_slicing_id: other_details?.issue_for_slicing_id },
        {
          $set: {
            is_reslicing_done: false,
          },
        },
        { session }
      );

    if (
      !update_is_reslicing_done_status.acknowledged ||
      update_is_reslicing_done_status?.modifiedCount === 0
    ) {
      throw new ApiError('Failed to update reslicing done status');
    }
    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Slicing Done Items Reverted Successfully',
      {
        other_details,
        items_details,
      }
    );

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const update_slicing_done_items_details = catchAsync(
  async (req, res) => {
    const { id } = req.params;
    const { no_of_leaves, thickness } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const { _id } = req.userDetails;
    const update_result = await slicing_done_items_model.updateOne(
      { _id: id },
      {
        $set: {
          no_of_leaves: no_of_leaves,
          thickness: thickness,
          updated_by: _id,
        },
      }
    );
    if (update_result.matchedCount <= 0) {
      throw new ApiError('Item Not Found', StatusCodes.NOT_FOUND);
    }

    if (!update_result.acknowledged || update_result.modifiedCount <= 0) {
      throw new ApiError('Failed to update item', StatusCodes.BAD_REQUEST);
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Item Updated Successfully'
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

// export const log_no_dropdown = catchAsync(async (req, res, next) => {
//   const log_no = await flitching_view_modal.distinct('log_no');
//   return res.status(200).json({
//     statusCode: 200,
//     status: 'success',
//     data: log_no,
//     message: 'Log No Dropdown fetched successfully',
//   });
// });
