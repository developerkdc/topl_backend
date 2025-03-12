import mongoose from "mongoose";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import ApiError from "../../../../utils/errors/apiError.js";
import { StatusCodes } from "../../../../utils/constants.js";
import { grouping_done_details_model, grouping_done_items_details_model } from "../../../../database/schema/factory/grouping/grouping_done.schema.js";
import { issues_for_status } from "../../../../database/Utils/constants/constants.js";
import issue_for_tapping_model from "../../../../database/schema/factory/tapping/issue_for_tapping/issue_for_tapping.schema.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import grouping_done_history_model from "../../../../database/schema/factory/grouping/grouping_done_history.schema.js";

export const issue_for_tapping_from_grouping_for_stock_and_sample = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userDetails = req.userDetails;
        const { grouping_done_item_id } = req.params;
        const {
            issue_status,
            issue_no_of_leaves
        } = req.body
        if (!grouping_done_item_id || !mongoose.isValidObjectId(grouping_done_item_id)) {
            throw new ApiError("Invalid grouping done item id", StatusCodes.BAD_REQUEST)
        }
        if (!issue_status || !issue_no_of_leaves) {
            throw new ApiError("Required issue status or issue no of leaves", StatusCodes.BAD_REQUEST)
        }
        if (![issues_for_status?.stock, issues_for_status?.sample].includes(issue_status)) {
            throw new ApiError("Invalid issue status", StatusCodes.BAD_REQUEST)
        }

        const fetch_grouping_done_item_details = await grouping_done_items_details_model.findOne({ _id: grouping_done_item_id }).lean();
        if (!fetch_grouping_done_item_details) {
            throw new ApiError("Grouping done item not found", StatusCodes.NOT_FOUND)
        }
        const data = fetch_grouping_done_item_details;
        const available_details = data?.available_details;

        const no_of_leaves_available = available_details?.no_of_leaves - issue_no_of_leaves;
        if (no_of_leaves_available < 0) {
            throw new ApiError("Not enough leaves available", StatusCodes.BAD_REQUEST)
        }

        const grouping_item_sqm = available_details?.sqm;
        const tapping_sqm = Number((data?.length * data?.width * issue_no_of_leaves)?.toFixed(3));
        const tapping_amount = Number(((tapping_sqm / grouping_item_sqm) * available_details?.amount)?.toFixed(2));

        const grouping_data = {
            grouping_done_other_details_id: data?.grouping_done_other_details_id,
            group_no: data?.group_no,
            photo_no: data?.photo_no,
            photo_no_id: data?.photo_no_id,
            item_name: data?.item_name,
            item_name_id: data?.item_name_id,
            item_sub_category_id: data?.item_sub_category_id,
            item_sub_category_name: data?.item_sub_category_name,
            log_no_code: data?.log_no_code,
            length: data?.length,
            width: data?.width,
            height: data?.height,
            thickness: data?.thickness,
            pallet_number: data?.pallet_number,
            process_id: data?.process_id,
            process_name: data?.process_name,
            cut_id: data?.cut_id,
            cut_name: data?.cut_name,
            color_id: data?.color_id,
            color_name: data?.color_name,
            character_id: data?.character_id,
            character_name: data?.character_name,
            pattern_id: data?.pattern_id,
            pattern_name: data?.pattern_name,
            series_id: data?.series_id,
            series_name: data?.series_name,
            grade_id: data?.grade_id,
            grade_name: data?.grade_name,
        }

        const issue_for_tapping_data = {
            ...grouping_data,
            grouping_done_item_id: data?._id,
            issue_status: issue_status,
            issued_from: issues_for_status.grouping,
            no_of_leaves: issue_no_of_leaves,
            sqm: tapping_sqm,
            amount: tapping_amount,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
        }

        const grouping_item_exits_in_tapping = await issue_for_tapping_model.findOne({
            grouping_done_item_id: issue_for_tapping_data?.issue_for_tapping_data,
            grouping_done_other_details_id: issue_for_tapping_data?.grouping_done_other_details_id,
            group_no: issue_for_tapping_data?.group_no,
            issue_status: issue_for_tapping_data?.issue_status
        });

        let issues_for_tapping_details;
        if (grouping_item_exits_in_tapping) {
            const issue_for_tapping_id = grouping_item_exits_in_tapping?._id
            const merge_issue_for_tapping = await issue_for_tapping_model.findOneAndUpdate({ _id: issue_for_tapping_id }, {
                $set: {
                    updated_by: userDetails?._id,
                },
                $inc: {
                    "available_details.no_of_leaves": issue_for_tapping_data?.no_of_leaves,
                    "available_details.sqm": issue_for_tapping_data?.sqm,
                    "available_details.amount": issue_for_tapping_data?.amount,
                }
            }, { session, new: true, runValidators: true })
            issues_for_tapping_details = merge_issue_for_tapping;
        } else {
            const insert_issue_for_tapping = await issue_for_tapping_model.create([
                issue_for_tapping_data
            ], { session });

            issues_for_tapping_details = insert_issue_for_tapping?.[0];
        }

        if (!issues_for_tapping_details) {
            throw new ApiError("Failed to create issue for tapping", StatusCodes.NOT_FOUND)
        }

        //add issue for tapping items details to grouping done history
        const insert_tapping_item_grouping_history = await grouping_done_history_model.create([
            issue_for_tapping_data
        ], { session });

        const grouping_history_item_details = insert_tapping_item_grouping_history?.[0];
        if (!grouping_history_item_details) {
            throw new ApiError("Failed to add grouping history item details", StatusCodes.NOT_FOUND)
        }

        // update grouping done items available details
        const update_grouping_done_item_available_quantity = await grouping_done_items_details_model.updateOne({
            _id: issues_for_tapping_details.grouping_done_item_id
        }, {
            $set: {
                updated_by: userDetails?._id,
            },
            $inc: {
                "available_details.no_of_leaves": -issue_for_tapping_data?.no_of_leaves,
                "available_details.sqm": -issue_for_tapping_data?.sqm,
                "available_details.amount": -issue_for_tapping_data?.amount,
            }
        }, { session });

        if (update_grouping_done_item_available_quantity.matchedCount <= 0) {
            throw new ApiError('Failed to find grouping done item details', 400);
        }
        if (
            !update_grouping_done_item_available_quantity.acknowledged ||
            update_grouping_done_item_available_quantity.modifiedCount <= 0
        ) {
            throw new ApiError('Failed to update grouping done item available details', 400);
        };


        // make editable false for grouping done other details
        const update_grouping_done_other_details = await grouping_done_details_model.updateOne({
            _id: issues_for_tapping_details?.grouping_done_other_details_id
        }, {
            $set: {
                isEditable: false,
                updated_by: userDetails?._id
            }
        });

        if (update_grouping_done_other_details.matchedCount <= 0) {
            throw new ApiError('Failed to find grouping done other details', 400);
        }
        if (
            !update_grouping_done_other_details.acknowledged ||
            update_grouping_done_other_details.modifiedCount <= 0
        ) {
            throw new ApiError('Failed to update grouping done other details', 400);
        }

        const response = new ApiResponse(
            StatusCodes.OK,
            'Add issue for tapping successfully',
            issues_for_tapping_details
        );

        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});

export const revert_issue_for_tapping = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});

