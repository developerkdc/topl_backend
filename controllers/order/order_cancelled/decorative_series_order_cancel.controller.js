import mongoose from "mongoose";
import { OrderModel } from "../../../database/schema/order/orders.schema.js";
import { item_issued_for, order_category, order_item_status, order_status } from "../../../database/Utils/constants/constants.js";
import { StatusCodes } from "../../../utils/constants.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js"
import photoModel from "../../../database/schema/masters/photo.schema.js";


class DecorativeSeriesOrderCancelController {

    static common_fields = {
        order_id: "order_id",
        order_item_id: "order_item_id",
        issued_for: "issued_for",
        pipeline: []
    }

    static group_no_lookup = function (localField) {
        return [
            {
                $lookup: {
                    from: "grouping_done_items_details",
                    localField: localField,
                    foreignField: "_id",
                    as: "grouping_done_items_details",
                },
            },
            {
                $unwind: {
                    path: "$grouping_done_items_details",
                    preserveNullAndEmptyArrays: true,
                },
            }
        ]
    }

    // {
    //     collection_name:{
    //         fields: collection_fields_name
    //     }
    // } // structure for issued for order items
    static issued_for_order_items = {
        // grouping
        "grouping_done_history": {
            ...common_fields
        },
        // tapping
        "issue_for_tappings": {
            ...common_fields
        },
        "tapping_done_items_details": {
            ...common_fields
        },
        "tapping_done_history": {
            ...common_fields
        },
        //pressing
        "issues_for_pressings": {
            ...common_fields
        },
    }

    static order_item_collections = {
        [order_category?.decorative]: "decorative_order_item_details",
        [order_category?.series_product]: "series_product_order_item_details",
    }

    validate_fields = (fields, validate_for) => {
        const { order_id, order_item_id, order_category } = fields;
        if (!order_id || !mongoose.isValidObjectId(order_id)) {
            throw new ApiError("Order ID is required or invalid Order ID", StatusCodes.BAD_REQUEST);
        };
        if (validate_for === "order_item") {
            if (!order_item_id || !mongoose.isValidObjectId(order_item_id)) {
                throw new ApiError("Order Item ID is required or invalid Order Item ID", StatusCodes.BAD_REQUEST);
            };
        }
        if (!order_category) {
            throw new ApiError("Order Category is required", StatusCodes.BAD_REQUEST);
        };

        if (![order_category.decorative, order_category.series_product].includes(order_category)) {
            throw new ApiError("Invalid Order Category", StatusCodes.BAD_REQUEST);
        };
    }

    static fetch_order_details = (async ({ order_id, order_category }) => {
        try {
            // Fetch order details logic here
            await this.validate_fields({ order_id, order_category }, "order");

            const match_query = {
                _id: new mongoose.Types.ObjectId.createFromHexString(order_id),
                order_category: order_category
            }
            const lookup_order_items = {
                $lookup: {
                    from: this.order_item_collections[order_category],
                    localField: "_id",
                    foreignField: "order_id",
                    as: "order_items_details",
                },
            }

            const [fetch_order_details] = await OrderModel.aggregate([
                match_query,
                lookup_order_items,
            ]);

            if (!fetch_order_details) {
                throw new ApiError("Order not found", StatusCodes.NOT_FOUND);
            }

            if (fetch_order_details.order_status === order_status.cancelled) {
                throw new ApiError("Order is already cancelled", StatusCodes.BAD_REQUEST);
            }

            return fetch_order_details;
        } catch (error) {
            throw error;
        }
    });

    static fetch_order_item_details = (async ({ order_id, order_item_id, order_category }) => {
        try {
            await this.validate_fields({ order_id, order_item_id, order_category }, "order_item");

            const match_query = {
                _id: new mongoose.Types.ObjectId.createFromHexString(order_item_id),
                order_id: new mongoose.Types.ObjectId.createFromHexString(order_id),
            }
            const lookup_order = {
                $lookup: {
                    from: "orders",
                    localField: "order_id",
                    foreignField: "_id",
                    as: "order_details",
                },
            }

            const [fetch_order_item_details] = await mongoose.model(order_category).aggregate([
                match_query,
                lookup_order,
            ]);

            if (!fetch_order_item_details) {
                throw new ApiError("Order not found", StatusCodes.NOT_FOUND);
            }

            if (fetch_order_item_details.item_status === order_item_status.cancelled) {
                throw new ApiError("Order is already cancelled", StatusCodes.BAD_REQUEST);
            }
        } catch (error) {
            throw error;
        }
    });

    static available_for_stock_for_issued_order = (async ({ order_id, order_item_id, order_category }, session) => {
        try {
            await this.validate_fields({ order_id, order_item_id, order_category }, "order_item");

            for (let ele in this.issued_for_order_items) {
                const data = this.issued_for_order_items[ele];

                const fetch_issued_items = await mongoose.model(ele).aggregate([
                    {
                        $match: {
                            [data.order_id]: new mongoose.Types.ObjectId.createFromHexString(order_id),
                            [data.order_item_id]: new mongoose.Types.ObjectId.createFromHexString(order_item_id),
                            [data.issued_for]: item_issued_for.order,
                        }
                    },
                    ...data.pipeline || [],
                ]).session(session).json();

                for (let item of fetch_issued_items) {
                    const group_photo_number_id = item?.grouping_done_items_details?.photo_no_id?.toString();
                    const group_photo_number = item?.grouping_done_items_details?.photo_no;

                    const update_photo_sheets = await photoModel.updateOne({
                        _id: group_photo_number_id,
                        photo_number: group_photo_number,
                    }, {
                        $inc: { available_no_of_sheets: item?.no_of_sheets }
                    }, { session });

                    if (!update_photo_sheets?.acknowledged) {
                        throw new ApiError(
                            `Photo number ${order_photo_number} does not have enough sheets.`,
                            StatusCodes.BAD_REQUEST
                        );
                    }
                }

                const update_document = await mongoose.model(ele).updateMany(
                    {
                        [data.order_id]: new mongoose.Types.ObjectId.createFromHexString(order_id),
                        [data.order_item_id]: new mongoose.Types.ObjectId.createFromHexString(order_item_id),
                        [data.issued_for]: item_issued_for.order,
                    },
                    {
                        $set: {
                            [data.order_id]: null,
                            [data.order_item_id]: null,
                            [data.issued_for]: item_issued_for.stock,
                        }
                    },
                    { session: session }
                );

                if (update_document?.matchedCount <= 0) {
                    throw new ApiError(`No issued items found for ${ele}`, StatusCodes.NOT_FOUND);
                }

                if (!update_document?.acknowledged || update_document?.modifiedCount <= 0) {
                    throw new ApiError(`Failed to update issued items for ${ele}`, StatusCodes.INTERNAL_SERVER_ERROR);
                }
            }
        } catch (error) {
            throw error
        }
    });

    static cancel_order = (async ({ order_id, order_category }) => {

        try {
            const order_details = await this.fetch_order_details({ order_id, order_category });

            for (let items in order_details?.order_items_details) {
                await this.available_for_stock_for_issued_order({
                    order_id,
                    order_item_id: items?._id,
                    order_category
                })
            };

            const cancel_order_status = await OrderModel.updateOne({ _id: order_id }, {
                $set: {
                    order_status: order_status.cancelled
                }
            }, { session });

            if(cancel_order_status?.matchedCount <= 0){
                throw new ApiError(`No order found for ${order_id}`, StatusCodes.NOT_FOUND);
            }
            if (!cancel_order_status?.acknowledged || cancel_order_status?.modifiedCount <= 0){
                throw new ApiError(`Failed to cancel order ${order_id}`, StatusCodes.INTERNAL_SERVER_ERROR);
            }

        } catch (error) {
            throw error
        }
    });

    static cancel_order_item = (async () => {
        // Cancel order logic here
    });


}
