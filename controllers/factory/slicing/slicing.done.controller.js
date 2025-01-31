import { StatusCodes } from '../../../utils/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';

import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import {
  slicing_done_items_model,
  slicing_done_other_details_model,
} from '../../../database/schema/factory/slicing/slicing_done.schema.js';

export const add_slicing_done = catchAsync(async (req, res, next) => {
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
      await slicing_done_other_details_model.create([other_details], {
        session,
      });
    const other_details_data = add_other_details_data?.[0];

    if (!other_details_data) {
      throw new ApiError('Failed to add other details', 400);
    }
    const add_other_details_id = other_details_data?._id;

    const items_details_data = items_details?.map((item) => {
      item.slicing_done_other_details_id = add_other_details_id;
      return item;
    });

    const add_items_details_data = await slicing_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    const response = new ApiResponse(201, 'Slicing Done Successfully', {
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


export const revert_slicing_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { other_details_id } = req.params;
    if (!other_details_id) {
      throw new ApiError('Please provide other details id', 400);
    }

    const other_details = await slicing_done_other_details_model.findById(
      other_details_id
    );
    if (!other_details) {
      throw new ApiError('Other details not found', 404);
    }

    const items_details = await slicing_done_items_model.find({
      slicing_done_other_details_id: other_details_id,
    });
    if (items_details?.length <= 0) {
      throw new ApiError('Items details not found', 404);
    }

    await slicing_done_other_details_model.findByIdAndDelete(other_details_id, {
      session,
    });
    await slicing_done_items_model.deleteMany(
      { slicing_done_other_details_id: other_details_id },
      { session }
    );

    const response = new ApiResponse(200, 'Slicing Done Reverted Successfully', {
      other_details,
      items_details,
    });

    return res.status(200).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});