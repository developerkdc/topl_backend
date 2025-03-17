import mongoose, { isValidObjectId } from 'mongoose';
import { log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { veneer_inventory_items_model } from '../../../database/schema/inventory/venner/venner.schema.js';

export const fetch_all_log_no_by_item_name = catchAsync(async (req, res) => {
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
            { log_code: order_item_data?.log_no },
        ];
    } else if (order_item_data?.item_name) {
        search_query['item_name'] = order_item_data?.item_name;
    }

    const match_query = {
        ...search_query,
        total_sq_meter: {
            $lte: order_item_data?.sqm,
            $gt: 0
        },
        issue_status: null,
    };
    const pipeline = [
        { $match: { ...match_query } },
        {
            $group: {
                _id: "$log_code"
            }
        },
        {
            $project: {
                "_id": 0,
                log_code: "$_id",
            },
        },
    ];

    const result = await veneer_inventory_items_model
        ?.aggregate(pipeline)
        .collation({ caseLevel: true, locale: 'en' });

    const response = new ApiResponse(
        StatusCodes.OK,
        'Log No Dropdown fetched successfully',
        result
    );
    return res.status(StatusCodes.OK).json(response);
});

export const fetch_all_pallet_no_by_log_no = catchAsync(async (req, res) => {
    const { log_no } = req.params;

    if (!log_no) {
        throw new ApiError('Log No is missing', StatusCodes.BAD_REQUEST);
    }


    const pipeline = [
        {
            $match: {
                log_code: log_no,

            }
        },
        {
            $group: {
                _id: "$pallet_number"
            }
        }, {
            $project: {
                "_id": 0,
                pallet_number: "$_id"
            }
        }
    ]
    const result = await veneer_inventory_items_model.aggregate(pipeline);
    const response = new ApiResponse(
        StatusCodes.OK,
        'Pallet Number Dropdown fetched successfully',
        result
    );
    return res.status(StatusCodes.OK).json(response);
});
export const fetch_all_bundles_by_pallet_number = catchAsync(async (req, res) => {
    const { pallet_number } = req.params;

    if (!pallet_number) {
        throw new ApiError('Bundle Number is missing', StatusCodes.BAD_REQUEST);
    }

    const match__query = {
        $match: {
            pallet_number: pallet_number
        },
    }
    const aggProject = {
        $project: {
            bundle_number: 1
        }
    };
    const result = await veneer_inventory_items_model.aggregate([match__query, aggProject]);
    const response = new ApiResponse(
        StatusCodes.OK,
        'Pallet Number Dropdown fetched successfully',
        result
    );
    return res.status(StatusCodes.OK).json(response);
});
export const fetch_veneer_details_by_bundle_id = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const veneer_item_details = await veneer_inventory_items_model.findById(id);
    const response = new ApiResponse(
        StatusCodes.OK,
        'Veneer Item Details fetched successfully',
        veneer_item_details
    );
    return res.status(StatusCodes.OK).json(response);
});
