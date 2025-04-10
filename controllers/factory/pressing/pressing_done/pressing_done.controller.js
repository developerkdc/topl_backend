import mongoose from 'mongoose';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import issue_for_tapping_model from '../../../../database/schema/factory/tapping/issue_for_tapping/issue_for_tapping.schema.js';
import {
  tapping_done_items_details_model,
  tapping_done_other_details_model,
} from '../../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import issue_for_tapping_wastage_model from '../../../../database/schema/factory/tapping/tapping_wastage/tapping_wastage.schema.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { tapping_done_history_model } from '../../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import { pressing_done_details_model } from '../../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';

export const add_pressing_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { pressing_details, consume_items_details } = req.body;

    for (let i of ['pressing_details', 'consume_items_details']) {
      if (!req.body?.[i]) {
        throw new ApiError(
          `Please provide ${i} details`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    //validating the group details, base details.
    const { group_details, base_details, face_details } = consume_items_details;

    for (let i of ['group_details', 'base_details']) {
      if (!consume_items_details?.[i]) {
        throw new ApiError(
          `Please provide ${i} details`,
          StatusCodes.BAD_REQUEST
        );
      }

      if (!Array.isArray(consume_items_details?.[i])) {
        throw new ApiError(`${i} must be array`, StatusCodes.BAD_REQUEST);
      }

      if (consume_items_details?.[i]?.length < 0) {
        throw new ApiError(
          `Atleast one items is required in ${i}.`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    // validation the face details if pressing instruction is FACE WITH LAYER
    if (
      pressing_details?.pressing_instructions &&
      pressing_details?.pressing_instructions === 'FACE WITH LAYER'
    ) {
      if (!face_details) {
        throw new ApiError(
          `Please provide face details`,
          StatusCodes.BAD_REQUEST
        );
      }
      if (!Array.isArray(face_details)) {
        throw new ApiError(
          `face_details must be array`,
          StatusCodes.BAD_REQUEST
        );
      }
      if (face_details?.length < 0) {
        throw new ApiError(
          `Atleast one items is required in face_details.`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    // Adding pressing details in db with session

    const pressing_details_data = {
      ...pressing_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };
    const add_pressing_details_data = await pressing_done_details_model.create(
      [pressing_details_data],
      { session }
    );

    // issue for tapping
    const fetch_issue_for_tapping_data = await issue_for_tapping_model.findOne({
      _id: other_details?.issue_for_tapping_item_id,
    });
    if (!fetch_issue_for_tapping_data) {
      throw new ApiError(
        'Issue for tapping data not found',
        StatusCodes.BAD_REQUEST
      );
    }
    if (fetch_issue_for_tapping_data?.is_tapping_done) {
      throw new ApiError(
        'Already created tapping done for this issue for tapping',
        StatusCodes.BAD_REQUEST
      );
    }

    // Other goods details
    const add_other_details_data =
      await tapping_done_other_details_model.create(
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
      throw new ApiError(
        'Failed to add other details',
        StatusCodes.BAD_REQUEST
      );
    }
    const add_other_details_id = other_details_data?._id;

    // item details
    const items_details_data = items_details?.map((item, index) => {
      item.tapping_done_other_details_id = add_other_details_id;
      item.created_by = userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });
    const add_items_details_data =
      await tapping_done_items_details_model.insertMany(items_details_data, {
        session,
      });
    if (add_items_details_data?.length <= 0) {
      throw new ApiError(
        'Failed to add Items details',
        StatusCodes.BAD_REQUEST
      );
    }

    const issue_for_tapping_item_id =
      other_details_data?.issue_for_tapping_item_id;
    // Wastage
    if (is_wastage && wastage_details) {
      const wastage_details_data = {
        ...wastage_details,
        issue_for_tapping_item_id: issue_for_tapping_item_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_wastage_details_data =
        await issue_for_tapping_wastage_model.create([wastage_details_data], {
          session,
        });
      if (add_wastage_details_data?.length <= 0) {
        throw new ApiError(
          'Failed to add wastage details',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    // update issue for tapping issue status
    const update_issue_for_tapping = await issue_for_tapping_model.updateOne(
      { _id: issue_for_tapping_item_id },
      {
        $set: {
          is_tapping_done: true,
          updated_by: userDetails?._id,
        },
      },
      { runValidators: true, session }
    );

    if (update_issue_for_tapping.matchedCount <= 0) {
      throw new ApiError(
        'Failed to find Issue for tapping',
        StatusCodes.BAD_REQUEST
      );
    }
    if (
      !update_issue_for_tapping.acknowledged ||
      update_issue_for_tapping.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update Issue for tapping',
        StatusCodes.BAD_REQUEST
      );
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.CREATED,
      'tapping Done Successfully',
      {
        other_details: other_details_data,
        items_details: add_items_details_data,
      }
    );

    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});
