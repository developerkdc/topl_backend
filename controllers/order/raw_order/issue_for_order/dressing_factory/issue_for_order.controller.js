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
  dressing_done_items_model,
  dressing_done_other_details_model,
} from '../../../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import dressing_done_history_model from '../../../../../database/schema/factory/dressing/dressing_done/dressing.done.history.schema.js';

export const add_issue_for_order = catchAsync(async (req, res) => {
  const { order_item_id, dressing_done_item_id } = req.body;
  const userDetails = req.userDetails;
  const session = await mongoose.startSession();
  if (!isValidObjectId(order_item_id)) {
    throw new ApiError('Invalid Order Item ID', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(dressing_done_item_id)) {
    throw new ApiError(
      'Invalid Dressing Done Item ID',
      StatusCodes.BAD_REQUEST
    );
  }
  for (let field of ['order_item_id', 'dressing_done_item_id']) {
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

    const dressing_done_item_data = await dressing_done_items_model
      .findById(dressing_done_item_id)
      .lean();
    if (!dressing_done_item_data) {
      throw new ApiError('Dressing Done Item Data not found.');
    }

    if (dressing_done_item_data?.issue_status !== null) {
      throw new ApiError(
        `Dressing done item is already issued for ${dressing_done_item_data?.issue_status?.toUpperCase()} `
      );
    }

    const [validate_sqm_for_order] = await issue_for_order_model.aggregate([
      {
        $match: {
          order_item_id: order_item_data?._id,
        },
      },
      {
        $group: {
          _id: null,
          total_sqm: {
            $sum: '$item_details.sqm',
          },
        },
      },
    ]);

    if (
      Number(
        validate_sqm_for_order?.total_sqm + Number(dressing_done_item_data?.sqm)
      ) > order_item_data?.sqm
    ) {
      throw new ApiError(
        'Issued sqm is greater than order sqm',
        StatusCodes.BAD_REQUEST
      );
    }

    const updated_body = {
      order_id: order_item_data?.order_id,
      order_item_id: order_item_data?._id,
      issued_from: item_issued_from?.dressing_factory,
      item_details: dressing_done_item_data,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    //add model name to insert data to create order using session
    const create_order_result = await issue_for_order_model?.create(
      [updated_body],
      { session }
    );

    if (create_order_result?.length === 0) {
      throw new ApiError(
        'Failed to Add order details',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_dressing_done_item_issue_status =
      await dressing_done_items_model.updateOne(
        { _id: dressing_done_item_data?._id },
        {
          $set: {
            issue_status: issues_for_status?.order,
            updated_by: userDetails?._id,
          },
        },
        { session: session }
      );

    if (update_dressing_done_item_issue_status?.matchedCount === 0) {
      throw new ApiError(
        'Dressing Done item not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_dressing_done_item_issue_status?.acknowledged ||
      update_dressing_done_item_issue_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Dressing Done item status',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_dressing_done_other_details_editable_status =
      await dressing_done_other_details_model?.updateOne(
        { _id: dressing_done_item_data?.dressing_done_other_details_id },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (
      update_dressing_done_other_details_editable_status?.matchedCount === 0
    ) {
      throw new ApiError('Log item invoice not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_dressing_done_other_details_editable_status?.acknowledged ||
      update_dressing_done_other_details_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Dressing Done Item Other Details status',
        StatusCodes.BAD_REQUEST
      );
    }

    const create_dressing_history = await dressing_done_history_model.create(
      [
        {
          dressing_done_other_details_id:
            dressing_done_item_data?.dressing_done_other_details_id,
          bundles: [dressing_done_item_data?._id],
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        },
      ],
      { session }
    );

    if (create_dressing_history?.length === 0) {
      throw new ApiError(
        'Failed to add dressing item to history',
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
