import mongoose from 'mongoose';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../../utils/constants.js';
import {
  grouping_done_details_model,
  grouping_done_items_details_model,
} from '../../../../database/schema/factory/grouping/grouping_done.schema.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';
import issue_for_tapping_model from '../../../../database/schema/factory/tapping/issue_for_tapping/issue_for_tapping.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import grouping_done_history_model from '../../../../database/schema/factory/grouping/grouping_done_history.schema.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';

export const issue_for_tapping_from_grouping_for_stock_and_sample = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      const { grouping_done_item_id } = req.params;
      const { issue_status, issue_no_of_leaves } = req.body;
      if (
        !grouping_done_item_id ||
        !mongoose.isValidObjectId(grouping_done_item_id)
      ) {
        throw new ApiError(
          'Invalid grouping done item id',
          StatusCodes.BAD_REQUEST
        );
      }
      if (!issue_status || !issue_no_of_leaves) {
        throw new ApiError(
          'Required issue status or issue no of leaves',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        ![issues_for_status?.stock, issues_for_status?.sample].includes(
          issue_status
        )
      ) {
        throw new ApiError('Invalid issue status', StatusCodes.BAD_REQUEST);
      }

      const fetch_grouping_done_item_details =
        await grouping_done_items_details_model
          .findOne({ _id: grouping_done_item_id })
          .lean();
      if (!fetch_grouping_done_item_details) {
        throw new ApiError(
          'Grouping done item not found',
          StatusCodes.NOT_FOUND
        );
      }
      const data = fetch_grouping_done_item_details;
      const available_details = data?.available_details;

      const no_of_leaves_available =
        available_details?.no_of_leaves - issue_no_of_leaves;
      if (no_of_leaves_available < 0) {
        throw new ApiError(
          'Not enough leaves available',
          StatusCodes.BAD_REQUEST
        );
      }

      const grouping_item_sqm = available_details?.sqm;
      const tapping_sqm = Number(
        (data?.length * data?.width * issue_no_of_leaves)?.toFixed(3)
      );
      const tapping_amount = Number(
        (
          (tapping_sqm / grouping_item_sqm) *
          available_details?.amount
        )?.toFixed(2)
      );

      const grouping_data = {
        grouping_done_item_id: data?._id,
        grouping_done_other_details_id: data?.grouping_done_other_details_id,
        group_no: data?.group_no,
        item_name: data?.item_name,
        item_name_id: data?.item_name_id,
        item_sub_category_id: data?.item_sub_category_id,
        item_sub_category_name: data?.item_sub_category_name,
        log_no_code: data?.log_no_code,
        length: data?.length,
        width: data?.width,
        thickness: data?.thickness,
        pallet_number: data?.pallet_number,
        process_id: data?.process_id,
        process_name: data?.process_name,
        cut_id: data?.cut_id,
        cut_name: data?.cut_name,
        color_id: data?.color_id,
        color_name: data?.color_name,
        character_id: data?.character_id,
        character_name: data?.character_name,
        pattern_id: data?.pattern_id,
        pattern_name: data?.pattern_name,
        series_id: data?.series_id,
        series_name: data?.series_name,
        grade_id: data?.grade_id,
        grade_name: data?.grade_name,
      };

      const issue_for_tapping_data = {
        ...grouping_data,
        issue_status: issue_status,
        issued_from: issues_for_status.grouping,
        no_of_leaves: issue_no_of_leaves,
        sqm: tapping_sqm,
        amount: tapping_amount,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };

      const insert_issue_for_tapping = await issue_for_tapping_model.create(
        [issue_for_tapping_data],
        { session }
      );

      const issues_for_tapping_details = insert_issue_for_tapping?.[0];

      if (!issues_for_tapping_details) {
        throw new ApiError(
          'Failed to create issue for tapping',
          StatusCodes.NOT_FOUND
        );
      }

      //add issue for tapping items details to grouping done history
      const { _id: issue_for_tapping_id, ...grouping_history_detials } = issues_for_tapping_details?.toObject();
      const insert_tapping_item_to_grouping_history =
        await grouping_done_history_model.create([{
          issue_for_tapping_id: issue_for_tapping_id,
          ...grouping_history_detials
        }], {
          session,
        });

      const grouping_history_item_details =
        insert_tapping_item_to_grouping_history?.[0];
      if (!grouping_history_item_details) {
        throw new ApiError(
          'Failed to add grouping history item details',
          StatusCodes.NOT_FOUND
        );
      }

      // update grouping done items available details
      const update_grouping_done_item_available_quantity =
        await grouping_done_items_details_model.updateOne(
          {
            _id: issues_for_tapping_details.grouping_done_item_id,
          },
          {
            $set: {
              updated_by: userDetails?._id,
            },
            $inc: {
              'available_details.no_of_leaves':
                -issue_for_tapping_data?.no_of_leaves,
              'available_details.sqm': -issue_for_tapping_data?.sqm,
              'available_details.amount': -issue_for_tapping_data?.amount,
            },
          },
          { session }
        );

      if (update_grouping_done_item_available_quantity.matchedCount <= 0) {
        throw new ApiError('Failed to find grouping done item details', 400);
      }
      if (
        !update_grouping_done_item_available_quantity.acknowledged ||
        update_grouping_done_item_available_quantity.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Failed to update grouping done item available details',
          400
        );
      }

      // make editable false for grouping done other details
      const update_grouping_done_other_details =
        await grouping_done_details_model.updateOne(
          {
            _id: issues_for_tapping_details?.grouping_done_other_details_id,
          },
          {
            $set: {
              isEditable: false,
              updated_by: userDetails?._id,
            },
          },
          { runValidators: true, session }
        );

      if (update_grouping_done_other_details.matchedCount <= 0) {
        throw new ApiError('Failed to find grouping done other details', 400);
      }
      if (
        !update_grouping_done_other_details.acknowledged ||
        update_grouping_done_other_details.modifiedCount <= 0
      ) {
        throw new ApiError('Failed to update grouping done other details', 400);
      }

      const response = new ApiResponse(
        StatusCodes.OK,
        'Add issue for tapping successfully',
        issues_for_tapping_details
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

export const revert_issue_for_tapping_item = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { issue_for_tapping_id } = req.params;
      const userDetails = req?.userDetails;
      if (
        !issue_for_tapping_id ||
        !mongoose.isValidObjectId(issue_for_tapping_id)
      ) {
        throw new ApiError(
          'Invalid issue for tapping id',
          StatusCodes.BAD_REQUEST
        );
      }

      const fetch_issue_for_tapping_item_details = await issue_for_tapping_model
        .findOne({ _id: issue_for_tapping_id })
        .lean();
      if (!fetch_issue_for_tapping_item_details) {
        throw new ApiError(
          'Failed to find issue for tapping item details',
          StatusCodes.NOT_FOUND
        );
      }
      if (fetch_issue_for_tapping_item_details.is_tapping_done) {
        throw new ApiError(
          'Already tapping done id created',
          StatusCodes.BAD_REQUEST
        );
      }

      // delete issue for tapping item
      const delete_issue_for_tapping_item = await issue_for_tapping_model
        .findOneAndDelete(
          { _id: fetch_issue_for_tapping_item_details?._id },
          { session }
        )
        .lean();
      if (!delete_issue_for_tapping_item) {
        throw new ApiError(
          'Failed to delete issue for tapping item',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const grouping_done_item_id = delete_issue_for_tapping_item?.grouping_done_item_id;
      const grouping_done_other_details_id = delete_issue_for_tapping_item?.grouping_done_other_details_id;
      // delete grouping done history item
      const delete_grouping_done_history_item =
        await grouping_done_history_model.deleteOne(
          {
            issue_for_tapping_id: delete_issue_for_tapping_item?._id,
            grouping_done_item_id: grouping_done_item_id,
            grouping_done_other_details_id: grouping_done_other_details_id,
          },
          { session }
        );
      if (
        !delete_grouping_done_history_item.acknowledged ||
        delete_grouping_done_history_item.deletedCount <= 0
      ) {
        throw new ApiError(
          'Failed to delete grouping done history item',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // update available details in grouping done items
      const available_details = {
        no_of_leaves: delete_issue_for_tapping_item?.no_of_leaves,
        sqm: delete_issue_for_tapping_item?.sqm,
        amount: delete_issue_for_tapping_item?.amount,
      };
      const update_grouping_done_item_details =
        await grouping_done_items_details_model.updateOne(
          { _id: grouping_done_item_id },
          {
            $set: {
              updated_by: userDetails?._id,
            },
            $inc: {
              'available_details.no_of_leaves': available_details.no_of_leaves,
              'available_details.sqm': available_details.sqm,
              'available_details.amount': available_details.amount,
            },
          },
          { session, runValidators: true }
        );

      if (update_grouping_done_item_details.matchedCount <= 0) {
        throw new ApiError('Failed to find grouping done item details', 400);
      }
      if (
        !update_grouping_done_item_details.acknowledged ||
        update_grouping_done_item_details.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Failed to update grouping done item available details',
          400
        );
      }

      const isGroupingDoneOtherDetailsEditable =
        await grouping_done_items_details_model
          .find({
            _id: { $ne: grouping_done_item_id },
            grouping_done_other_details_id: grouping_done_other_details_id,
            $expr: {
              $ne: ['$no_of_leaves', '$available_details.no_of_leaves'],
            },
          })
          .lean();

      if (
        isGroupingDoneOtherDetailsEditable &&
        isGroupingDoneOtherDetailsEditable?.length <= 0
      ) {
        const update_grouping_done_other_details =
          await grouping_done_details_model.updateOne(
            {
              _id: grouping_done_other_details_id,
            },
            {
              $set: {
                isEditable: true,
                updated_by: userDetails?._id,
              },
            }
          );

        if (update_grouping_done_other_details.matchedCount <= 0) {
          throw new ApiError('Failed to find grouping done other details', 400);
        }
        if (
          !update_grouping_done_other_details.acknowledged ||
          update_grouping_done_other_details.modifiedCount <= 0
        ) {
          throw new ApiError(
            'Failed to update grouping done other details',
            400
          );
        }
      }
      const response = new ApiResponse(
        StatusCodes.OK,
        'revert issue for tapping successfully',
        delete_issue_for_tapping_item
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

export const fetch_single_issue_for_tapping_details = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
      throw new ApiError(`Please provide id`, StatusCodes.BAD_REQUEST);
    }

    const agg_match = {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(id),
      },
    };

    const aggregation_pipeline = [agg_match];
    const issue_for_tapping_details =
      await issue_for_tapping_model.aggregate(aggregation_pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Fetch data successfully',
      issue_for_tapping_details?.[0]
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_all_issue_for_tapping_details = catchAsync(
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
    };

    // Aggregation stage

    const aggCommonMatch = {
      $match: {
        is_tapping_done: false,
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
      aggSort,
      aggSkip,
      aggLimit,
    ]; // aggregation pipiline

    const issue_for_tapping =
      await issue_for_tapping_model.aggregate(listAggregate);

    const aggCount = {
      $count: 'totalCount',
    }; // count aggregation stage

    const totalAggregate = [
      aggCommonMatch,
      aggCreatedByLookup,
      aggCreatedByUnwind,
      aggUpdatedByLookup,
      aggUpdatedByUnwind,
      aggMatch,
      aggCount,
    ]; // total aggregation pipiline

    const totalDocument =
      await issue_for_tapping_model.aggregate(totalAggregate);

    const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
      200,
      'Issue For Tapping Data Fetched Successfully',
      {
        data: issue_for_tapping,
        totalPages: totalPages,
      }
    );
    return res.status(200).json(response);
  }
);
