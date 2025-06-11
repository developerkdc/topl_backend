import mongoose from "mongoose";
import { packing_done_other_details_model } from "../../database/schema/packing/packing_done/packing_done.schema.js";
import ApiError from "../../utils/errors/apiError.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { StatusCodes } from "../../utils/constants.js";

export const packing_done_customer_dropdown = catchAsync(
    async (req, res, next) => {
        const { id } = req.params;

        if (!id && !mongoose.isValidObjectId(id)) {
            throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
        }

        const pipeline = [
            {
                $match: {
                    customer_id: mongoose.Types.ObjectId.createFromHexString(id),
                },
            },
            {
                $project: {
                    packing_id: 1,
                    packing_date: 1,
                    customer_details: 1,
                    order_category: 1,
                    product_type: 1,
                }
            }
        ];
        const result = await packing_done_other_details_model.aggregate(pipeline);
        const dispatchItem = result?.[0];

        const response = new ApiResponse(
            StatusCodes.OK,
            'Dispatch Item Details Fetched Successfully',
            dispatchItem
        );

        return res.status(StatusCodes.OK).json(response);
    }
);