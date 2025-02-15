import mongoose from "mongoose";
import dressing_done_history_model from "../../../database/schema/factory/dressing/dressing_done/dressing.done.history.schema.js";
import { dressing_done_items_model, dressing_done_other_details_model } from "../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js";
import { issues_for_grouping_model } from "../../../database/schema/factory/grouping/issues_for_grouping.schema.js";
import process_done_history_model from "../../../database/schema/factory/smoking_dying/smoking_dying_done.history.schema.js";
import { process_done_details_model, process_done_items_details_model } from "../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js";
import { issues_for_status } from "../../../database/Utils/constants/constants.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { StatusCodes } from "../../../utils/constants.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js";

export const issue_for_grouping_from_smoking_dying_done = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userDetails = req.userDetails;
        const { process_done_id } = req.params;
        const { process_done_items_ids } = req.body;
        if (!process_done_id) {
            throw new ApiError("process_done_id is required", StatusCodes.BAD_REQUEST);
        }
        if (
            !process_done_items_ids ||
            (Array.isArray(process_done_items_ids) && process_done_items_ids?.length <= 0)
        ) {
            throw new ApiError(
                'process_done_items_ids is required',
                StatusCodes.BAD_REQUEST
            );
        };
        if (!Array.isArray(process_done_items_ids)) {
            throw new ApiError(
                'process_done_items_ids must be array',
                StatusCodes.BAD_REQUEST
            );
        };

        const process_done_items_details = await process_done_items_details_model.find({
            process_done_id: process_done_id,
            _id: { $in: process_done_items_ids }
        });

        if (!process_done_items_details || process_done_items_details?.length <= 0) {
            throw new ApiError('process_done_items_details not found', StatusCodes.NOT_FOUND);
        }
        const bundle_ids = process_done_items_details?.map((e) => e._id);

        const add_issues_for_grouping = await issues_for_grouping_model.create([{
            process_done_id: process_done_id,
            bundles: bundle_ids,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
        }], { session });

        const issue_for_grouping_data = add_issues_for_grouping?.[0];
        if (!issue_for_grouping_data) {
            throw new ApiError('Failed to add data,issue for grouping', StatusCodes.NOT_FOUND);
        }

        // update process done editable status
        const update_process_done_editable = await process_done_details_model.updateOne(
            {
                _id: issue_for_grouping_data?.process_done_id
            },
            {
                $set: {
                    isEditable: false,
                    updated_by: userDetails?._id
                }
            }, { session });

        if (update_process_done_editable.matchedCount <= 0) {
            throw new ApiError('Failed to update process done editable', StatusCodes.NOT_FOUND);
        }
        if (!update_process_done_editable.acknowledged || update_process_done_editable.matchedCount <= 0) {
            throw new ApiError('Failed to update process done editable', StatusCodes.INTERNAL_SERVER_ERROR);
        }

        // update process done item issue status to grouping 
        const update_process_done_items = await process_done_items_details_model.updateOne(
            {
                _id: { $in: issue_for_grouping_data?.process_done_id }
            },
            {
                $set: {
                    issue_status:issues_for_status.grouping,
                    updated_by: userDetails?._id
                }
            }, { session });

        if (update_process_done_items.matchedCount <= 0) {
            throw new ApiError('Failed to update process done items issue status', StatusCodes.NOT_FOUND);
        }
        if (!update_process_done_items.acknowledged || update_process_done_items.matchedCount <= 0) {
            throw new ApiError('Failed to update process done items issue status', StatusCodes.INTERNAL_SERVER_ERROR);
        }

        // add to process done history 
        const add_process_done_history = await process_done_history_model.create([{
            process_done_id: issue_for_grouping_data?.process_done_id,
            bundles: issue_for_grouping_data?.bundles,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
        }], { session });

        if (!add_process_done_history?.[0]) {
            throw new ApiError('Failed to add process done history', StatusCodes.NOT_FOUND);
        }

        await session.commitTransaction();
        const response = new ApiResponse(
            StatusCodes.CREATED,
            'Issue for grouping added successfully',
            issue_for_grouping_data
        );
        return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});

export const issue_for_grouping_from_dressing_done = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userDetails = req.userDetails;
        const { dressing_done_id } = req.params;
        const { dressing_done_items_ids } = req.body;
        if (!dressing_done_id) {
            throw new ApiError("dressing_done_id is required", StatusCodes.BAD_REQUEST);
        }
        if (
            !dressing_done_items_ids ||
            (Array.isArray(dressing_done_items_ids) && dressing_done_items_ids?.length <= 0)
        ) {
            throw new ApiError(
                'dressing_done_items_ids is required',
                StatusCodes.BAD_REQUEST
            );
        };
        if (!Array.isArray(dressing_done_items_ids)) {
            throw new ApiError(
                'dressing_done_items_ids must be array',
                StatusCodes.BAD_REQUEST
            );
        };

        const dressing_done_items_details = await dressing_done_items_model.find({
            dressing_done_id: dressing_done_id,
            _id: { $in: dressing_done_items_ids }
        });

        if (!dressing_done_items_details || dressing_done_items_details?.length <= 0) {
            throw new ApiError('dressing_done_items_details not found', StatusCodes.NOT_FOUND);
        }
        const bundle_ids = dressing_done_items_details?.map((e) => e._id);

        const add_issues_for_grouping = await issues_for_grouping_model.create([{
            dressing_done_id: dressing_done_id,
            bundles: bundle_ids,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
        }], { session });

        const issue_for_grouping_data = add_issues_for_grouping?.[0];
        if (!issue_for_grouping_data) {
            throw new ApiError('Failed to add data,issue for grouping', StatusCodes.NOT_FOUND);
        }

        // update dressing done editable status
        const update_dressing_done_editable = await dressing_done_other_details_model.updateOne(
            {
                _id: issue_for_grouping_data?.dressing_done_id
            },
            {
                $set: {
                    isEditable: false,
                    updated_by: userDetails?._id
                }
            }, { session });

        if (update_dressing_done_editable.matchedCount <= 0) {
            throw new ApiError('Failed to update process done editable', StatusCodes.NOT_FOUND);
        };
        if (!update_dressing_done_editable.acknowledged || update_dressing_done_editable.matchedCount <= 0) {
            throw new ApiError('Failed to update process done editable', StatusCodes.INTERNAL_SERVER_ERROR);
        };

        // update dressing done item issue status to grouping 
        const update_dressing_done_items = await dressing_done_items_model.updateOne(
            {
                _id: { $in: issue_for_grouping_data?.dressing_done_id }
            },
            {
                $set: {
                    issue_status:issues_for_status.grouping,
                    updated_by: userDetails?._id
                }
            }, { session });

        if (update_dressing_done_items.matchedCount <= 0) {
            throw new ApiError('Failed to update process done items issue status', StatusCodes.NOT_FOUND);
        }
        if (!update_dressing_done_items.acknowledged || update_dressing_done_items.matchedCount <= 0) {
            throw new ApiError('Failed to update process done items issue status', StatusCodes.INTERNAL_SERVER_ERROR);
        }

        // add to dressing done history 
        const dressing_done_history = await dressing_done_history_model.create([{
            dressing_done_other_details_id: issue_for_grouping_data?.dressing_done_id,
            bundles: issue_for_grouping_data?.bundles,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
        }], { session });

        if (!dressing_done_history?.[0]) {
            throw new ApiError('Failed to add process done history', StatusCodes.NOT_FOUND);
        }

        await session.commitTransaction();
        const response = new ApiResponse(
            StatusCodes.CREATED,
            'Issue for grouping added successfully',
            issue_for_grouping_data
        );
        return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
})
