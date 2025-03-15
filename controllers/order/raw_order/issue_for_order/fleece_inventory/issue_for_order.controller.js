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

import { fleece_inventory_invoice_modal, fleece_inventory_items_modal } from '../../../../../database/schema/inventory/fleece/fleece.schema.js';
import fleece_history_model from '../../../../../database/schema/inventory/fleece/fleece.history.schema.js';

export const add_issue_for_order = catchAsync(async (req, res) => {
  const { order_item_id, fleece_item_details } = req.body;
  const userDetails = req.userDetails;
  const session = await mongoose.startSession();
  if (!isValidObjectId(order_item_id)) {
    throw new ApiError('Invalid Order Item ID', StatusCodes.BAD_REQUEST);
  }
  if (!fleece_item_details) {
    throw new ApiError('Fleece Item Data is missing', StatusCodes.BAD_REQUEST);
  }
  for (let field of ['order_item_id', 'fleece_item_details']) {
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

    const fleece_item_data = await fleece_inventory_items_modal
      .findById(fleece_item_details?._id)
    // .lean();
    if (!fleece_item_data) {
      throw new ApiError('Face Item Data not found.');
    }

    if (fleece_item_data?.available_number_of_roll <= 0) {
      throw new ApiError(`No Available No of rolls found. `);
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
            $sum: '$item_details.issued_sqm',
          },
        },
      },
    ]);

    //validate issued no of rolls with order no.of rolls
    if (
        Number(
          validate_sqm_for_order?.total_sqm + Number(fleece_item_details?.issued_sqm)
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
      issued_from: item_issued_from?.fleece_paper,
      item_details: fleece_item_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    //add model name to insert data to create order using session
    const create_order_result = await issue_for_order_model?.create(
      [updated_body],
      { session }
    );

    const issued_number_of_roll_for_order =
      create_order_result[0]?.item_details?.issued_number_of_roll;
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
    };

    //available sheets
    const available_number_of_roll =
      fleece_item_data?.available_number_of_roll - fleece_item_details?.issued_number_of_roll;
    //available sqm
    const available_sqm =
      fleece_item_data?.available_sqm - fleece_item_details?.issued_sqm;
    //available_amount
    const available_amount =
      fleece_item_data?.available_amount - fleece_item_details?.issued_amount;

    //update plywood inventory available number_of_roll
    const update_fleece_item_no_of_rolls =
      await fleece_inventory_items_modal.updateOne(
        { _id: fleece_item_data?._id },
        {
          $set: {
            available_number_of_roll: available_number_of_roll,
            available_amount: available_amount,
            available_sqm: available_sqm,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_fleece_item_no_of_rolls?.matchedCount === 0) {
      throw new ApiError('Face item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_fleece_item_no_of_rolls?.acknowledged ||
      update_fleece_item_no_of_rolls?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Fleece item status',
        StatusCodes.BAD_REQUEST
      );
    }

    //update fleece inventory invoice ediatble status
    const update_fleece_inventory_invoice_editable_status =
      await fleece_inventory_invoice_modal?.updateOne(
        { _id: fleece_item_data?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_fleece_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'Fleece item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_fleece_inventory_invoice_editable_status?.acknowledged ||
      update_fleece_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Fleece item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to Fleece history model
    const add_issued_data_to_fleece_history =
      await fleece_history_model.create(
        [
          {
            issued_for_order_id: issue_for_order_id,
            issue_status: issues_for_status?.order,
            fleece_item_id: fleece_item_data?._id,
            issued_number_of_roll: issued_number_of_roll_for_order,
            issued_sqm: issued_sqm_for_order,
            issued_amount: issued_amount_for_order,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        { session }
      );

    if (add_issued_data_to_fleece_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to fleece history',
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
