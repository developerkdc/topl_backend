import mongoose, { isValidObjectId } from 'mongoose';
import ApiError from '../../../../../utils/errors/apiError.js';
import {
  othergoods_inventory_invoice_details,
  othergoods_inventory_items_details,
} from '../../../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js';
import catchAsync from '../../../../../utils/errors/catchAsync.js';
import ApiResponse from '../../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../../utils/constants.js';
import {
  issues_for_status,
  item_issued_from,
} from '../../../../../database/Utils/constants/constants.js';
import { RawOrderItemDetailsModel } from '../../../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import issue_for_order_model from '../../../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import other_goods_history_model from '../../../../../database/schema/inventory/otherGoods/otherGoods.history.schema.js';

export const add_issue_for_order = catchAsync(async (req, res) => {
  const { order_item_id, other_goods_item_details } = req.body;
  const userDetails = req.userDetails;
  const session = await mongoose.startSession();
  if (!isValidObjectId(order_item_id)) {
    throw new ApiError('Invalid Order Item ID', StatusCodes.BAD_REQUEST);
  }
  if (!other_goods_item_details) {
    throw new ApiError(
      'Other Goods Item Data is missing',
      StatusCodes.BAD_REQUEST
    );
  }
  for (let field of ['order_item_id', 'other_goods_item_details']) {
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

    const other_goods_item_data =
      await othergoods_inventory_items_details.findById(
        other_goods_item_details?._id
      );
    if (!other_goods_item_data) {
      throw new ApiError('Other Goods Item Data not found.');
    }

    if (other_goods_item_data?.available_sheets <= 0) {
      throw new ApiError(`No Available sheets found. `);
    }

    //fetch all issued sheets for the order
    const [validate_units_for_order] = await issue_for_order_model.aggregate([
      {
        $match: {
          order_item_id: order_item_data?._id,
        },
      },
      {
        $group: {
          _id: null,
          total_quantity: {
            $sum: '$item_details.issued_quantity',
          },
        },
      },
    ]);

    //validate issued sheets with order no.of sheets
    if (
      Number(
        validate_units_for_order?.total_quantity +
          Number(other_goods_item_details?.issued_quantity)
      ) > order_item_data?.quantity
    ) {
      throw new ApiError(
        'Issued Quantity is greater than ordered quantity',
        StatusCodes.BAD_REQUEST
      );
    }

    const updated_body = {
      order_id: order_item_data?.order_id,
      order_item_id: order_item_data?._id,
      issued_from: item_issued_from?.store,
      item_details: other_goods_item_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    //add model name to insert data to create order using session
    const create_order_result = await issue_for_order_model?.create(
      [updated_body],
      { session }
    );

    const issued_quantity_for_order =
      create_order_result[0]?.item_details?.issued_quantity;

    const issued_amount_for_order =
      create_order_result[0]?.item_details?.issued_amount;
    const issue_for_order_id = create_order_result[0]?._id;
    if (create_order_result?.length === 0) {
      throw new ApiError(
        'Failed to Add order details',
        StatusCodes?.BAD_REQUEST
      );
    }
    //available quantitiy
    const available_quantity =
      other_goods_item_data?.available_quantity -
      other_goods_item_details?.issued_quantity;

    //available_amount
    const available_amount =
      other_goods_item_data?.available_amount -
      other_goods_item_details?.issued_amount;

    //update other goods inventory available quantity
    const update_other_goods_item_quantity_result =
      await othergoods_inventory_items_details.updateOne(
        { _id: other_goods_item_data?._id },
        {
          $set: {
            available_quantity: available_quantity,
            available_amount: available_amount,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_other_goods_item_quantity_result?.matchedCount === 0) {
      throw new ApiError('Other Goods item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_other_goods_item_quantity_result?.acknowledged ||
      update_other_goods_item_quantity_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Other Goods item quantity',
        StatusCodes.BAD_REQUEST
      );
    }

    //update othergoods inventory invoice ediatble status
    const update_other_goods_inventory_invoice_editable_status =
      await othergoods_inventory_invoice_details?.updateOne(
        { _id: other_goods_item_data?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (
      update_other_goods_inventory_invoice_editable_status?.matchedCount === 0
    ) {
      throw new ApiError(
        'Other Goods item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_other_goods_inventory_invoice_editable_status?.acknowledged ||
      update_other_goods_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update other goods item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to other goods history model
    const add_issued_data_to_other_goods_history =
      await other_goods_history_model.create(
        [
          {
            issued_for_order_id: issue_for_order_id,
            issue_status: issues_for_status?.order,
            other_goods_item_id: other_goods_item_data?._id,
            issued_quantity: issued_quantity_for_order,
            issued_amount: issued_amount_for_order,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        { session }
      );

    if (add_issued_data_to_other_goods_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to other goods history',
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
