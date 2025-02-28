import mongoose from 'mongoose';
import ApiError from '../../utils/errors/apiError.js';
import { OrderModel } from '../../database/schema/order/orders.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../database/schema/order/raw_order_item_details.schema.js';
import ApiResponse from '../../utils/ApiResponse.js';

export const AddRawOrder = catchAsync(async (req, res, next) => {
  const { order_details, item_details } = req.body;
  const userDetails = req.userDetails;

  for (let i of ['order_details', 'item_details']) {
    if (!req.body?.[i]) {
      throw new ApiError(`Please provide ${i} details`, 400);
    }
  }

  if (!Array.isArray(item_details)) {
    throw new ApiError('Order item must be an array', 400);
  }
  if (item_details <= 0) {
    throw new ApiError('Atleast one order item is required', 400);
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // adding Order details
    var newOrderNumber = 1;
    let prevOrderNo = await OrderModel.find().sort({ createdAt: -1 }).limit(1);

    if (prevOrderNo.length > 0 && prevOrderNo[0]?.order_no) {
      newOrderNumber = Number(prevOrderNo[0]?.order_no) + 1;
    }

    const [newOrderDetails] = await OrderModel.create(
      [
        {
          ...order_details,
          order_no: newOrderNumber,
          created_by: userDetails._id,
          updated_by: userDetails._id,
        },
      ],
      { session }
    );

    if (!newOrderDetails) {
      throw new ApiError(
        'Failed to add order details',
        StatusCodes.BAD_REQUEST
      );
    }

    console.log(newOrderDetails, 'newOrderDetails');

    // adding item details
    const formattedItemsDetails = item_details.map((item) => ({
      ...item,
      order_id: newOrderDetails._id,
      created_by: userDetails._id,
      updated_by: userDetails._id,
    }));

    const newItems = await RawOrderItemDetailsModel.insertMany(
      formattedItemsDetails,
      { session }
    );

    if (!newItems || newItems.length === 0) {
      throw new ApiError('Failed to add order items', 400);
    }

    await session.commitTransaction();

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Order Created Successfully.',
      { order_details: newOrderDetails, item_details: newItems }
    );

    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    await session.endSession();
  }
});

export const UpdateRawOrder = catchAsync(async (req, res) => {
  const { order_details_id } = req.params;

  const { order_details, item_details } = req.body;
  const userDetails = req.userDetails;

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    for (let field of ['order_details', 'item_details']) {
      if (!req.body[field]) {
        throw new ApiError(`${field} is required`, StatusCodes?.NOT_FOUND);
      }
    }
    if (!Array.isArray(item_details)) {
      throw new ApiError(
        'Item details must be an array',
        StatusCodes.BAD_REQUEST
      );
    }

    const order_details_result = await OrderModel.findOneAndUpdate(
      { _id: order_details_id },
      {
        $set: {
          ...order_details,
          updated_by: userDetails?._id,
        },
      },
      { session, new: true }
    );
    if (!order_details_result) {
      throw new ApiError(
        'Failed to Update order details data.',
        StatusCodes.BAD_REQUEST
      );
    }

    const delete_order_items =
      await RawOrderItemDetailsModel?.deleteMany(
        { order_id: order_details_result?._id },
        { session }
      );

    if (
      !delete_order_items?.acknowledged ||
      delete_order_items?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete item details',
        StatusCodes.BAD_REQUEST
      );
    }

    const updated_item_details = item_details?.map((item) => {
      item.order_id = order_details_result?._id;
      item.updated_by = userDetails?._id;
      return item;
    });

    const create_order_result =
      await RawOrderItemDetailsModel?.insertMany(
        updated_item_details,
        { session }
      );
    if (create_order_result?.length === 0) {
      throw new ApiError(
        'Failed to update order item details',
        StatusCodes?.BAD_REQUEST
      );
    }

    await session?.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Order Updated Successfully.',
      { order_details, item_details }
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session?.endSession();
  }
});
