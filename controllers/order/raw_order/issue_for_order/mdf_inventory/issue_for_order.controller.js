import mongoose, { isValidObjectId } from 'mongoose';
import catchAsync from '../../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../../../utils/constants.js';
import { mdf_inventory_items_details } from '../../../../../database/schema/inventory/mdf/mdf.schema.js';

export const add_issue_for_order = catchAsync(async (req, res) => {
  // res.status(200).json({msg:"This is add issue for order from mdf"});
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
  } catch (error) {
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }
});
