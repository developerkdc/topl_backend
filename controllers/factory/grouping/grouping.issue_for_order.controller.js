import { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { grouping_done_items_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';

export const fetch_all_group_no_by_item_name = catchAsync(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const order_item_data = await RawOrderItemDetailsModel.findById(id);

    if (!order_item_data) {
        throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
    }

    const search_query = {};

    if (order_item_data?.item_name) {
        search_query['item_name'] = order_item_data?.item_name;
    }

    const match_query = {
        ...search_query,
        "available_details.no_of_leaves": {
            $gt: 0,
        },
        // issue_status: null,
        // "invoice_details.approval_status.sendForApproval.status": false
    };
    const pipeline = [
        { $match: { ...match_query } },
        {
            $project: {
                group_no: 1
            },
        },
    ];

    const result = await grouping_done_items_details_model.aggregate(pipeline)

    const response = new ApiResponse(
        StatusCodes.OK,
        'Group No Dropdown fetched successfully',
        result
    );
    return res.status(StatusCodes.OK).json(response);
});


export const fetch_group_details_by_id = catchAsync(
    async (req, res) => {
        const { id } = req.params;

        if (!id || !isValidObjectId(id)) {
            throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
        }

        const result = await grouping_done_items_details_model.findById(id);
        const response = new ApiResponse(
            StatusCodes.OK,
            'Group Details fetched successfully',
            result
        );
        return res.status(StatusCodes.OK).json(response);
    }
);
