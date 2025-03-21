import mongoose, { isValidObjectId } from 'mongoose';
import ApiError from '../../../../../utils/errors/apiError.js';
import {
  log_inventory_invoice_model,
  log_inventory_items_model,
} from '../../../../../database/schema/inventory/log/log.schema.js';
import catchAsync from '../../../../../utils/errors/catchAsync.js';
import ApiResponse from '../../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../../utils/constants.js';
import {
  issues_for_status,
  item_issued_from,
} from '../../../../../database/Utils/constants/constants.js';
import { RawOrderItemDetailsModel } from '../../../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import issue_for_order_model from '../../../../../database/schema/order/issue_for_order/issue_for_order.schema.js';

export const add_issue_for_order = catchAsync(async (req, res) => {
  const { order_item_id, log_item_id } = req.body;
  const userDetails = req.userDetails;
  const session = await mongoose.startSession();
  if (!isValidObjectId(order_item_id)) {
    throw new ApiError('Invalid Order Item ID', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(log_item_id)) {
    throw new ApiError('Invalid Log Item ID', StatusCodes.BAD_REQUEST);
  }
  for (let field of ['order_item_id', 'log_item_id']) {
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

    const log_item_data = await log_inventory_items_model
      .findById(log_item_id)
      .lean();
    if (!log_item_data) {
      throw new ApiError('Log Item Data not found.');
    }

    if (log_item_data?.issue_status !== null) {
      throw new ApiError(
        `Log item is already issued for ${log_item_data?.issue_status?.toUpperCase()} `
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
            $sum: '$item_details.physical_cmt',
          },
        },
      },
    ]);

    if (
      Number(
        validate_sqm_for_order?.total_sqm + Number(log_item_data?.physical_cmt)
      ) > order_item_data?.cbm
    ) {
      throw new ApiError(
        'Issued sqm is greater than order sqm',
        StatusCodes.BAD_REQUEST
      );
    }

    const updated_body = {
      order_id: order_item_data?.order_id,
      order_item_id: order_item_data?._id,
      issued_from: item_issued_from?.log,
      item_details: log_item_data,
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

    const update_log_item_issue_status =
      await log_inventory_items_model.updateOne(
        { _id: log_item_data?._id },
        {
          $set: {
            issue_status: issues_for_status?.order,

            updated_by: userDetails?._id,
          },
        },
        { session: session }
      );

    if (update_log_item_issue_status?.matchedCount === 0) {
      throw new ApiError('Log item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_log_item_issue_status?.acknowledged ||
      update_log_item_issue_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Log item status',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_log_inventory_invoice_editable_status =
      await log_inventory_invoice_model?.updateOne(
        { _id: log_item_data?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_log_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError('Log item invoice not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_log_inventory_invoice_editable_status?.acknowledged ||
      update_log_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Log item invoice status',
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

export const fetch_all_issued_logs_by_order_item_id = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes?.BAD_REQUEST);
    }

    //fetch all itemsby order item id
    const result = [];

    const response = new ApiResponse(
      StatusCodes.OK,
      'Issued Items fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

// export const revert_issued_item_by_id = catchAsync(async (req, res) => {
//     const { id } = req.params;
//     const userDetails = req.userDetails

//     if (!isValidObjectId(id)) {
//         throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
//     };
//     const session = await mongoose.startSession();
//     try {
//         await session?.startTransaction()
//         //fetch issued order data
//         const issued_order_data = await issue_for_order_model?.findById(id)

//         if (!issued_order_data) {
//             throw new ApiError("Issued order data not found", StatusCodes.BAD_REQUEST)
//         };

//         //delete doc by id
//         const delete_ordered_data_doc_result = await issue_for_order_model?.deleteOne({ _id: issued_order_data?._id })

//         if (!delete_ordered_data_doc_result?.acknowledged || delete_ordered_data_doc_result?.deletedCount === 0) {
//             throw new ApiError("Failed to delete ordered data ", StatusCodes.BAD_REQUEST)
//         };

//         const update_log_item_issue_status = await log_inventory_items_model?.updateOne({ _id: issued_order_data?.item_details?._id }, {
//             $set: {
//                 issue_status: null,
//                 updated_by: userDetails?._id
//             }
//         }, { session });

//         if (update_log_item_issue_status?.matchedCount === 0) {
//             throw new ApiError("Log item not found", StatusCodes.BAD_REQUEST)
//         };

//         if (!update_log_item_issue_status?.acknowledged || update_log_item_issue_status?.modifiedCount === 0) {
//             throw new ApiError("Failed to update Log item status", StatusCodes.BAD_REQUEST)
//         };

//         const response = new ApiResponse(StatusCodes.OK, "Order Reverted Successfully");
//         await session?.commitTransaction()
//         return res.status(StatusCodes.OK).json(response)
//     } catch (error) {
//         await session?.abortTransaction()
//         throw error
//     } finally {
//         await session?.endSession()
//     }
// })
// export const revert_issued_item_by_id = catchAsync(async (req, res) => {
//     const { id } = req.params;
//     const userDetails = req.userDetails

//     if (!isValidObjectId(id)) {
//         throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
//     };
//     const session = await mongoose.startSession();
//     try {
//         await session?.startTransaction()
//         //fetch issued order data
//         const issued_order_data = await issue_for_order_model?.findById(id)

//         if (!issued_order_data) {
//             throw new ApiError("Issued order data not found", StatusCodes.BAD_REQUEST)
//         };

//         //delete doc by id
//         const delete_ordered_data_doc_result = await issue_for_order_model?.deleteOne({ _id: issued_order_data?._id })

//         if (!delete_ordered_data_doc_result?.acknowledged || delete_ordered_data_doc_result?.deletedCount === 0) {
//             throw new ApiError("Failed to delete ordered data ", StatusCodes.BAD_REQUEST)
//         };

//         const update_log_item_issue_status = await log_inventory_items_model?.updateOne({ _id: issued_order_data?.item_details?._id }, {
//             $set: {
//                 issue_status: null,
//                 updated_by: userDetails?._id
//             }
//         }, { session });

//         if (update_log_item_issue_status?.matchedCount === 0) {
//             throw new ApiError("Log item not found", StatusCodes.BAD_REQUEST)
//         };

//         if (!update_log_item_issue_status?.acknowledged || update_log_item_issue_status?.modifiedCount === 0) {
//             throw new ApiError("Failed to update Log item status", StatusCodes.BAD_REQUEST)
//         };

//         const response = new ApiResponse(StatusCodes.OK, "Order Reverted Successfully");
//         await session?.commitTransaction()
//         return res.status(StatusCodes.OK).json(response)
//     } catch (error) {
//         await session?.abortTransaction()
//         throw error
//     } finally {
//         await session?.endSession()
//     }
// })
