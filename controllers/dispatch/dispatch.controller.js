import mongoose from "mongoose";
import catchAsync from "../../utils/errors/catchAsync.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { StatusCodes } from "../../utils/constants.js";
import diapatchModel from "../../database/schema/dispatch/dispatch.schema.js";
import ApiError from "../../utils/errors/apiError.js";
import dispatchItemsModel from "../../database/schema/dispatch/dispatch_items.schema.js";

export const add_dispatch_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userDetails = req.userDetails;
        const { dispatch_data, dispatch_items_details } = req.body;
        if (!dispatch_data || !dispatch_items_details) {
            throw new Error('Dispatch data and items details are required');
        };

        const dispatch_details_data = {
            ...dispatch_data,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
        };

        const add_dispatch_details_data = await diapatchModel.create([dispatch_details_data], { session });
        if (!add_dispatch_details_data || add_dispatch_details_data.length === 0) {
            throw new ApiError('Failed to create dispatch details', StatusCodes.INTERNAL_SERVER_ERROR);
        };

        const dispatch_id = add_dispatch_details_data?.[0]?._id;
        const dispatch_items_data = dispatch_items_details.map((items) => {
            return {
                ...items,
                dispatch_id: dispatch_id,
                created_by: userDetails?._id,
                updated_by: userDetails?._id,
            }
        });
        if(!dispatch_items_data || dispatch_items_data?.length === 0) {
            throw new ApiError('Dispatch items details are required', StatusCodes.BAD_REQUEST);
        };

        const add_dispatch_items_data = await dispatchItemsModel.insertMany(dispatch_items_data, { session });
        if (!add_dispatch_items_data || add_dispatch_items_data?.length === 0) {
            throw new ApiError('Failed to create dispatch items', StatusCodes.INTERNAL_SERVER_ERROR);
        }

        await session.commitTransaction();
        const response = new ApiResponse(StatusCodes.CREATED, 'Dispatched Successfully', {});
        return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});