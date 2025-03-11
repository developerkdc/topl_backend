import mongoose from "mongoose";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import ApiError from "../../../../utils/errors/apiError.js";
import { StatusCodes } from "../../../../utils/constants.js";
import { grouping_done_items_details_model } from "../../../../database/schema/factory/grouping/grouping_done.schema.js";

export const issue_for_tapping_from_grouping = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try { 
        const userDetails = req.userDetails;
        const {grouping_done_item_id} = req.params;
        if(!grouping_done_item_id || !mongoose.isValidObjectId(grouping_done_item_id)){
            throw new ApiError("Invalid grouping done item id",StatusCodes.BAD_REQUEST)
        }

        const grouping_done_item_details = await grouping_done_items_details_model.findOne({_id:grouping_done_item_id}).lean();
        if(!grouping_done_item_details){
            throw new ApiError("Grouping done item not found",StatusCodes.NOT_FOUND)
        }
        
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
})