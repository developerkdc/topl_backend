import mongoose, { isValidObjectId } from 'mongoose';
import catchAsync from '../../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../../../utils/constants.js';
import {
  mdf_inventory_invoice_details,
  mdf_inventory_items_details,
} from '../../../../../database/schema/inventory/mdf/mdf.schema.js';
import {
  issues_for_status,
  item_issued_from,
} from '../../../../../database/Utils/constants/constants.js';
import issue_for_order_model from '../../../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import mdf_history_model from '../../../../../database/schema/inventory/mdf/mdf.history.schema.js';
import { RawOrderItemDetailsModel } from '../../../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import ApiResponse from '../../../../../utils/ApiResponse.js';

export const add_issue_for_order = catchAsync(async (req, res) => {
  const { order_item_id, mdf_item_details } = req.body;
  const userDetails = req.userDetails;
  const session = await mongoose.startSession();

  if (!isValidObjectId(order_item_id)) {
    throw new ApiError('Invalid Order Item ID', StatusCodes.BAD_REQUEST);
  }

  if (!mdf_item_details) {
    throw new ApiError('MDF Item Data is misssing', StatusCodes.BAD_REQUEST);
  }

  for (let field of ['order_item_id', 'mdf_item_details']) {
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

    const mdf_item_data = await mdf_inventory_items_details
      .findById(mdf_item_details?._id)
      .lean();
    if (!mdf_item_data) {
      throw new ApiError('MDF Item Data not found.');
    }

    if (mdf_item_data?.available_sheets <= 0) {
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

    if (
      Number(
        validate_sqm_for_order?.total_sheets +
          Number(mdf_item_details?.issued_sheets)
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
      issued_from: item_issued_from?.mdf,
      item_details: mdf_item_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

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
      mdf_item_data?.available_sheets - mdf_item_details?.issued_sheets;
    //available sqm
    const available_sqm =
      mdf_item_data?.available_sqm - mdf_item_details?.issued_sqm;
    //available_amount
    const available_amount =
      mdf_item_data?.available_amount - mdf_item_details?.issued_amount;

    const update_mdf_item_no_of_sheets =
      await mdf_inventory_items_details.updateOne(
        { _id: mdf_item_data?._id },
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

    if (update_mdf_item_no_of_sheets?.matchedCount === 0) {
      throw new ApiError('MDF item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_mdf_item_no_of_sheets?.acknowledged ||
      update_mdf_item_no_of_sheets?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update MDF item status',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_mdf_inventory_invoice_editable_status =
      await mdf_inventory_invoice_details?.updateOne(
        { _id: mdf_item_data?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_mdf_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError('MDF item invoice not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_mdf_inventory_invoice_editable_status?.acknowledged ||
      update_mdf_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update MDF item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    // =================
    //add data to Mdf history model
    const add_issued_data_to_mdf_history = await mdf_history_model.create(
      [
        {
          issued_for_order_id: issue_for_order_id,
          issue_status: issues_for_status?.order,
          mdf_item_id: mdf_item_data?._id,
          issued_sheets: issued_sheets_for_order,
          issued_sqm: issued_sqm_for_order,
          issued_amount: issued_amount_for_order,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        },
      ],
      { session }
    );

    if (add_issued_data_to_mdf_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to MDF history',
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
