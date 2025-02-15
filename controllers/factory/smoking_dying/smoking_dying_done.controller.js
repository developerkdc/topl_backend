import mongoose from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import {
  issues_for_smoking_dying_model,
  issues_for_smoking_dying_view_model,
} from '../../../database/schema/factory/smoking_dying/issues_for_smoking_dying.schema.js';
import {
  process_done_details_model,
  process_done_items_details_model,
} from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import process_done_history_model from '../../../database/schema/factory/smoking_dying/smoking_dying_done.history.schema.js';

export const add_process_done_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { process_done_details } = req.body;
    if (!process_done_details) {
      throw new ApiError(
        `Please provide process_done_details`,
        StatusCodes.BAD_REQUEST
      );
    }
    const required_field = [
      'issue_for_smoking_dying_unique_identifier',
      'issue_for_smoking_dying_pallet_number',
    ];
    for (let i of required_field) {
      if (!process_done_details?.[i]) {
        throw new ApiError(`Please provide ${i}`, StatusCodes.BAD_REQUEST);
      }
    }

    const unique_identifier = mongoose.Types.ObjectId.createFromHexString(
      process_done_details?.issue_for_smoking_dying_unique_identifier
    );
    const pallet_number =
      process_done_details?.issue_for_smoking_dying_pallet_number;

    const issue_for_smoking_dying =
      await issues_for_smoking_dying_view_model.aggregate([
        {
          $match: {
            _id: {
              unique_identifier: unique_identifier,
              pallet_number: pallet_number,
            },
          },
        },
      ]);

    if (!issue_for_smoking_dying || !issue_for_smoking_dying?.[0]) {
      throw new ApiError('No issue for smoking dying data found');
    }

    const add_process_done_details = await process_done_details_model.create(
      [
        {
          ...process_done_details,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        },
      ],
      { session }
    );
    if (!add_process_done_details || !add_process_done_details?.[0]) {
      throw new ApiError(
        'No issue for smoking dying data found',
        StatusCodes.BAD_GATEWAY
      );
    }

    const process_done_details_data = add_process_done_details?.[0];

    const process_done_items_details =
      await issues_for_smoking_dying_model.aggregate([
        {
          $match: {
            unique_identifier:
              process_done_details_data?.issue_for_smoking_dying_unique_identifier,
            pallet_number:
              process_done_details_data?.issue_for_smoking_dying_pallet_number,
          },
        },
        {
          $set: {
            process_done_id: process_done_details_data?._id,
            issue_for_smoking_dying_id: '$_id',
            pallet_number: process_done_details_data?.pallet_number,
            process_id: process_done_details_data?.process_id,
            process_name: process_done_details_data?.process_name,
            color_id: process_done_details_data?.color_id,
            color_name: process_done_details_data?.color_name,
            remark: process_done_details_data?.remark,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        },
        {
          $unset: ['_id', 'createdAt', 'updatedAt'],
        },
      ]);
    if (process_done_items_details?.length <= 0) {
      throw new ApiError(
        'No issue for smoking dying data found',
        StatusCodes.BAD_GATEWAY
      );
    }

    const add_process_done_items_details =
      await process_done_items_details_model.insertMany(
        process_done_items_details,
        { session }
      );
    if (add_process_done_items_details?.length <= 0) {
      throw new ApiError(
        'Failed to add process done data',
        StatusCodes.BAD_GATEWAY
      );
    }

    const update_issue_for_smoking_dying =
      await issues_for_smoking_dying_model.updateMany(
        {
          unique_identifier:
            process_done_details_data?.issue_for_smoking_dying_unique_identifier,
          pallet_number:
            process_done_details_data?.issue_for_smoking_dying_pallet_number,
        },
        {
          $set: {
            is_smoking_dying_done: true,
            updated_by: userDetails?._id,
          },
        },
        { runValidators: true, session }
      );

    if (update_issue_for_smoking_dying.matchedCount <= 0) {
      throw new ApiError(
        'No data found to update issue for smoking dying data',
        StatusCodes.BAD_GATEWAY
      );
    }
    if (
      !update_issue_for_smoking_dying.acknowledged ||
      update_issue_for_smoking_dying.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update issue for smoking dying data',
        StatusCodes.BAD_GATEWAY
      );
    }

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Process done Successfully',
      {
        process_done_details: process_done_details_data,
        process_done_items_details: add_process_done_items_details,
      }
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

export const edit_process_done_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { process_done_details } = req.body;
    const { process_done_details_id } = req.params;
    if (!process_done_details_id) {
      throw new ApiError(
        `Please provide process_done_details_id`,
        StatusCodes.BAD_REQUEST
      );
    }
    if (!process_done_details) {
      throw new ApiError(
        `Please provide process_done_details`,
        StatusCodes.BAD_REQUEST
      );
    }

    const fetch_process_done_details = await process_done_details_model
      .findOne({
        _id: process_done_details_id,
      })
      .lean();
    if (!fetch_process_done_details) {
      throw new ApiError('No process done data found', StatusCodes.BAD_GATEWAY);
    }
    if (!fetch_process_done_details.isEditable) {
      throw new ApiError('Cannot edit process done', StatusCodes.BAD_GATEWAY);
    }

    const update_process_done_details =
      await process_done_details_model.findOneAndUpdate(
        {
          _id: process_done_details_id,
        },
        {
          $set: {
            ...process_done_details,
            updated_by: userDetails?._id,
          },
        },
        { new: true, runValidators: true, session }
      );
    if (!update_process_done_details) {
      throw new ApiError(
        'Failed to update process done',
        StatusCodes.BAD_GATEWAY
      );
    }

    const update_process_done_items_details =
      await process_done_items_details_model.updateMany(
        {
          process_done_id: update_process_done_details?._id,
        },
        {
          $set: {
            pallet_number: update_process_done_details?.pallet_number,
            process_id: update_process_done_details?.process_id,
            process_name: update_process_done_details?.process_name,
            color_id: update_process_done_details?.color_id,
            color_name: update_process_done_details?.color_name,
            remark: update_process_done_details?.remark,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_process_done_items_details?.matchedCount <= 0) {
      throw new ApiError(
        'No process done items details found',
        StatusCodes.BAD_GATEWAY
      );
    }

    if (
      !update_process_done_items_details.acknowledged ||
      update_process_done_items_details.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update process done items details',
        StatusCodes.BAD_GATEWAY
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Process done edited successfully',
      {
        process_done_details: update_process_done_details,
        process_done_items_details: update_process_done_items_details,
      }
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

export const fetch_single_process_done_details = catchAsync(
  async (req, res, next) => {
    const { process_done_details_id } = req.params;
    if (!process_done_details_id) {
      throw new ApiError(
        `Please provide process_done_details_id`,
        StatusCodes.BAD_REQUEST
      );
    }

    const agg_match = {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(
          process_done_details_id
        ),
      },
    };
    const agg_items_lookup = {
      $lookup: {
        from: 'process_done_items_details',
        localField: '_id',
        foreignField: 'process_done_id',
        as: 'process_done_items_details',
      },
    };

    const aggregation_pipeline = [agg_match, agg_items_lookup];
    const process_done_details =
      await process_done_details_model.aggregate(aggregation_pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Process done fetch successfully',
      process_done_details
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_all_process_done_details = catchAsync(
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
      search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const match_query = {
      ...search_query,
      ...filterData,
    };

    const agg_lookup_items = {
      $lookup: {
        from: 'process_done_items_details',
        localField: '_id',
        foreignField: 'process_done_id',
        as: 'process_done_items_details',
      },
    };
    const agg_lookup_created_by = {
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
    const agg_unwind_created_by = {
      $unwind: {
        path: '$created_user_details',
        preserveNullAndEmptyArrays: true,
      },
    };
    const agg_lookup_updated_by = {
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
    const agg_unwind_updated_by = {
      $unwind: {
        path: '$updated_user_details',
        preserveNullAndEmptyArrays: true,
      },
    };
    const agg_match = {
      $match: {
        ...match_query,
      },
    };
    const agg_sort = {
      $sort: {
        [sortBy]: sort === 'desc' ? -1 : 1,
      },
    };
    const agg_skip = {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    };
    const agg_limit = {
      $limit: parseInt(limit),
    };

    const aggregation_pipeline = [
      agg_lookup_items,
      agg_lookup_created_by,
      agg_unwind_created_by,
      agg_lookup_updated_by,
      agg_unwind_updated_by,
      agg_match,
      agg_sort,
      agg_skip,
      agg_limit,
    ];

    const result =
      await process_done_details_model.aggregate(aggregation_pipeline);

    const agg_count = {
      $count: 'totalCount',
    };

    const total_count_aggregation_pipeline = [
      agg_lookup_items,
      agg_lookup_created_by,
      agg_unwind_created_by,
      agg_lookup_updated_by,
      agg_unwind_updated_by,
      agg_match,
      agg_count,
    ];

    const total_docs = await process_done_details_model.aggregate(
      total_count_aggregation_pipeline
    );

    const totalPages = Math.ceil((total_docs?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(200, 'Data Fetched Successfully', {
      data: result,
      totalPages: totalPages,
    });
    return res.status(200).json(response);
  }
);

export const fetch_smoking_dying_done_history = catchAsync(
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
      issue_status: { $ne: null },
    };
    const aggMatch = {
      $match: {
        ...match_query,
      },
    };
    const aggAddGlobalFields = {
      $addFields: {
        item_name: { $arrayElemAt: ['$bundle_details.item_name', 0] },
        item_sub_cat: {
          $arrayElemAt: ['$bundle_details.item_sub_category_name', 0],
        },
        issue_status: { $arrayElemAt: ['$bundle_details.issue_status', 0] },
        log_no_code: { $arrayElemAt: ['$bundle_details.log_no_code', 0] },
      },
    };
    const aggLookupProcessDoneDetails = {
      $lookup: {
        from: 'process_done_details',
        localField: 'process_done_id',
        foreignField: '_id',
        as: 'process_done_details',
      },
    };
    const aggUnwindDressingDoneOtherDetails = {
      $unwind: {
        path: '$process_done_details',
        preserveNullAndEmptyArrays: true,
      },
    };
    const aggLookupBundles = {
      $lookup: {
        from: 'process_done_items_details',
        localField: 'bundles',
        foreignField: '_id',
        as: 'bundle_details',
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
      aggLookupProcessDoneDetails,
      aggLookupBundles,
      aggAddGlobalFields,
      aggUnwindDressingDoneOtherDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatdUser,
      aggMatch,
      // aggAddGlobalFields,
      aggSort,
      aggSkip,
      aggLimit,
    ];

    const result =
      await process_done_history_model.aggregate(list_aggregate);

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

    const total_docs =
      await process_done_history_model.aggregate(count_total_docs);

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
  }
);

export const revert_process_done_details = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      let { id } = req.params;
      if (!id || !mongoose.isValidObjectId(id)) {
        throw new ApiError(
          `Please valid process_done_details_id`,
          StatusCodes.BAD_REQUEST
        );
      }

      const fetch_process_done_details = await process_done_details_model
        .findOne({
          _id: id,
        })
        .lean();
      if (!fetch_process_done_details) {
        throw new ApiError(
          'No process done data found',
          StatusCodes.BAD_GATEWAY
        );
      }
      if (!fetch_process_done_details.isEditable) {
        throw new ApiError(
          'Cannot revert process done',
          StatusCodes.BAD_GATEWAY
        );
      }

      const process_done_details_id = fetch_process_done_details?._id;
      const issue_for_smoking_dying_unique_identifier =
        fetch_process_done_details?.issue_for_smoking_dying_unique_identifier;
      const issue_for_smoking_dying_pallet_number =
        fetch_process_done_details?.issue_for_smoking_dying_pallet_number;

      //delete process done
      const delete_process_done = await process_done_details_model.deleteOne(
        { _id: process_done_details_id },
        { session }
      );
      if (
        !delete_process_done.acknowledged ||
        delete_process_done.deletedCount <= 0
      ) {
        throw new ApiError(
          'Failed to delete process done details',
          StatusCodes.BAD_GATEWAY
        );
      }

      //delete process done items
      const delete_process_done_items =
        await process_done_items_details_model.deleteMany(
          { process_done_id: process_done_details_id },
          { session }
        );
      if (
        !delete_process_done_items.acknowledged ||
        delete_process_done_items.deletedCount <= 0
      ) {
        throw new ApiError(
          'Failed to delete process done items details',
          StatusCodes.BAD_GATEWAY
        );
      }
      console.log({
        unique_identifier: issue_for_smoking_dying_unique_identifier,
        pallet_number: issue_for_smoking_dying_pallet_number,
      });
      const update_issue_for_smoking_dying =
        await issues_for_smoking_dying_model.updateMany(
          {
            unique_identifier: issue_for_smoking_dying_unique_identifier,
            pallet_number: issue_for_smoking_dying_pallet_number,
          },
          {
            $set: {
              is_smoking_dying_done: false,
              updated_by: userDetails?._id,
            },
          },
          { runValidators: true, session }
        );

      if (update_issue_for_smoking_dying.matchedCount <= 0) {
        throw new ApiError(
          'No data found to update issue for smoking dying data',
          StatusCodes.BAD_GATEWAY
        );
      }
      if (
        !update_issue_for_smoking_dying.acknowledged ||
        update_issue_for_smoking_dying.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Failed to update issue for smoking dying data',
          StatusCodes.BAD_GATEWAY
        );
      }

      const response = new ApiResponse(
        StatusCodes.OK,
        'Process done revert successfully',
        {
          process_done_details: delete_process_done,
          process_done_items_details: delete_process_done_items,
        }
      );
      await session.commitTransaction();
      return res.status(StatusCodes.OK).json(response);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
);
