import mongoose from "mongoose";
import { OrderModel } from "../../../database/schema/order/orders.schema";
import ApiResponse from "../../../utils/ApiResponse";
import { StatusCodes } from "../../../utils/constants";
import series_product_order_item_details_model from "../../../database/schema/order/series_product_order_item_details.schema";

export const add_series_order = catchAsync(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction()
    try {
        const { order_details, item_details } = req.body
        const userDetails = req.userDetails;
        for (let field of ['order_details', 'item_details']) {
            if (!req.body[field]) {
                throw new ApiError(`${field} is required`, StatusCodes?.NOT_FOUND);
            }
        };
        if (!Array.isArray(item_details)) {
            throw new ApiError("Item details must be an array", StatusCodes.BAD_REQUEST)
        };
        const max_order_no = await OrderModel.findOne({}, { order_no: 1 }).sort({ order_no: -1 });

        const new_order_no = max_order_no ? max_order_no?.order_no + 1 : 1
        const [order_details_data] = await OrderModel.create([{
            ...order_details,
            order_no: new_order_no,
            created_by: userDetails?._id,
            updated_by: userDetails?._id
        }], { session })

        if (!order_details_data) {
            throw new ApiError("Failed to add order details", StatusCodes.BAD_REQUEST)
        };

        const updated_item_details = item_details?.map((item) => {
            item.order_id = order_details_data?._id;
            item.created_by = userDetails?._id
            item.updated_by = userDetails?._id;
            return item
        });

        const create_order_result = await series_product_order_item_details_model.insertMany(updated_item_details, { session });
        if (create_order_result?.length === 0) {
            throw new ApiError("Failed to add order item details", StatusCodes?.BAD_REQUEST)
        };

        await session.commitTransaction()
        const response = new ApiResponse(StatusCodes.CREATED, "Order Created Successfully.", { order_details, item_details });

        return res.status(StatusCodes.CREATED).json(response)
    } catch (error) {
        await session?.abortTransaction()
        throw error;
    } finally {
        await session.endSession()
    }
})

export const update_series_order = catchAsync(async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction();
    try {
        const { order_details_id } = req.params;

        const { order_details, item_details } = req.body;
        const userDetails = req.userDetails

        for (let field of ["order_details", "item_details"]) {
            if (!req.body[field]) {
                throw new ApiError(`${field} is required`, StatusCodes?.NOT_FOUND);
            }
        };
        if (!Array.isArray(item_details)) {
            throw new ApiError("Item details must be an array", StatusCodes.BAD_REQUEST)
        };

        const order_details_result = await OrderModel.findOneAndUpdate({ _id: order_details_id }, {
            $set: {
                ...order_details,
                updated_by: userDetails?._id
            }
        }, { session, runValidators: true, new: true });
        if (!order_details_result) {
            throw new ApiError("Failed to Update order details data.", StatusCodes.BAD_REQUEST)
        };


        const delete_order_items = await series_product_order_item_details_model?.deleteMany({ order_id: order_details_result?._id }, { session });

        if (!delete_order_items?.acknowledged || delete_order_items?.deletedCount === 0) {
            throw new ApiError("Failed to delete item details", StatusCodes.BAD_REQUEST)
        };

        const updated_item_details = item_details?.map((item) => {
            item.order_id = order_details_result?._id;
            item.created_by = item.created_by ? item.created_by : userDetails?._id;
            item.updated_by = userDetails?._id;
            item.createdAt = item.createdAt ? item.createdAt : new Date();
            item.updatedAt = new Date();
            return item
        });

        const create_order_result = await series_product_order_item_details_model?.insertMany(updated_item_details, { session });
        if (create_order_result?.length === 0) {
            throw new ApiError("Failed to add order item details", StatusCodes?.BAD_REQUEST)
        };

        await session?.commitTransaction()
        const response = new ApiResponse(StatusCodes.OK, "Order Updated Successfully.", { order_details, item_details });
        return res.status(StatusCodes.OK).json(response)
    } catch (error) {
        await session?.abortTransaction()
        throw error
    } finally {
        await session?.endSession()
    }
})


export const update_order_item_status_by_item_id = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { _id } = req.userDetails

    const update_result = await series_product_order_item_details_model?.updateOne({ _id: id }, {
        $set: {
            item_status: order_item_status?.cancel,
            updated_by: _id
        }
    });

    if (update_result?.matchedCount === 0) {
        throw new ApiError("Order Item Not found", StatusCodes?.NOT_FOUND)
    };

    if (!update_result?.acknowledged || update_result?.modifiedCount === 0) {
        throw new ApiError("Failed to update order item status", StatusCodes.BAD_REQUEST)
    };

    const response = new ApiResponse(StatusCodes.OK, "Order Item Cancelled Successfully", update_result);
    return res.status(StatusCodes.OK).json(response)
});
