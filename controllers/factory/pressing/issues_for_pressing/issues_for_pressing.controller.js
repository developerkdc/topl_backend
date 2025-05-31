import mongoose from 'mongoose';
import { issues_for_pressing_model } from '../../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import {
  tapping_done_items_details_model,
  tapping_done_other_details_model,
} from '../../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { tapping_done_history_model } from '../../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import {
  issues_for_status,
  item_issued_for,
  order_category,
} from '../../../../database/Utils/constants/constants.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { OrderModel } from '../../../../database/schema/order/orders.schema.js';

const order_items_collections = {
  [order_category.decorative]: 'decorative_order_item_details',
  [order_category.series_product]: 'series_product_order_item_details',
};

export const issue_for_pressing_from_tapping = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      const { tapping_done_item_id } = req.params;
      const { issue_no_of_sheets } = req.body;
      if (
        !tapping_done_item_id ||
        !mongoose.isValidObjectId(tapping_done_item_id)
      ) {
        throw new ApiError(
          'Invalid tapping done item id',
          StatusCodes.BAD_REQUEST
        );
      }
      if (!issue_no_of_sheets) {
        throw new ApiError(
          'Required issue status or issue no of sheets',
          StatusCodes.BAD_REQUEST
        );
      }

      const fetch_tapping_done_item_details =
        await tapping_done_items_details_model
          .findOne({ _id: tapping_done_item_id })
          .lean();
      if (!fetch_tapping_done_item_details) {
        throw new ApiError(
          'Tapping done item not found',
          StatusCodes.NOT_FOUND
        );
      }
      const data = fetch_tapping_done_item_details;
      const available_details = data?.available_details;

      const no_of_sheets_available =
        available_details?.no_of_sheets - issue_no_of_sheets;
      if (no_of_sheets_available < 0) {
        throw new ApiError(
          'Not enough sheets available',
          StatusCodes.BAD_REQUEST
        );
      }

      const tapping_item_sqm = available_details?.sqm;
      const pressing_sqm = Number(
        (data?.length * data?.width * issue_no_of_sheets)?.toFixed(3)
      );
      const pressing_amount = Number(
        (
          (pressing_sqm / tapping_item_sqm) *
          available_details?.amount
        )?.toFixed(2)
      );

      const tapping_data = {
        tapping_done_item_id: data?._id,
        tapping_done_other_details_id: data?.tapping_done_other_details_id,
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
        remark: data?.remark,
      };

      const issue_for_pressing_data = {
        ...tapping_data,
        order_id: data?.order_id,
        order_item_id: data?.order_item_id,
        order_category: data?.order_category,
        issued_for: data?.issued_for,
        issued_from: issues_for_status.tapping,
        no_of_sheets: issue_no_of_sheets,
        sqm: pressing_sqm,
        amount: pressing_amount,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };

      const insert_issue_for_pressing = await issues_for_pressing_model.create(
        [issue_for_pressing_data],
        { session }
      );

      const issues_for_pressing_details = insert_issue_for_pressing?.[0];

      if (!issues_for_pressing_details) {
        throw new ApiError(
          'Failed to create issue for pressing',
          StatusCodes.NOT_FOUND
        );
      }

      //add issue for pressing items details to tapping done history
      const { _id: issue_for_pressing_id, ...tapping_history_detials } =
        issues_for_pressing_details?.toObject();
      const insert_pressing_item_to_tapping_history =
        await tapping_done_history_model.create(
          [
            {
              issue_for_pressing_id: issue_for_pressing_id,
              ...tapping_history_detials,
            },
          ],
          {
            session,
          }
        );

      const tapping_history_item_details =
        insert_pressing_item_to_tapping_history?.[0];
      if (!tapping_history_item_details) {
        throw new ApiError(
          'Failed to add tapping history item details',
          StatusCodes.NOT_FOUND
        );
      }

      // update tapping done items available details
      const update_tapping_done_item_available_quantity =
        await tapping_done_items_details_model.updateOne(
          {
            _id: issues_for_pressing_details.tapping_done_item_id,
          },
          {
            $set: {
              updated_by: userDetails?._id,
            },
            $inc: {
              'available_details.no_of_sheets':
                -issue_for_pressing_data?.no_of_sheets,
              'available_details.sqm': -issue_for_pressing_data?.sqm,
              'available_details.amount': -issue_for_pressing_data?.amount,
            },
          },
          { session }
        );

      if (update_tapping_done_item_available_quantity.matchedCount <= 0) {
        throw new ApiError('Failed to find tapping done item details', 400);
      }
      if (
        !update_tapping_done_item_available_quantity.acknowledged ||
        update_tapping_done_item_available_quantity.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Failed to update tapping done item available details',
          400
        );
      }

      // make editable false for tapping done other details
      const update_tapping_done_other_details =
        await tapping_done_other_details_model.updateOne(
          {
            _id: issues_for_pressing_details?.tapping_done_other_details_id,
          },
          {
            $set: {
              isEditable: false,
              updated_by: userDetails?._id,
            },
          },
          { runValidators: true, session }
        );

      if (update_tapping_done_other_details.matchedCount <= 0) {
        throw new ApiError('Failed to find grouping done other details', 400);
      }
      if (
        !update_tapping_done_other_details.acknowledged ||
        update_tapping_done_other_details.modifiedCount <= 0
      ) {
        throw new ApiError('Failed to update grouping done other details', 400);
      }

      const response = new ApiResponse(
        StatusCodes.OK,
        'Add issue for pressing successfully',
        issues_for_pressing_details
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

export const issue_for_pressing_from_tapping_for_order = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      const { tapping_done_item_id } = req.params;
      const {
        order_id,
        order_item_id,
        order_category_status,
        issue_no_of_sheets,
      } = req.body;
      if (
        !tapping_done_item_id ||
        !mongoose.isValidObjectId(tapping_done_item_id)
      ) {
        throw new ApiError(
          'Invalid grouping done item id',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !order_id ||
        !order_item_id ||
        !issue_no_of_sheets ||
        !order_category_status
      ) {
        throw new ApiError(
          'Required order id or order item id or issue no of sheets or order category status',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        ![order_category.decorative, order_category.series_product].includes(
          order_category_status
        )
      ) {
        throw new ApiError(
          `Invalid order category status : ${order_category_status}`,
          StatusCodes.BAD_REQUEST
        );
      }

      const fetch_order_details = await OrderModel.findOne({
        _id: order_id,
      }).lean();
      if (!fetch_order_details) {
        throw new ApiError('order details not found', StatusCodes?.NOT_FOUND);
      }
      if (fetch_order_details?.order_category !== order_category_status) {
        throw new ApiError(
          `Mismatch order category : ${order_category_status} - ${fetch_order_details?.order_category}`
        );
      }

      const fetch_order_item_details = await mongoose
        .model(order_items_collections?.[order_category_status])
        .aggregate([
          {
            $match: {
              _id: mongoose.Types.ObjectId.createFromHexString(order_item_id),
              order_id: fetch_order_details?._id,
            },
          },
          {
            $lookup: {
              from: 'orders',
              localField: 'order_id',
              foreignField: '_id',
              as: 'order_details',
            },
          },
          {
            $unwind: {
              path: '$order_details',
              preserveNullAndEmptyArrays: true,
            },
          },
        ]);
      const order_item_details = fetch_order_item_details?.[0];
      if (!order_item_details) {
        throw new ApiError(`order items not found`, StatusCodes.NOT_FOUND);
      }

      const fetch_tapping_done_item_details =
        await tapping_done_items_details_model
          .findOne({ _id: tapping_done_item_id })
          .lean();
      if (!fetch_tapping_done_item_details) {
        throw new ApiError(
          'Tapping done item not found',
          StatusCodes.NOT_FOUND
        );
      }
      const data = fetch_tapping_done_item_details;
      const available_details = data?.available_details;

      const no_of_sheets_available =
        available_details?.no_of_sheets - issue_no_of_sheets;
      if (no_of_sheets_available < 0) {
        throw new ApiError(
          'Not enough sheets available',
          StatusCodes.BAD_REQUEST
        );
      }

      const tapping_item_sqm = available_details?.sqm;
      const pressing_sqm = Number(
        (data?.length * data?.width * issue_no_of_sheets)?.toFixed(3)
      );
      const pressing_amount = Number(
        (
          (pressing_sqm / tapping_item_sqm) *
          available_details?.amount
        )?.toFixed(2)
      );

      const tapping_data = {
        tapping_done_item_id: data?._id,
        tapping_done_other_details_id: data?.tapping_done_other_details_id,
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
        remark: data?.remark,
      };

      const issue_for_pressing_data = {
        ...tapping_data,
        order_id: order_item_details?.order_id,
        order_item_id: order_item_details?._id,
        order_category: order_item_details?.order_details?.order_category,
        issued_for: item_issued_for.order,
        issued_from: issues_for_status.tapping,
        no_of_sheets: issue_no_of_sheets,
        sqm: pressing_sqm,
        amount: pressing_amount,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };

      const insert_issue_for_pressing = await issues_for_pressing_model.create(
        [issue_for_pressing_data],
        { session }
      );

      const issues_for_pressing_details = insert_issue_for_pressing?.[0];

      if (!issues_for_pressing_details) {
        throw new ApiError(
          'Failed to create issue for pressing',
          StatusCodes.NOT_FOUND
        );
      }

      //add issue for pressing items details to tapping done history
      const { _id: issue_for_pressing_id, ...tapping_history_detials } =
        issues_for_pressing_details?.toObject();
      const insert_pressing_item_to_tapping_history =
        await tapping_done_history_model.create(
          [
            {
              issue_for_pressing_id: issue_for_pressing_id,
              ...tapping_history_detials,
            },
          ],
          {
            session,
          }
        );

      const tapping_history_item_details =
        insert_pressing_item_to_tapping_history?.[0];
      if (!tapping_history_item_details) {
        throw new ApiError(
          'Failed to add tapping history item details',
          StatusCodes.NOT_FOUND
        );
      }

      // update tapping done items available details
      const update_tapping_done_item_available_quantity =
        await tapping_done_items_details_model.updateOne(
          {
            _id: issues_for_pressing_details.tapping_done_item_id,
          },
          {
            $set: {
              updated_by: userDetails?._id,
            },
            $inc: {
              'available_details.no_of_sheets':
                -issue_for_pressing_data?.no_of_sheets,
              'available_details.sqm': -issue_for_pressing_data?.sqm,
              'available_details.amount': -issue_for_pressing_data?.amount,
            },
          },
          { session }
        );

      if (update_tapping_done_item_available_quantity.matchedCount <= 0) {
        throw new ApiError('Failed to find tapping done item details', 400);
      }
      if (
        !update_tapping_done_item_available_quantity.acknowledged ||
        update_tapping_done_item_available_quantity.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Failed to update tapping done item available details',
          400
        );
      }

      // make editable false for tapping done other details
      const update_tapping_done_other_details =
        await tapping_done_other_details_model.updateOne(
          {
            _id: issues_for_pressing_details?.tapping_done_other_details_id,
          },
          {
            $set: {
              isEditable: false,
              updated_by: userDetails?._id,
            },
          },
          { runValidators: true, session }
        );

      if (update_tapping_done_other_details.matchedCount <= 0) {
        throw new ApiError('Failed to find grouping done other details', 400);
      }
      if (
        !update_tapping_done_other_details.acknowledged ||
        update_tapping_done_other_details.modifiedCount <= 0
      ) {
        throw new ApiError('Failed to update grouping done other details', 400);
      }

      const response = new ApiResponse(
        StatusCodes.OK,
        'Add issue for pressing successfully',
        issues_for_pressing_details
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

export const revert_issue_for_pressing_item = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { issue_for_pressing_id } = req.params;
      const userDetails = req?.userDetails;
      if (
        !issue_for_pressing_id ||
        !mongoose.isValidObjectId(issue_for_pressing_id)
      ) {
        throw new ApiError(
          'Invalid issue for pressing id',
          StatusCodes.BAD_REQUEST
        );
      }

      const fetch_issue_for_pressing_item_details =
        await issues_for_pressing_model
          .findOne({ _id: issue_for_pressing_id })
          .lean();

      if (!fetch_issue_for_pressing_item_details) {
        throw new ApiError(
          'Failed to find issue for pressing item details',
          StatusCodes.NOT_FOUND
        );
      }
      if (fetch_issue_for_pressing_item_details.is_pressing_done) {
        throw new ApiError(
          'Already pressing done id created',
          StatusCodes.BAD_REQUEST
        );
      }

      // delete issue for pressing item
      const delete_issue_for_pressing_item = await issues_for_pressing_model
        .findOneAndDelete(
          { _id: fetch_issue_for_pressing_item_details?._id },
          { session }
        )
        .lean();
      if (!delete_issue_for_pressing_item) {
        throw new ApiError(
          'Failed to delete issue for pressing item',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const tapping_done_item_id =
        delete_issue_for_pressing_item?.tapping_done_item_id;
      const tapping_done_other_details_id =
        delete_issue_for_pressing_item?.tapping_done_other_details_id;

      // delete tapping done history item
      const delete_tapping_done_history_item =
        await tapping_done_history_model.deleteOne(
          {
            issue_for_pressing_id: delete_issue_for_pressing_item?._id,
            tapping_done_item_id: tapping_done_item_id,
            tapping_done_other_details_id: tapping_done_other_details_id,
          },
          { session }
        );
      if (
        !delete_tapping_done_history_item.acknowledged ||
        delete_tapping_done_history_item.deletedCount <= 0
      ) {
        throw new ApiError(
          'Failed to delete tapping done history item',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // update available details in tapping done items
      const available_details = {
        no_of_sheets: delete_issue_for_pressing_item?.no_of_sheets,
        sqm: delete_issue_for_pressing_item?.sqm,
        amount: delete_issue_for_pressing_item?.amount,
      };
      const update_tapping_done_item_details =
        await tapping_done_items_details_model.updateOne(
          { _id: tapping_done_item_id },
          {
            $set: {
              updated_by: userDetails?._id,
            },
            $inc: {
              'available_details.no_of_sheets': available_details.no_of_sheets,
              'available_details.sqm': available_details.sqm,
              'available_details.amount': available_details.amount,
            },
          },
          { session, runValidators: true }
        );

      if (update_tapping_done_item_details.matchedCount <= 0) {
        throw new ApiError('Failed to find tapping done item details', 400);
      }
      if (
        !update_tapping_done_item_details.acknowledged ||
        update_tapping_done_item_details.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Failed to update tapping done item available details',
          400
        );
      }

      const isTappingDoneOtherDetailsEditable =
        await tapping_done_items_details_model
          .find({
            tapping_done_other_details_id: tapping_done_other_details_id,
            $expr: {
              $ne: ['$no_of_sheets', '$available_details.no_of_sheets'],
            },
          })
          .session(session)
          .lean();

      if (
        isTappingDoneOtherDetailsEditable &&
        isTappingDoneOtherDetailsEditable?.length <= 0
      ) {
        const update_tapping_done_other_details =
          await tapping_done_other_details_model.updateOne(
            {
              _id: tapping_done_other_details_id,
            },
            {
              $set: {
                isEditable: true,
                updated_by: userDetails?._id,
              },
            },
            { runValidators: true, session }
          );

        if (update_tapping_done_other_details.matchedCount <= 0) {
          throw new ApiError('Failed to find tapping done other details', 400);
        }
        if (
          !update_tapping_done_other_details.acknowledged ||
          update_tapping_done_other_details.modifiedCount <= 0
        ) {
          throw new ApiError(
            'Failed to update tapping done other details',
            400
          );
        }
      }
      const response = new ApiResponse(
        StatusCodes.OK,
        'revert issue for pressing successfully',
        delete_issue_for_pressing_item
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

export const fetch_single_issue_for_pressing_details = catchAsync(
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
    const issue_for_pressing_details =
      await issues_for_pressing_model.aggregate(aggregation_pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Fetch data successfully',
      issue_for_pressing_details?.[0]
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_all_issue_for_pressing_details = catchAsync(
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
        is_pressing_done: false,
        'available_details.no_of_sheets': { $gt: 0 },
      },
    };

    const aggGroupNoLookup = {
      $lookup: {
        from: 'grouping_done_items_details',
        localField: 'group_no',
        foreignField: 'group_no',
        pipeline: [
          {
            $project: {
              group_no: 1,
              photo_no: 1,
              photo_id: 1,
            },
          },
        ],
        as: 'grouping_done_items_details',
      },
    };
    const aggGroupNoUnwind = {
      $unwind: {
        path: '$grouping_done_items_details',
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
    const aggOrderRelatedData = [
      {
        $lookup: {
          from: 'orders',
          localField: 'order_id',
          pipeline: [
            {
              $project: {
                order_no: 1,
                owner_name: 1,
                orderDate: 1,
                order_category: 1,
                series_product: 1,
              },
            },
          ],
          foreignField: '_id',
          as: 'order_details',
        },
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'series_product_order_item_details',
          localField: 'order_item_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                item_no: 1,
                order_id: 1,
                item_name: 1,
                item_sub_category_name: 1,
                group_no: 1,
                photo_number: 1,
              },
            },
          ],
          as: 'series_product_order_item_details',
        },
      },
      {
        $unwind: {
          path: '$series_product_order_item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'decorative_order_item_details',
          localField: 'order_item_id',
          pipeline: [
            {
              $project: {
                item_no: 1,
                order_id: 1,
                item_name: 1,
                item_sub_category_name: 1,
                group_no: 1,
                photo_number: 1,
              },
            },
          ],
          foreignField: '_id',
          as: 'decorative_order_item_details',
        },
      },
      {
        $unwind: {
          path: '$decorative_order_item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          order_item_details: {
            $cond: {
              if: {
                $ne: [{ $type: '$decorative_order_item_details' }, 'missing'],
              },
              then: '$decorative_order_item_details',
              else: '$series_product_order_item_details',
            },
          },
        },
      },
    ];
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
      aggGroupNoLookup,
      aggGroupNoUnwind,
      aggCreatedByLookup,
      aggCreatedByUnwind,
      aggUpdatedByLookup,
      aggUpdatedByUnwind,
      ...aggOrderRelatedData,
      aggMatch,
      aggSort,
      aggSkip,
      aggLimit,
    ]; // aggregation pipiline

    const issue_for_pressing =
      await issues_for_pressing_model.aggregate(listAggregate);

    const aggCount = {
      $count: 'totalCount',
    }; // count aggregation stage

    const totalAggregate = [
      aggCommonMatch,
      aggGroupNoLookup,
      aggGroupNoUnwind,
      aggCreatedByLookup,
      aggCreatedByUnwind,
      aggUpdatedByLookup,
      aggUpdatedByUnwind,
      ...aggOrderRelatedData,
      aggMatch,
      aggCount,
    ]; // total aggregation pipiline

    const totalDocument =
      await issues_for_pressing_model.aggregate(totalAggregate);

    const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
      200,
      'Issue For pressing Data Fetched Successfully',
      {
        data: issue_for_pressing,
        totalPages: totalPages,
      }
    );
    return res.status(200).json(response);
  }
);
