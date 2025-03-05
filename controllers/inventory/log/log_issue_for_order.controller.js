import mongoose, { isValidObjectId } from 'mongoose';
import { log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';

export const fetch_all_log_no_item_name = catchAsync(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const order_item_data = await RawOrderItemDetailsModel.findById(id);

    if (!order_item_data) {
        throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
    }

    const search_query = {};

    if (order_item_data?.item_name && order_item_data?.log_no) {
        search_query['$and'] = [
            { item_name: order_item_data?.item_name },
            { log_no: order_item_data?.log_no },
        ];
    } else if (order_item_data?.item_name) {
        search_query['item_name'] = order_item_data?.item_name;
    }

    const match_query = {
        ...search_query,
        physical_cmt: {
            $lte: order_item_data?.cbm,
        },
        issue_status: null,
    };
    const pipeline = [
        { $match: { ...match_query } },
        {
            $project: {
                log_no: 1,
            },
        },
    ];

    const result = await log_inventory_items_model
        ?.aggregate(pipeline)
        .collation({ caseLevel: true, locale: 'en' });

    const response = new ApiResponse(
        StatusCodes.OK,
        'Log No Dropdown fetched successfully',
        result
    );
    return res.status(StatusCodes.OK).json(response);
});

export const fetch_log_details_by_log_no = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const log_item_details = await log_inventory_items_model.findById(id);
    const response = new ApiResponse(
        StatusCodes.OK,
        'Log Item Details fetched successfully',
        log_item_details
    );
    return res.status(StatusCodes.OK).json(response);
});
