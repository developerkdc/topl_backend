import mongoose from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import { issues_for_grouping_model } from '../../../database/schema/factory/grouping/issues_for_grouping.schema.js';
import {
  grouping_done_details_model,
  grouping_done_items_details_model,
} from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { StatusCodes } from '../../../utils/constants.js';

export const add_grouping_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { other_details, items_details } = req.body;
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

    // issue for grouping
    const fetch_issue_for_grouping_data =
      await issues_for_grouping_model.findOne({
        _id: other_details?.issue_for_grouping_id,
      });
    if (!fetch_issue_for_grouping_data) {
      throw new ApiError('Issue for grouping data not found', 400);
    }
    if (fetch_issue_for_grouping_data?.is_grouping_done) {
      throw new ApiError(
        'Already created grouping done for this issue for grouping',
        400
      );
    }

    // Other goods details
    const add_other_details_data = await grouping_done_details_model.create(
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
      item.grouping_done_other_details_id = add_other_details_id;
      item.created_by = userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });
    const add_items_details_data =
      await grouping_done_items_details_model.insertMany(items_details_data, {
        session,
      });
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // update issue for grouping issue status
    const issue_for_grouping_id = other_details_data?.issue_for_grouping_id;
    const update_issue_for_grouping = await issues_for_grouping_model.updateOne(
      { _id: issue_for_grouping_id },
      {
        $set: {
          is_grouping_done: true,
          updated_by: userDetails?._id,
        },
      },
      { runValidators: true, session }
    );

    if (update_issue_for_grouping.matchedCount <= 0) {
      throw new ApiError('Failed to find Issue for grouping', 400);
    }
    if (
      !update_issue_for_grouping.acknowledged ||
      update_issue_for_grouping.modifiedCount <= 0
    ) {
      throw new ApiError('Failed to update Issue for grouping', 400);
    }

    await session.commitTransaction();
    const response = new ApiResponse(201, 'Grouping Done Successfully', {
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

export const edit_grouping_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { grouping_done_id } = req.params;
    if (!grouping_done_id && !mongoose.isValidObjectId(grouping_done_id)) {
      throw new ApiError('Invalid grouping done id', 400);
    }
    const { other_details, items_details } = req.body;

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

    const fetch_other_details_data = await grouping_done_details_model.findOne({
      _id: grouping_done_id,
    });
    if (!fetch_other_details_data) {
      throw new ApiError('Not data found', 400);
    }
    if (!fetch_other_details_data.isEditable) {
      throw new ApiError('Cannot edit grouping done', 400);
    }

    // Other goods details
    const { createdAt, updatetAt, ...update_other_details } = other_details;
    const add_other_details_data =
      await grouping_done_details_model.findOneAndUpdate(
        { _id: grouping_done_id },
        {
          $set: {
            ...update_other_details,
            updated_by: userDetails?._id,
          },
        },
        { new: true, runValidators: true, session }
      );

    const other_details_data = add_other_details_data;

    if (!other_details_data) {
      throw new ApiError('Failed to update other details', 400);
    }
    const add_other_details_id = other_details_data?._id;

    // item details

    const items_details_data = items_details?.map((item, index) => {
      item.grouping_done_other_details_id = add_other_details_id;
      item.created_by = item.created_by ? item.created_by : userDetails?._id;
      item.updated_by = userDetails?._id;
      item.createdAt = item.createdAt ? item.createdAt : new Date();
      item.updatedAt = new Date();
      return item;
    });

    const delete_items_details =
      await grouping_done_items_details_model.deleteMany(
        { grouping_done_other_details_id: add_other_details_id },
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

    const add_items_details_data =
      await grouping_done_items_details_model.insertMany(items_details_data, {
        session,
      });
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      201,
      'Grouping Done Updated Successfully',
      {
        other_details: other_details_data,
        items_details: add_items_details_data,
      }
    );

    return res.status(201).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const fetch_all_grouping_done_items = catchAsync(
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

    const match_common_query = {
      $match: {
        is_damaged: false,
        issue_status: null,
      },
    };

    const match_query = {
      ...search_query,
      ...filterData,
    };

    const aggLookupOtherDetails = {
      $lookup: {
        from: 'grouping_done_details',
        localField: 'grouping_done_other_details_id',
        foreignField: '_id',
        as: 'grouping_done_other_details',
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
    const aggUnwindOtherDetails = {
      $unwind: {
        path: '$grouping_done_other_details',
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
      match_common_query,
      aggLookupOtherDetails,
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

    const result =
      await grouping_done_items_details_model.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      match_common_query,
      aggLookupOtherDetails,
      aggUnwindOtherDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggCount,
    ];

    const total_docs =
      await grouping_done_items_details_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(200, 'Data Fetched Successfully', {
      data: result,
      totalPages: totalPages,
    });
    return res.status(200).json(response);
  }
);

export const fetch_all_details_by_grouping_done_id = catchAsync(
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
          from: 'grouping_done_items_details',
          localField: '_id',
          foreignField: 'grouping_done_other_details_id',
          as: 'grouping_done_items_details',
        },
      },
      {
        $lookup: {
          from: 'issues_for_grouping_views',
          localField: 'issue_for_grouping_id',
          foreignField: '_id',
          as: 'issues_for_grouping',
        },
      },
      {
        $unwind: {
          path: "$issues_for_grouping",
          preserveNullAndEmptyArrays: true
        }
      }
    ];
    const result = await grouping_done_details_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Details Fetched successfully',
      result?.[0]
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_all_details_by_grouping_done_item_id = catchAsync(
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
          from: 'grouping_done_details',
          localField: 'grouping_done_other_details_id',
          foreignField: '_id',
          as: 'grouping_done_other_details',
        },
      },
      {
        $unwind: {
          path: '$grouping_done_other_details',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];
    const result = await grouping_done_items_details_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Details Fetched successfully',
      result?.[0]
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const revert_all_grouping_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const userDetails = req.userDetails;
    if (!id && !mongoose.isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
    }

    const grouping_done_other_details =
      await grouping_done_details_model.findOne({ _id: id });

    if (!grouping_done_other_details) {
      throw new ApiError('Not data found', 400);
    }

    if (!grouping_done_other_details?.isEditable) {
      throw new ApiError('Cannot revert grouping done', 400);
    }

    const grouping_done_other_details_id = grouping_done_other_details?._id;

    const delete_grouping_done_other_details =
      await grouping_done_details_model.findOneAndDelete(
        { _id: grouping_done_other_details_id },
        { session }
      );

    if (!delete_grouping_done_other_details) {
      throw new ApiError('Failed to delete grouping done', 400);
    }

    //delete items
    const deleted_grouping_done_other_details_id =
      delete_grouping_done_other_details?._id;

    const delete_grouping_done_items_details =
      await grouping_done_items_details_model.deleteMany(
        {
          grouping_done_other_details_id:
            deleted_grouping_done_other_details_id,
        },
        { session }
      );

    if (
      !delete_grouping_done_items_details.acknowledged ||
      delete_grouping_done_items_details.deletedCount <= 0
    ) {
      throw new ApiError('Failed to delete grouping done items', 400);
    }

    const issue_for_grouping_id =
      delete_grouping_done_other_details?.issue_for_grouping_id;

    const update_issue_for_grouping = await issues_for_grouping_model.updateOne(
      { _id: issue_for_grouping_id },
      {
        $set: {
          is_grouping_done: false,
          updated_by: userDetails?._id,
        },
      },
      { session }
    );

    if (
      !update_issue_for_grouping.acknowledged ||
      update_issue_for_grouping.modifiedCount <= 0
    ) {
      throw new ApiError('Failed to update type issue for grouping', 400);
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Grouping Done Revert Successfully'
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const group_no_dropdown = catchAsync(async (req, res, next) => {
  const fetch_group_no = await grouping_done_items_details_model.find({}, {
    group_no: 1,
    photo_no: 1,
    photo_no_id: 1
  })
  const response = new ApiResponse(
    StatusCodes.OK,
    'Details Fetched successfully',
    fetch_group_no
  );

  return res.status(StatusCodes.OK).json(response);
})

//Damaged
export const fetch_all_damaged_grouping_done_items = catchAsync(
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

    const match_common_query = {
      $match: {
        is_damaged: true,
        issue_status: null,
      },
    };
    const match_query = {
      ...search_query,
      ...filterData,
    };
    const aggLookupOtherDetails = {
      $lookup: {
        from: 'grouping_done_details',
        localField: 'grouping_done_other_details_id',
        foreignField: '_id',
        as: 'grouping_done_other_details',
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
    const aggUnwindOtherDetails = {
      $unwind: {
        path: '$grouping_done_other_details',
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
      match_common_query,
      aggLookupOtherDetails,
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

    const result =
      await grouping_done_items_details_model.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      match_common_query,
      aggLookupOtherDetails,
      aggUnwindOtherDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggCount,
    ];

    const total_docs =
      await grouping_done_items_details_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(200, 'Data Fetched Successfully', {
      data: result,
      totalPages: totalPages,
    });
    return res.status(200).json(response);
  }
);

export const add_grouping_done_damaged = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userDetails = req.userDetails;
  if (!id && !mongoose.isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
  }

  const grouping_done_other_details =
    await grouping_done_items_details_model.findOne({ _id: id });

  if (!grouping_done_other_details) {
    throw new ApiError('Not data found', 400);
  }

  const update_grouping_done_damaged =
    await grouping_done_items_details_model.updateOne(
      { _id: id },
      {
        $set: {
          is_damaged: true,
          updated_by: userDetails?._id,
        },
      },
      { runValidators: true }
    );

  if (update_grouping_done_damaged.matchedCount <= 0) {
    throw new ApiError('Failed to find grouping done', 400);
  }
  if (
    !update_grouping_done_damaged.acknowledged ||
    update_grouping_done_damaged.modifiedCount <= 0
  ) {
    throw new ApiError('Failed to update grouping done to damaged', 400);
  }

  const response = new ApiResponse(
    StatusCodes.OK,
    'Add to damaged successfully',
    update_grouping_done_damaged
  );

  return res.status(StatusCodes.OK).json(response);
});

export const revert_grouping_done_damaged = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;
    const userDetails = req.userDetails;
    if (!id && !mongoose.isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
    }

    const grouping_done_other_details =
      await grouping_done_items_details_model.findOne({
        _id: id,
        is_damaged: true,
      });

    if (!grouping_done_other_details) {
      throw new ApiError('Not data found', 400);
    }

    const update_grouping_done_damaged =
      await grouping_done_items_details_model.updateOne(
        { _id: id, is_damaged: true },
        {
          $set: {
            is_damaged: false,
            updated_by: userDetails?._id,
          },
        },
        { runValidators: true }
      );

    if (update_grouping_done_damaged.matchedCount <= 0) {
      throw new ApiError('Failed to find grouping done', 400);
    }
    if (
      !update_grouping_done_damaged.acknowledged ||
      update_grouping_done_damaged.modifiedCount <= 0
    ) {
      throw new ApiError('Failed to update grouping done to damaged', 400);
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Revert Damaged successfully',
      update_grouping_done_damaged
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

//re-create grouping
export const recreate_grouping_done_items = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id } = req.params;
      const userDetails = req.userDetails;
      if (!id && !mongoose.isValidObjectId(id)) {
        throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
      }

      const { items_details } = req.body;

      if (!items_details) {
        throw new ApiError(`Please provide ${i} details`, 400);
      }
      if (!Array.isArray(items_details)) {
        throw new ApiError('items_details must be array', 400);
      }
      if (items_details?.length < 0) {
        throw new ApiError('Atleast one items is required', 400);
      }

      const grouping_done_other_details =
        await grouping_done_items_details_model.findOne({ _id: id });
      if (!grouping_done_other_details) {
        throw new ApiError('Not data found', 400);
      }
      if (grouping_done_other_details.issue_status) {
        throw new ApiError(
          `Item already issues for ${grouping_done_other_details.issue_status}`,
          400
        );
      }

      // item details
      const add_other_details_id =
        grouping_done_other_details?.grouping_done_other_details_id;
      const items_details_data = items_details?.map((item, index) => {
        item.grouping_done_other_details_id = add_other_details_id;
        item.created_by = userDetails?._id;
        item.updated_by = userDetails?._id;
        return item;
      });
      const add_items_details_data =
        await grouping_done_items_details_model.insertMany(items_details_data, {
          session,
        });
      if (add_items_details_data?.length <= 0) {
        throw new ApiError('Failed to add Items details', 400);
      }

      // delete grouping done id
      const delete_grouping_done_item =
        await grouping_done_items_details_model.deleteOne(
          { _id: grouping_done_other_details?._id },
          { session }
        );

      if (
        !delete_grouping_done_item.acknowledged ||
        delete_grouping_done_item.deletedCount <= 0
      ) {
        throw new ApiError('Failed to delete grouping done item', 400);
      }

      await session.commitTransaction();
      const response = new ApiResponse(
        201,
        'Recreate Grouping Done Successfully',
        {
          items_details: add_items_details_data,
        }
      );

      return res.status(201).json(response);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
);
