import { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { grouping_done_details_model, grouping_done_items_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import { order_category } from '../../../database/Utils/constants/constants.js';
import { decorative_order_item_details_model } from '../../../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import series_product_order_item_details_model from '../../../database/schema/order/series_product_order/series_product_order_item_details.schema.js';
import mongoose from 'mongoose';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';
import issue_for_tapping_model from '../../../database/schema/factory/tapping/issue_for_tapping/issue_for_tapping.schema.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import grouping_done_history_model from '../../../database/schema/factory/grouping/grouping_done_history.schema.js';

const order_items_collections = {
  [order_category.decorative]: "decorative_order_item_details",
  [order_category.series_product]: "series_product_order_item_details"
}

export const fetch_all_group_no_by_item_name = catchAsync(async (req, res) => {
  const { id } = req.params;
  const category = req?.query?.category;
  console.log("category : ",category);
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }
  let order_item_data;
  const search_query = {};
  if(category === order_category?.raw){
     order_item_data = await RawOrderItemDetailsModel.findById(id);
     if (!order_item_data) {
       throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
     }
     if (order_item_data?.item_name) {
       search_query['item_name'] = order_item_data?.item_name;
     }
  }
  if(category === order_category?.decorative){
    order_item_data = await decorative_order_item_details_model.findById(id);
    // if (!order_item_data) {
    //   throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
    // }
  }
  if(category === order_category?.series_product){
    order_item_data = await series_product_order_item_details_model.findById(id);
    // if (!order_item_data) {
    //   throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
    // }
  }

  const match_query = {
    ...search_query,
    'available_details.no_of_leaves': {
      $gt: 0,
    },
    // issue_status: null,
    // "invoice_details.approval_status.sendForApproval.status": false
  };
  const pipeline = [
    { $match: { ...match_query } },
    {
      $project: {
        group_no: 1,
      },
    },
  ];

  const result = await grouping_done_items_details_model.aggregate(pipeline);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Group No Dropdown fetched successfully',
    result
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetch_group_details_by_id = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const result = await grouping_done_items_details_model.findById(id);
  const response = new ApiResponse(
    StatusCodes.OK,
    'Group Details fetched successfully',
    result
  );
  return res.status(StatusCodes.OK).json(response);
});

export const issue_for_tapping_from_grouping_for_order = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { grouping_done_item_id } = req.params;
    const { order_id, order_item_id, order_category_status, issue_no_of_leaves } = req.body;
    if (
      !grouping_done_item_id ||
      !mongoose.isValidObjectId(grouping_done_item_id)
    ) {
      throw new ApiError(
        'Invalid grouping done item id',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!order_id || !order_item_id || !issue_no_of_leaves || !order_category_status) {
      throw new ApiError(
        'Required order id or order item id or issue no of leaves or order category status',
        StatusCodes.BAD_REQUEST
      );
    };
    if (![order_category.decorative, order_category.series_product].includes(order_category_status)) {
      throw new ApiError(
        `Invalid order category status : ${order_category_status}`,
        StatusCodes.BAD_REQUEST
      );
    }

    const fetch_order_details = await OrderModel.findOne({
      _id: order_id
    }).lean();
    if (!fetch_order_details) {
      throw new ApiError("order details not found", StatusCodes?.NOT_FOUND);
    }
    if (fetch_order_details?.order_category !== order_category_status) {
      throw new ApiError(`Mismatch order category : ${order_category_status} - ${fetch_order_details?.order_category}`)
    };

    const fetch_order_item_details = await mongoose.model(order_items_collections?.[order_category_status]).aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(order_item_id),
          order_id: fetch_order_details?._id,
        }
      },
      {
        $lookup: {
          from: "orders",
          localField: "order_id",
          foreignField: "_id",
          as: "order_details"
        }
      },
      {
        $unwind: {
          path: "$order_details",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);
    const order_item_details = fetch_order_item_details?.[0];
    if (!order_item_details) {
      throw new ApiError(
        `order items not found`,
        StatusCodes.NOT_FOUND
      );
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
      remark: data?.remark
    };

    const issue_for_tapping_data = {
      ...grouping_data,
      order_id: order_item_details?.order_id,
      order_item_id: order_item_details?._id,
      order_category: order_item_details?.order_details?.order_category,
      issue_status: issues_for_status.order,
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
    const { _id: issue_for_tapping_id, ...grouping_history_detials } =
      issues_for_tapping_details?.toObject();
    const insert_tapping_item_to_grouping_history =
      await grouping_done_history_model.create(
        [
          {
            issue_for_tapping_id: issue_for_tapping_id,
            ...grouping_history_detials,
          },
        ],
        {
          session,
        }
      );

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
});