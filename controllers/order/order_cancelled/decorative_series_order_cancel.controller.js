import mongoose from "mongoose";
import { OrderModel } from "../../../database/schema/order/orders.schema.js";
import { item_issued_for, order_category, order_item_status, order_status } from "../../../database/Utils/constants/constants.js";
import { StatusCodes } from "../../../utils/constants.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js"
import photoModel from "../../../database/schema/masters/photo.schema.js";
import ApiResponse from "../../../utils/ApiResponse.js";


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
                    from: 'grouping_done_items_details',
                    localField: localField,
                    foreignField: 'group_no',
                    pipeline: [
                        {
                            $project: {
                                group_no: 1,
                                photo_no: 1,
                                photo_no_id: 1,
                            },
                        },
                    ],
                    as: 'grouping_done_items_details',
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
    //         fields: collection_fields_name,
    //         pipiline: mongodb aggregaration pipline,
    //         related_collection: history 
    //     }
    // } // structure for issued for order items


    static issued_for_order_items = {
        // grouping
        // tapping
        "issue_for_tappings": {
            ...this.common_fields,
            pipeline: [
                ...this.group_no_lookup("group_no"),
            ],
            related_collection: {
                "grouping_done_history": {
                    ...this.common_fields,
                    pipeline: [
                        ...this.group_no_lookup("group_no"),
                    ]
                },
            }
        },
        "tapping_done_items_details": {
            ...this.common_fields,
            pipeline: [
                ...this.group_no_lookup("group_no"),
            ]
        },
        //pressing
        "issues_for_pressings": {
            ...this.common_fields,
            pipeline: [
                ...this.group_no_lookup("group_no"),
            ],
            related_collection: {
                "tapping_done_history": {
                    ...this.common_fields,
                    pipeline: [
                        ...this.group_no_lookup("group_no"),
                    ]
                },
            }
        },
    }

    static order_item_collections = {
        [order_category?.decorative]: "decorative_order_item_details",
        [order_category?.series_product]: "series_product_order_item_details",
    }

    static validate_fields(fields, validate_for) {
        if (!fields?.order_id || !mongoose.isValidObjectId(fields?.order_id)) {
            throw new ApiError("Order ID is required or invalid Order ID", StatusCodes.BAD_REQUEST);
        };
        if (validate_for === "order_item") {
            if (!fields?.order_item_id || !mongoose.isValidObjectId(fields?.order_item_id)) {
                throw new ApiError("Order Item ID is required or invalid Order Item ID", StatusCodes.BAD_REQUEST);
            };
        }
        if (!fields?.order_category) {
            throw new ApiError("Order Category is required", StatusCodes.BAD_REQUEST);
        };

        if (![order_category.decorative, order_category.series_product].includes(fields?.order_category)) {
            throw new ApiError("Invalid Order Category", StatusCodes.BAD_REQUEST);
        };
    }

    static fetch_order_details = (async ({ order_id, order_category }) => {
        try {
            // Fetch order details logic here
            this.validate_fields({ order_id, order_category }, "order");

            const match_query = {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(order_id),
                    order_category: order_category
                }
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
            this.validate_fields({ order_id, order_item_id, order_category }, "order_item");

            const match_query = {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(order_item_id),
                    order_id: mongoose.Types.ObjectId.createFromHexString(order_id),
                }
            }
            const lookup_order = {
                $lookup: {
                    from: "orders",
                    localField: "order_id",
                    foreignField: "_id",
                    as: "order_details",
                },
            }
            const unwind_order = {
                $unwind: {
                    path: "$order_details",
                    preserveNullAndEmptyArrays: true,
                },
            }

            const [fetch_order_item_details] = await mongoose.model(this.order_item_collections[order_category]).aggregate([
                match_query,
                lookup_order,
                unwind_order
            ]);

            if (!fetch_order_item_details) {
                throw new ApiError("Order item not found", StatusCodes.NOT_FOUND);
            }

            if (fetch_order_item_details.item_status === order_item_status.cancelled) {
                throw new ApiError("Order item is already cancelled", StatusCodes.BAD_REQUEST);
            }

            return fetch_order_item_details;
        } catch (error) {
            throw error;
        }
    });

    static available_for_stock_for_issued_order = (async ({ order_id, order_item_id, order_category, other_details }, session = null) => {
        try {
            this.validate_fields({ order_id, order_item_id, order_category }, "order_item");

            const revert_photo_quantity_and_make_avaiable_for_stock = async function (model_name, data, related_collection = false) {
                const fetch_issued_items = await mongoose.model(model_name).aggregate([
                    {
                        $match: {
                            [data.order_id]: mongoose.Types.ObjectId.createFromHexString(order_id),
                            [data.order_item_id]: mongoose.Types.ObjectId.createFromHexString(order_item_id),
                            [data.issued_for]: item_issued_for.order,
                        }
                    },
                    {
                        $lookup: {
                            from: "orders",
                            localField: "order_id",
                            foreignField: "_id",
                            as: "order_details",
                        },
                    },
                    {
                        $unwind: {
                            path: "$order_details",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    ...data.pipeline || [],
                ]);

                if (!related_collection) {
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
                }

                const update_document = await mongoose.model(model_name).updateMany(
                    {
                        [data.order_id]: mongoose.Types.ObjectId.createFromHexString(order_id),
                        [data.order_item_id]: mongoose.Types.ObjectId.createFromHexString(order_item_id),
                        [data.issued_for]: item_issued_for.order,
                    },
                    {
                        $set: {
                            [data.order_id]: null,
                            [data.order_item_id]: null,
                            order_category: null,
                            [data.issued_for]: item_issued_for.stock,
                            remark: `Order (${other_details?.order_no})(${other_details?.order_item_no}) cancelled`
                        }
                    },
                    { session: session }
                );

                if (!update_document?.acknowledged) {
                    throw new ApiError(`Failed to update issued items for ${model_name}`, StatusCodes.INTERNAL_SERVER_ERROR);
                }
            }

            for (let ele in this.issued_for_order_items) {
                const data = this.issued_for_order_items[ele];
                await revert_photo_quantity_and_make_avaiable_for_stock(ele, data);

                if (data?.related_collection && typeof data?.related_collection === "object") {
                    for (let ele in data?.related_collection) {
                        const related_data = data?.related_collection[ele];
                        await revert_photo_quantity_and_make_avaiable_for_stock(ele, related_data, true);
                    }
                }
            }

            const cancel_order_item_status = await mongoose.model(this.order_item_collections[order_category]).updateOne({
                order_id: order_id,
                _id: order_item_id
            }, {
                $set: {
                    item_status: order_item_status.cancelled,
                    updated_by: other_details?.userDetails?._id
                }
            }, { session });

            if (cancel_order_item_status?.matchedCount <= 0) {
                throw new ApiError(`No order item found for (${other_details?.order_no})(${other_details?.order_item_no})`, StatusCodes.NOT_FOUND);
            }
            if (!cancel_order_item_status?.acknowledged || cancel_order_item_status?.modifiedCount <= 0) {
                throw new ApiError(`Failed to cancel order item (${other_details?.order_no})(${other_details?.order_item_no})`, StatusCodes.INTERNAL_SERVER_ERROR);
            }
        } catch (error) {
            throw error
        }
    });

    static cancel_order = catchAsync(async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const userDetails = req.userDetails;
            const { order_id, order_category } = req.body;
            this.validate_fields({ order_id, order_category }, "order");

            const order_details = await this.fetch_order_details({ order_id, order_category });

            for (let items of order_details?.order_items_details) {

                await this.available_for_stock_for_issued_order({
                    order_id: items?.order_id?.toString(),
                    order_item_id: items?._id?.toString(),
                    order_category: order_details?.order_category,
                    other_details: {
                        order_no: order_details?.order_no,
                        order_item_no: items?.item_no,
                        userDetails: userDetails
                    }
                }, session);
            };

            const cancel_order_status = await OrderModel.updateOne({ _id: order_id }, {
                $set: {
                    order_status: order_status.cancelled,
                    updated_by: userDetails._id
                }
            }, { session });

            if (cancel_order_status?.matchedCount <= 0) {
                throw new ApiError(`No order found for ${order_id}`, StatusCodes.NOT_FOUND);
            }
            if (!cancel_order_status?.acknowledged || cancel_order_status?.modifiedCount <= 0) {
                throw new ApiError(`Failed to cancel order ${order_id}`, StatusCodes.INTERNAL_SERVER_ERROR);
            }

            await session.commitTransaction();
            const response = new ApiResponse(
                StatusCodes.OK,
                'Order Cancelled Successfully.',
                {
                    order_details: order_details
                }
            );

            return res.status(response.statusCode).json(response);

        } catch (error) {
            await session?.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    });

    static cancel_order_item = catchAsync(async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const userDetails = req.userDetails;
            const { order_id, order_item_id, order_category } = req.body;
            this.validate_fields({ order_id, order_item_id, order_category }, "order_item");

            const order_item_details = await this.fetch_order_item_details({ order_id, order_item_id, order_category });

            await this.available_for_stock_for_issued_order({
                order_id: order_item_details?.order_id?.toString(),
                order_item_id: order_item_details?._id?.toString(),
                order_category: order_item_details?.order_details?.order_category,
                other_details: {
                    order_no: order_item_details?.order_details?.order_no,
                    order_item_no: order_item_details?.item_no,
                    userDetails: userDetails
                }
            }, session);

            await session.commitTransaction();
            const response = new ApiResponse(
                StatusCodes.OK,
                'Order Item Cancelled Successfully.',
                {
                    order_item_details: order_item_details
                }
            );

            return res.status(response.statusCode).json(response);

        } catch (error) {
            await session?.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    });
}

export default DecorativeSeriesOrderCancelController;
