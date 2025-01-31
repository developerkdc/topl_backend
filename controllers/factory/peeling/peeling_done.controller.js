import {
  peeling_done_items_model,
  peeling_done_other_details_model,
} from '../../../database/schema/factory/peeling/peeling_done.schema';
import ApiResponse from '../../../utils/ApiResponse';
import ApiError from '../../../utils/errors/apiError';
import catchAsync from '../../../utils/errors/catchAsync';

export const add_peeling_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { other_details, items_details } = req.body;
    if (!other_details && !items_details) {
      throw new ApiError('Please provide other or items details', 400);
    }
    if (!Array.isArray(items_details)) {
      throw new ApiError('items_details must be array', 400);
    }
    if (items_details?.length < 0) {
      throw new ApiError('Atleast one items is required', 400);
    }

    const add_other_details_data =
      await peeling_done_other_details_model.create([other_details], {
        session,
      });
    const other_details_data = add_other_details_data?.[0];

    if (!other_details_data) {
      throw new ApiError('Failed to add other details', 400);
    }
    const add_other_details_id = other_details_data?._id;

    const items_details_data = items_details?.map((item) => {
      item.peeling_done_other_details_id = add_other_details_id;
      return item;
    });

    const add_items_details_data = await peeling_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    const response = new ApiResponse(201, 'Peeling Done Successfully', {
      other_details: other_details_data,
      items_details: add_items_details_data,
    });

    return res.status(201).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});
