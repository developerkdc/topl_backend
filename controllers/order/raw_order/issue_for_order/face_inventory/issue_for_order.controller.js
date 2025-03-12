import mongoose, { isValidObjectId } from 'mongoose';
import ApiError from '../../../../../utils/errors/apiError.js';
import {
  face_inventory_items_details, face_inventory_invoice_details
} from '../../../../../database/schema/inventory/face/face.schema.js';
import catchAsync from '../../../../../utils/errors/catchAsync.js';
import ApiResponse from '../../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../../utils/constants.js';
import {
  issues_for_status,
  item_issued_from,
} from '../../../../../database/Utils/constants/constants.js';
import { RawOrderItemDetailsModel } from '../../../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import issue_for_order_model from '../../../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import face_history_model from '../../../../../database/schema/inventory/face/face.history.schema.js';

export const add_issue_for_order = catchAsync(async (req, res) => {
  const { order_item_id, face_item_details } = req.body;
  const userDetails = req.userDetails;
  const session = await mongoose.startSession();
  if (!isValidObjectId(order_item_id)) {
    throw new ApiError('Invalid Order Item ID', StatusCodes.BAD_REQUEST);
  }
  if (!face_item_details) {
    throw new ApiError('Face Item Data is missing', StatusCodes.BAD_REQUEST);
  }
  for (let field of ['order_item_id', 'face_item_details']) {
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

    const face_item_data = await face_inventory_items_details
      .findById(face_item_details?._id)
      .lean();
    if (!face_item_data) {
      throw new ApiError('Face Item Data not found.');
    }

    if (face_item_data?.available_sheets <= 0) {
      throw new ApiError(`No Available sheets found. `);
    }

    //fetch all issued sheets for the order
    const [validate_sqm_for_order] = await issue_for_order_model.aggregate([
      {
        $match: {
          order_item_id: order_item_data?._id,
        },
      },
      {
        $group: {
          _id: null,
          total_sheets: {
            $sum: '$item_details.issued_sheets',
          },
        },
      },
    ]);

    //validate issued sheets with order no.of sheets
    if (
      Number(
        validate_sqm_for_order?.total_sheets +
        Number(face_item_details?.issued_sheets)
      ) > order_item_data?.no_of_sheet
    ) {
      throw new ApiError(
        'Issued Sheets are greater than ordered sheets',
        StatusCodes.BAD_REQUEST
      );
    }

    const updated_body = {
      order_id: order_item_data?.order_id,
      order_item_id: order_item_data?._id,
      issued_from: item_issued_from?.face,
      item_details: face_item_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    //add model name to insert data to create order using session
    const create_order_result = await issue_for_order_model?.create(
      [updated_body],
      { session }
    );

    const issued_sheets_for_order =
      create_order_result[0]?.item_details?.issued_sheets;
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
    //available sheets
    const available_sheets =
      face_item_data?.available_sheets - face_item_details?.issued_sheets;
    //available sqm
    const available_sqm =
      face_item_data?.available_sqm - face_item_details?.issued_sqm;
    //available_amount
    const available_amount =
      face_item_data?.available_amount - face_item_details?.issued_amount;

    //update plywood inventory available sheets
    const update_face_item_no_of_sheets =
      await face_inventory_items_details.updateOne(
        { _id: face_item_data?._id },
        {
          $set: {
            available_sheets: available_sheets,
            available_amount: available_amount,
            available_sqm: available_sqm,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_face_item_no_of_sheets?.matchedCount === 0) {
      throw new ApiError('Face item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_face_item_no_of_sheets?.acknowledged ||
      update_face_item_no_of_sheets?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Face item status',
        StatusCodes.BAD_REQUEST
      );
    }

    //update plywood inventory invoice ediatble status
    const update_face_inventory_invoice_editable_status =
      await face_inventory_invoice_details?.updateOne(
        { _id: face_item_data?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_face_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'Plywood item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_face_inventory_invoice_editable_status?.acknowledged ||
      update_face_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update plywood item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to plywood history model
    const add_issued_data_to_face_history =
      await face_history_model.create(
        [
          {
            issued_for_order_id: issue_for_order_id,
            issue_status: issues_for_status?.order,
            face_item_id: face_item_data?._id,
            issued_sheets: issued_sheets_for_order,
            issued_sqm: issued_sqm_for_order,
            issued_amount: issued_amount_for_order,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        { session }
      );

    if (add_issued_data_to_face_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to face history',
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
