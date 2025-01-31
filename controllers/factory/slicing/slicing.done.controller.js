import { StatusCodes } from '../../../utils/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import {
  issues_for_status,
  slicing_done,
} from '../../../database/Utils/constants/constants.js';

import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import {
  slicing_done_items_model,
  slicing_done_other_details_model,
} from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import { issued_for_slicing_model } from '../../../database/schema/factory/slicing/issue_for_slicing/issuedForSlicing.js';
import issue_for_slicing_available_model from '../../../database/schema/factory/slicing/issue_for_slicing/issue_for_slicing_available_schema.js';
import issue_for_slicing_wastage_model from '../../../database/schema/factory/slicing/issue_for_slicing/issue_for_slicing_wastage_schema.js';

export const add_slicing_done = catchAsync(async (req, res, next) => {
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

    // Other goods details
    const add_other_details_data =
      await slicing_done_other_details_model.create(
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
    const maxNumber = await slicing_done_items_model.aggregate([
      {
        $group: {
          _id: null,
          max: { $max: '$sr_no' },
        },
      },
    ]);

    const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;

    const items_details_data = items_details?.map((item, index) => {
      item.sr_no = maxSrNo + index;
      item.slicing_done_other_details_id = add_other_details_id;
      item.created_by = userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });
    const add_items_details_data = await slicing_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length === 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage or re-slicing
    const issue_for_slicing_id = other_details_data?.issue_for_slicing_id;
    const issue_for_slicing_type =
      await issued_for_slicing_model.findOneAndUpdate(
        { _id: issue_for_slicing_id },
        {
          $set: {
            type: type,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    if (!issue_for_slicing_type) {
      throw new ApiError('Failed to add type', 400);
    }

    if (
      issue_for_slicing_type?.type?.toLowerCase() ===
      slicing_done.wastage?.toLowerCase()
    ) {
      const maxNumber = await issue_for_slicing_wastage_model.aggregate([
        {
          $group: {
            _id: null,
            max: { $max: '$sr_no' },
          },
        },
      ]);

      const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;

      const wastage_details_data = {
        ...wastage_details,
        sr_no: maxSrNo,
        issue_for_slicing_id: issue_for_slicing_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_wastage_details_data =
        await issue_for_slicing_wastage_model.create([wastage_details_data], {
          session,
        });
      if (add_wastage_details_data?.length <= 0) {
        throw new ApiError('Failed to add wastage details', 400);
      }
    }

    if (
      issue_for_slicing_type?.type?.toLowerCase() ===
      slicing_done.rest_roller?.toLowerCase()
    ) {
      const maxNumber = await issue_for_slicing_available_model.aggregate([
        {
          $group: {
            _id: null,
            max: { $max: '$sr_no' },
          },
        },
      ]);

      const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;

      const available_details_data = {
        ...available_details,
        sr_no: maxSrNo,
        issue_for_slicing_id: issue_for_slicing_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_available_details_data =
        await issue_for_slicing_available_model.create(
          [available_details_data],
          {
            session,
          }
        );
      if (add_available_details_data?.length === 0) {
        throw new ApiError('Failed to add available details', 400);
      }
    }

    await session.commitTransaction();

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

    const other_details =
      await slicing_done_other_details_model.findById(other_details_id);
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

    const response = new ApiResponse(
      200,
      'Slicing Done Reverted Successfully',
      {
        other_details,
        items_details,
      }
    );

    return res.status(200).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});
