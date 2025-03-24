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
  veneer_inventory_invoice_model,
  veneer_inventory_items_model,
} from '../../../../../database/schema/inventory/venner/venner.schema.js';

export const add_issue_for_order = catchAsync(async (req, res) => {
  const { order_item_id, venner_item_id } = req.body;
  const userDetails = req.userDetails;
  const session = await mongoose.startSession();
  if (!isValidObjectId(order_item_id)) {
    throw new ApiError('Invalid Order Item ID', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(venner_item_id)) {
    throw new ApiError('Invalid Venner Item ID', StatusCodes.BAD_REQUEST);
  }
  for (let field of ['order_item_id', 'venner_item_id']) {
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

    const venner_item_data = await veneer_inventory_items_model
      .findById(venner_item_id)
      .lean();
    if (!venner_item_data) {
      throw new ApiError('Venner Item Data not found.');
    }

    if (venner_item_data?.issue_status !== null) {
      throw new ApiError(
        `Venner item is already issued for ${venner_item_data?.issue_status?.toUpperCase()} `
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
            $sum: '$item_details.total_sq_meter',
          },
        },
      },
    ]);

    if (
      Number(
        validate_sqm_for_order?.total_sqm +
          Number(venner_item_data?.total_sq_meter)
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
      issued_from: item_issued_from?.veneer,
      item_details: venner_item_data,
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

    const update_venner_item_issue_status =
      await veneer_inventory_items_model.updateOne(
        { _id: venner_item_data?._id },
        {
          $set: {
            issue_status: issues_for_status?.order,
            updated_by: userDetails?._id,
          },
        },
        { session: session }
      );

    if (update_venner_item_issue_status?.matchedCount === 0) {
      throw new ApiError('Venner item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_venner_item_issue_status?.acknowledged ||
      update_venner_item_issue_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Venner item status',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_venner_inventory_invoice_editable_status =
      await veneer_inventory_invoice_model?.updateOne(
        { _id: venner_item_data?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_venner_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'Venner item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_venner_inventory_invoice_editable_status?.acknowledged ||
      update_venner_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Flitch item invoice status',
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
