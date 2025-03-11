import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import mongoose, { isValidObjectId } from 'mongoose';
import { face_inventory_items_details, face_inventory_items_view_modal } from '../../../database/schema/inventory/face/face.schema.js';

//fetching all pallet no dropdown
export const fetch_all_face_inward_sr_no_by_order_item_name = catchAsync(async (req, res) => {
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
        number_of_sheets: {
            $lte: order_item_data.no_of_sheet,
        },
    };

    const pipeline = [
        { $match: { ...match_query } },
        {
            $project: {
                "face_invoice_details.inward_sr_no": 1,
            },
        },
    ];

    const result = await face_inventory_items_view_modal
        ?.aggregate(pipeline)
        .collation({ caseLevel: true, locale: 'en' });

    const response = new ApiResponse(
        StatusCodes.OK,
        'Inward Sr.No Dropdown fetched successfully',
        result
    );
    return res.status(StatusCodes.OK).json(response);
});
export const fetch_all_face_sr_no_by_inward_sr_no = catchAsync(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const match_query = {
        invoice_id: mongoose.Types.ObjectId.createFromHexString(id)
    };

    const pipeline = [
        { $match: { ...match_query } },
        {
            $project: {
                item_sr_no: 1,
            },
        },
    ];

    const result = await face_inventory_items_details.aggregate(pipeline).collation({ caseLevel: true, locale: 'en' });

    const response = new ApiResponse(
        StatusCodes.OK,
        'Item Sr.No Dropdown fetched successfully',
        result
    );
    return res.status(StatusCodes.OK).json(response);
});

// fetching plywood details by pallet_no
export const fetch_face_details_by_id = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const result = await face_inventory_items_details.findById(id);
    const response = new ApiResponse(
        StatusCodes.OK,
        'Face Item Details fetched successfully',
        result
    );
    return res.status(StatusCodes.OK).json(response);
});
