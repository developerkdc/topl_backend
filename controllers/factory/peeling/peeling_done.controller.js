import mongoose from 'mongoose';
import { issues_for_peeling_model } from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling.schema.js';
import issues_for_peeling_available_model from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_available.schema.js';
import issues_for_peeling_wastage_model from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_wastage.schema.js';
import {
  peeling_done_items_model,
  peeling_done_other_details_model,
} from '../../../database/schema/factory/peeling/peeling_done.schema.js';
import { issue_for_peeling } from '../../../database/Utils/constants/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

export const add_peeling_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const {
      other_details,
      items_details,
      type,
      wastage_details,
      available_details,
    } = req.body;
    for (let i of ['other_details', 'items_details', 'type']) {
      if (!req.body?.[i]) {
        throw new ApiError(`Please provide ${i} details`, 400);
      }
    }
    if (!Array.isArray(items_details)) {
      throw new ApiError('items_details must be array', 400);
    }
    if (items_details?.length < 0) {
      throw new ApiError('Atleast one items is required', 400);
    }
    if (type === issue_for_peeling.wastage) {
      if (!wastage_details) {
        throw new ApiError('Please provide wastage details', 400);
      }
    }
    if (type === issue_for_peeling.re_flitching) {
      if (!available_details) {
        throw new ApiError('Please provide available details', 400);
      }
    }

    // Other goods details
    const add_other_details_data =
      await peeling_done_other_details_model.create(
        [
          {
            ...other_details,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        {
          session,
        }
      );
    const other_details_data = add_other_details_data?.[0];

    if (!other_details_data) {
      throw new ApiError('Failed to add other details', 400);
    }
    const add_other_details_id = other_details_data?._id;

    // item details
    const items_details_data = items_details?.map((item, index) => {
      item.peeling_done_other_details_id = add_other_details_id;
      item.created_by = userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });
    const add_items_details_data = await peeling_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage or re-flitching
    const issue_for_peeling_id = other_details_data?.issue_for_peeling_id;
    const issue_for_peeling_type =
      await issues_for_peeling_model.findOneAndUpdate(
        { _id: issue_for_peeling_id },
        {
          $set: {
            type: type,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    if (!issue_for_peeling_type) {
      throw new ApiError('Failed to add type', 400);
    }

    if (
      issue_for_peeling_type?.type?.toLowerCase() ===
        issue_for_peeling.wastage?.toLowerCase() &&
      wastage_details
    ) {
      const wastage_details_data = {
        ...wastage_details,
        issue_for_peeling_id: issue_for_peeling_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_wastage_details_data =
        await issues_for_peeling_wastage_model.create([wastage_details_data], {
          session,
        });
      if (add_wastage_details_data?.length <= 0) {
        throw new ApiError('Failed to add wastage details', 400);
      }
    }

    if (
      issue_for_peeling_type?.type?.toLowerCase() ===
        issue_for_peeling.re_flitching?.toLowerCase() &&
      available_details
    ) {
      const re_flitching_details_data = {
        ...available_details,
        issue_for_peeling_id: issue_for_peeling_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_available_details_data =
        await issues_for_peeling_available_model.create(
          [re_flitching_details_data],
          {
            session,
          }
        );
      if (add_available_details_data?.length <= 0) {
        throw new ApiError('Failed to add rejection details', 400);
      }
    }
    await session.commitTransaction();
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

export const edit_peeling_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { peeling_done_id } = req.params;
    if (!peeling_done_id && !mongoose.isValidObjectId(peeling_done_id)) {
      throw new ApiError('Invalid peeling done id', 400);
    }
    const {
      other_details,
      items_details,
      type,
      wastage_details,
      available_details,
    } = req.body;
    for (let i of ['other_details', 'items_details', 'type']) {
      if (!req.body?.[i]) {
        throw new ApiError(`Please provide ${i} details`, 400);
      }
    }
    if (!Array.isArray(items_details)) {
      throw new ApiError('items_details must be array', 400);
    }
    if (items_details?.length < 0) {
      throw new ApiError('Atleast one items is required', 400);
    }
    if (type === issue_for_peeling.wastage) {
      if (!wastage_details) {
        throw new ApiError('Please provide wastage details', 400);
      }
    }
    if (type === issue_for_peeling.re_flitching) {
      if (!available_details) {
        throw new ApiError('Please provide available details', 400);
      }
    }

    // Other goods details
    const add_other_details_data =
      await peeling_done_other_details_model.findOneAndUpdate(
        { _id: peeling_done_id },
        {
          $set: {
            ...other_details,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    const other_details_data = add_other_details_data;

    if (!other_details_data) {
      throw new ApiError('Failed to update other details', 400);
    }
    const add_other_details_id = other_details_data?._id;

    // item details

    const items_details_data = items_details?.map((item, index) => {
      item.peeling_done_other_details_id = add_other_details_id;
      item.created_by = item.created_by ? item.created_by : userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });

    const delete_items_details = await peeling_done_items_model.deleteMany(
      { peeling_done_other_details_id: add_other_details_id },
      {
        session,
      }
    );

    if (
      !delete_items_details.acknowledged ||
      delete_items_details.deletedCount <= 0
    ) {
      throw new ApiError('Failed to delete items details', 400);
    }

    const add_items_details_data = await peeling_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage or re-flitching
    const issue_for_peeling_id = other_details_data?.issue_for_peeling_id;

    const issue_for_peeling_type =
      await issues_for_peeling_model.findOneAndUpdate(
        { _id: issue_for_peeling_id },
        {
          $set: {
            type: type,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    if (!issue_for_peeling_type) {
      throw new ApiError('Failed to add type', 400);
    }

    //delete wastage
    const delete_wastage = await issues_for_peeling_wastage_model.deleteOne(
      { issue_for_peeling_id: issue_for_peeling_id },
      {
        session,
      }
    );

    if (!delete_wastage.acknowledged) {
      throw new ApiError('Failed to delete wastage details', 400);
    }

    //delete re-flitching
    const delete_available = await issues_for_peeling_wastage_model.deleteOne(
      { issue_for_peeling_id: issue_for_peeling_id },
      {
        session,
      }
    );

    if (!delete_available.acknowledged) {
      throw new ApiError('Failed to delete available details', 400);
    }

    //add wastage
    if (
      issue_for_peeling_type?.type?.toLowerCase() ===
        issue_for_peeling.wastage?.toLowerCase() &&
      wastage_details
    ) {
      const wastage_details_data = {
        ...wastage_details,
        issue_for_peeling_id: issue_for_peeling_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };

      const add_wastage_details_data =
        await issues_for_peeling_wastage_model.create([wastage_details_data], {
          session,
        });
      if (add_wastage_details_data?.length <= 0) {
        throw new ApiError('Failed to add wastage details', 400);
      }
    }

    // add available
    if (
      issue_for_peeling_type?.type?.toLowerCase() ===
        issue_for_peeling.re_flitching?.toLowerCase() &&
      available_details
    ) {
      const re_flitching_details_data = {
        ...available_details,
        issue_for_peeling_id: issue_for_peeling_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_available_details_data =
        await issues_for_peeling_available_model.create(
          [re_flitching_details_data],
          {
            session,
          }
        );
      if (add_available_details_data?.length <= 0) {
        throw new ApiError('Failed to add rejection details', 400);
      }
    }
    await session.commitTransaction();
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
