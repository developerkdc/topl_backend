import mongoose from 'mongoose';
import issue_for_order_model from '../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import {
  order_item_status,
  order_status
} from '../../../database/Utils/constants/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import RevertOrderItem from '../revert_issued_order_item/revert_issued_order_item.controller..js';

class RawOrderCancelController {
  static validate_fields(fields, validate_for) {
    if (!fields?.order_id || !mongoose.isValidObjectId(fields?.order_id)) {
      throw new ApiError(
        'Order ID is required or invalid Order ID',
        StatusCodes.BAD_REQUEST
      );
    }
    if (validate_for === 'order_item') {
      if (
        !fields?.order_item_id ||
        !mongoose.isValidObjectId(fields?.order_item_id)
      ) {
        throw new ApiError(
          'Order Item ID is required or invalid Order Item ID',
          StatusCodes.BAD_REQUEST
        );
      }
    }
  }

  static fetch_order_details = async ({ order_id }) => {
    try {
      // Fetch order details logic here
      this.validate_fields({ order_id }, 'order');

      const match_query = {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(order_id),
        },
      };
      const lookup_order_items = {
        $lookup: {
          from: 'raw_order_item_details',
          localField: '_id',
          foreignField: 'order_id',
          pipeline: [
            {
              $match: {
                item_status: null,
              },
            },
          ],
          as: 'order_items_details',
        },
      };

      const [fetch_order_details] = await OrderModel.aggregate([
        match_query,
        lookup_order_items,
      ]);

      if (!fetch_order_details) {
        throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
      }

      if (fetch_order_details.order_status === order_status.cancelled) {
        throw new ApiError(
          'Order is already cancelled',
          StatusCodes.BAD_REQUEST
        );
      }
      if (fetch_order_details.order_status === order_status.closed) {
        throw new ApiError('Order is already closed', StatusCodes.BAD_REQUEST);
      }

      return fetch_order_details;
    } catch (error) {
      throw error;
    }
  };

  static fetch_order_item_details = async ({ order_id, order_item_id }) => {
    try {
      this.validate_fields({ order_id, order_item_id }, 'order_item');

      const match_query = {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(order_item_id),
          order_id: mongoose.Types.ObjectId.createFromHexString(order_id),
          item_status: null,
        },
      };
      const lookup_order = {
        $lookup: {
          from: 'orders',
          localField: 'order_id',
          foreignField: '_id',
          as: 'order_details',
        },
      };
      const unwind_order = {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true,
        },
      };

      const [fetch_order_item_details] =
        await RawOrderItemDetailsModel.aggregate([
          match_query,
          lookup_order,
          unwind_order,
        ]);

      if (!fetch_order_item_details) {
        throw new ApiError('Order item not found', StatusCodes.NOT_FOUND);
      }

      if (
        fetch_order_item_details.item_status === order_item_status.cancelled
      ) {
        throw new ApiError(
          'Order item is already cancelled',
          StatusCodes.BAD_REQUEST
        );
      }
      if (fetch_order_item_details.item_status === order_item_status.closed) {
        throw new ApiError(
          'Order item is already closed',
          StatusCodes.BAD_REQUEST
        );
      }

      return fetch_order_item_details;
    } catch (error) {
      throw error;
    }
  };

  static revert_items_issued_for_order = async (
    { order_id, order_item_id, other_details },
    session
  ) => {
    try {
      this.validate_fields({ order_id, order_item_id }, 'order_item');
      const userDetails = other_details?.userDetails;
      const issued_for_order_item_details =
        await issue_for_order_model.aggregate([
          {
            $match: {
              order_id: mongoose.Types.ObjectId.createFromHexString(order_id),
              order_item_id:
                mongoose.Types.ObjectId.createFromHexString(order_item_id),
            },
          },
        ]);

      for (let item of issued_for_order_item_details) {
        const revert_issued_for_order_items = new RevertOrderItem(
          item?._id,
          userDetails,
          session
        );
        await revert_issued_for_order_items.update_inventory_item_status();
      }

      const delete_issued_for_order_item_details =
        await issue_for_order_model.deleteMany(
          {
            order_id: order_id,
            order_item_id: order_item_id,
          },
          { session: session }
        );
      if (!delete_issued_for_order_item_details.acknowledged) {
        throw new ApiError(
          'Failed to Delete issue for order',
          StatusCodes.BAD_REQUEST
        );
      }

      const cancel_order_item_status =
        await RawOrderItemDetailsModel.findOneAndUpdate(
          {
            order_id: order_id,
            _id: order_item_id,
          },
          {
            $set: {
              item_status: order_item_status.cancelled,
              updated_by: other_details?.userDetails?._id,
            },
          },
          { session }
        );

      if (!cancel_order_item_status) {
        throw new ApiError(
          `Failed to cancel order item (${other_details?.order_no})(${other_details?.order_item_no})`,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }
    } catch (error) {
      throw error;
    }
  };

  static cancel_order = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      const { order_id } = req.body;
      this.validate_fields({ order_id }, 'order');

      const order_details = await this.fetch_order_details({ order_id });

      for (let item of order_details?.order_items_details) {
        await this.revert_items_issued_for_order(
          {
            order_id: item?.order_id?.toString(),
            order_item_id: item?._id?.toString(),
            other_details: {
              order_no: order_details?.order_no,
              order_item_no: item?.item_no,
              userDetails: userDetails,
            },
          },
          session
        );
      }

      const cancel_order_status = await OrderModel.updateOne(
        { _id: order_id },
        {
          $set: {
            order_status: order_status.cancelled,
            updated_by: userDetails._id,
          },
        },
        { session }
      );

      if (cancel_order_status?.matchedCount <= 0) {
        throw new ApiError(
          `No order found for ${order_id}`,
          StatusCodes.NOT_FOUND
        );
      }
      if (
        !cancel_order_status?.acknowledged ||
        cancel_order_status?.modifiedCount <= 0
      ) {
        throw new ApiError(
          `Failed to cancel order ${order_id}`,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      await session.commitTransaction();
      const response = new ApiResponse(
        StatusCodes.OK,
        'Order Cancelled Successfully.',
        {
          order_details: order_details,
        }
      );

      return res.status(response.statusCode).json(response);
    } catch (error) {
      await session?.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  });

  static cancel_order_item = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      const { order_id, order_item_id } = req.body;
      this.validate_fields({ order_id, order_item_id }, 'order_item');

      const order_item_details = await this.fetch_order_item_details({
        order_id,
        order_item_id,
      });

      await this.revert_items_issued_for_order(
        {
          order_id: order_item_details?.order_id?.toString(),
          order_item_id: order_item_details?._id?.toString(),
          other_details: {
            order_no: order_item_details?.order_details?.order_no,
            order_item_no: order_item_details?.item_no,
            userDetails: userDetails,
          },
        },
        session
      );

      // const fetch_order_item_closed = await RawOrderItemDetailsModel.find({
      //     order_id: order_item_details?.order_id,
      //     item_status: { $ne: null }
      // });

      // if (fetch_order_item_closed?.length <= 0) {
      //     const order_closed = await OrderModel.findOneAndUpdate({
      //         _id: order_item_details?.order_id
      //     }, {
      //         $set: {
      //             order_status: order_status.cancelled
      //         }
      //     }, { new: true, session });

      //     if (!order_closed) {
      //         throw new ApiError(`Failed to update order status as closed`, StatusCodes.BAD_REQUEST);
      //     }

      // }

      const remaining_open_items = await RawOrderItemDetailsModel.find({
        order_id: order_item_details?.order_id,
        item_status: null,
      }).session(session);

      if (remaining_open_items.length === 0) {
        // All items cancelled (or single item order)
        await OrderModel.findOneAndUpdate(
          { _id: order_item_details?.order_id },
          { $set: { order_status: order_status.cancelled } },
          { session }
        );
      } else {
        // Some items still open, keep order_status as null
        await OrderModel.findOneAndUpdate(
          { _id: order_item_details?.order_id },
          { $set: { order_status: null } },
          { session }
        );
      }

      await session.commitTransaction();
      const response = new ApiResponse(
        StatusCodes.OK,
        'Order Item Cancelled Successfully.',
        {
          order_item_details: order_item_details,
        }
      );

      return res.status(response.statusCode).json(response);
    } catch (error) {
      await session?.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  });
}

export default RawOrderCancelController;
