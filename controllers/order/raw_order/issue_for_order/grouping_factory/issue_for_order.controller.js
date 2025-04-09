import mongoose, { isValidObjectId } from 'mongoose';
import ApiError from '../../../../../utils/errors/apiError.js';
import catchAsync from '../../../../../utils/errors/catchAsync.js';
import ApiResponse from '../../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../../utils/constants.js';
import {
  issues_for_status,
  item_issued_from,
} from '../../../../../database/Utils/constants/constants.js';
import { RawOrderItemDetailsModel } from '../../../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import issue_for_order_model from '../../../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import {
  grouping_done_details_model,
  grouping_done_items_details_model,
} from '../../../../../database/schema/factory/grouping/grouping_done.schema.js';
import grouping_done_history_model from '../../../../../database/schema/factory/grouping/grouping_done_history.schema.js';

export const add_issue_for_order = catchAsync(async (req, res) => {
  const { order_item_id, grouping_item_details } = req.body;
  const userDetails = req.userDetails;
  const session = await mongoose.startSession();
  if (!isValidObjectId(order_item_id)) {
    throw new ApiError('Invalid Order Item ID', StatusCodes.BAD_REQUEST);
  }
  if (!grouping_item_details) {
    throw new ApiError('Plywood Item Data is missing', StatusCodes.BAD_REQUEST);
  }
  for (let field of ['order_item_id', 'grouping_item_details']) {
    if (!req.body[field]) {
      throw new ApiError(`${field} is missing`, StatusCodes.NOT_FOUND);
    }
  }

  try {
    session.startTransaction();
    const order_item_data =
      await RawOrderItemDetailsModel.findById(order_item_id);

    if (!order_item_data) {
      throw new ApiError('Order Item Data not found');
    }

    const grouping_item_data = await grouping_done_items_details_model
      .findById(grouping_item_details?._id)
      .lean();
    if (!grouping_item_data) {
      throw new ApiError('Grouping Item Data not found.');
    }

    if (grouping_item_data?.no_of_leaves <= 0) {
      throw new ApiError(`No Available leaves found. `);
    }

    //fetch all issued sheets for the order
    const [validate_leaves_for_order] = await issue_for_order_model.aggregate([
      {
        $match: {
          order_item_id: order_item_data?._id,
        },
      },
      {
        $group: {
          _id: null,
          total_sqm: {
            $sum: '$item_details.issued_sqm',
          },
        },
      },
    ]);

    //validate issued sqm with order no.of sqm
    if (
      Number(
        validate_leaves_for_order?.total_sqm +
          Number(grouping_item_details?.issued_sqm)
      ) > order_item_data?.sqm
    ) {
      throw new ApiError(
        'Issued SQM is greater than ordered SQM',
        StatusCodes.BAD_REQUEST
      );
    }

    const updated_body = {
      order_id: order_item_data?.order_id,
      order_item_id: order_item_data?._id,
      issued_from: item_issued_from?.grouping_factory,
      item_details: grouping_item_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    //add model name to insert data to create order using session
    const create_order_result = await issue_for_order_model?.create(
      [updated_body],
      { session }
    );

    const issued_leaves_for_order =
      create_order_result[0]?.item_details?.issued_leaves;
    const issued_sqm_for_order =
      create_order_result[0]?.item_details?.issued_sqm;
    const issued_amount_for_order =
      create_order_result[0]?.item_details?.issued_amount;
    const issue_for_order_id = create_order_result[0]?._id;
    if (create_order_result?.length === 0) {
      throw new ApiError(
        'Failed to Add order details',
        StatusCodes?.BAD_REQUEST
      );
    }
    //available leaves
    const available_leaves =
      grouping_item_data?.available_details?.no_of_leaves -
      grouping_item_details?.issued_leaves;
    //available sqm
    const available_sqm =
      grouping_item_data?.available_details?.sqm -
      grouping_item_details?.issued_sqm;
    //available_amount
    const available_amount =
      grouping_item_data?.available_details?.amount -
      grouping_item_details?.issued_amount;

    //update grouping factory  available details
    const update_grouping_item_available_details =
      await grouping_done_items_details_model.updateOne(
        { _id: grouping_item_data?._id },
        {
          $set: {
            'available_details.no_of_leaves': available_leaves,
            'available_details.amount': available_amount,
            'available_details.sqm': available_sqm,
            updated_by: userDetails?._id,
            //update issue status later if required
          },
        },
        { session }
      );

    if (update_grouping_item_available_details?.matchedCount === 0) {
      throw new ApiError('Grouping item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_grouping_item_available_details?.acknowledged ||
      update_grouping_item_available_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update  grouping item available details',
        StatusCodes.BAD_REQUEST
      );
    }

    //update grouping factory ediatble status
    const update_grouping_item_editable_status =
      await grouping_done_details_model?.updateOne(
        { _id: grouping_item_data?.grouping_done_other_details_id },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_grouping_item_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'grouping item other details not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_grouping_item_editable_status?.acknowledged ||
      update_grouping_item_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update grouping item status',
        StatusCodes.BAD_REQUEST
      );
    }
    const { _id, ...grouping_data } = grouping_item_data;
    //add data to grouping history model
    const add_issued_data_to_grouping_history =
      await grouping_done_history_model.create(
        [
          {
            ...grouping_data,
            order_id: issue_for_order_id,
            order_item_id: order_item_data?._id,
            issue_status: issues_for_status?.order,
            grouping_done_item_id: grouping_item_data?._id,
            grouping_done_other_details_id:
              grouping_item_data?.grouping_done_other_details_id,
            no_of_leaves: issued_leaves_for_order,
            sqm: issued_sqm_for_order,
            amount: issued_amount_for_order,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        { session }
      );

    if (add_issued_data_to_grouping_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to grouping history',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Item Issued Successfully',
      updated_body
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
