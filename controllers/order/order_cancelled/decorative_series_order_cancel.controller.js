import mongoose from 'mongoose';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import {
    item_issued_for,
    item_issued_from,
    order_category,
    order_item_status,
    order_status,
} from '../../../database/Utils/constants/constants.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import finished_ready_for_packing_model from '../../../database/schema/packing/issue_for_packing/finished_ready_for_packing/finished_ready_for_packing.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { cnc_done_details_model } from '../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';
import { bunito_done_details_model } from '../../../database/schema/factory/bunito/bunito_done/bunito_done.schema.js';
import { color_done_details_model } from '../../../database/schema/factory/colour/colour_done/colour_done.schema.js';
import { canvas_done_details_model } from '../../../database/schema/factory/canvas/canvas_done/canvas_done.schema.js';
import { polishing_done_details_model } from '../../../database/schema/factory/polishing/polishing_done/polishing_done.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import cnc_history_model from '../../../database/schema/factory/cnc/cnc_history/cnc.history.schema.js';
import bunito_history_model from '../../../database/schema/factory/bunito/bunito_history/bunito.history.schema.js';
import color_history_model from '../../../database/schema/factory/colour/colour_history/colour_history.schema.js';
import canvas_history_model from '../../../database/schema/factory/canvas/canvas_history/canvas.history.schema.js';
import polishing_history_model from '../../../database/schema/factory/polishing/polishing_history/polishing.history.schema.js';

class DecorativeSeriesOrderCancelController {
    static common_fields = {
        order_id: 'order_id',
        order_item_id: 'order_item_id',
        issued_for: 'issued_for',
        pipeline: [],
    };
    static issued_from_map = {
        [item_issued_from?.pressing_factory]: pressing_done_details_model,
        [item_issued_from?.cnc_factory]: cnc_done_details_model,
        [item_issued_from?.bunito_factory]: bunito_done_details_model,
        [item_issued_from?.color_factory]: color_done_details_model,
        [item_issued_from?.canvas_factory]: canvas_done_details_model,
        [item_issued_from?.polishing_factory]: polishing_done_details_model,
    };
    static issued_from_history_map = {
        [item_issued_from?.pressing_factory]: pressing_done_history_model,
        [item_issued_from?.cnc_factory]: cnc_history_model,
        [item_issued_from?.bunito_factory]: bunito_history_model,
        [item_issued_from?.color_factory]: color_history_model,
        [item_issued_from?.canvas_factory]: canvas_history_model,
        [item_issued_from?.polishing_factory]: polishing_history_model,
    };

    // {
    //     collection_name:{
    //         fields: collection_fields_name,
    //         pipiline: mongodb aggregaration pipline,
    //     }
    // } // structure for issued for order items

    static issued_for_order_items = {
        // grouping
        grouping_done_history: {
            ...this.common_fields,
        },
        // tapping
        issue_for_tappings: {
            ...this.common_fields,
        },
        tapping_done_items_details: {
            ...this.common_fields,
        },
        tapping_done_history: {
            ...this.common_fields,
        },
        //pressing
        issues_for_pressings: {
            ...this.common_fields,
        },
        pressing_done_details: {
            ...this.common_fields,
        },
        pressing_done_history: {
            ...this.common_fields,
        },
        // CNC
        issued_for_cnc_details: {
            ...this.common_fields,
        },
        cnc_history_details: {
            ...this.common_fields,
        },
        //color
        issued_for_color_details: {
            ...this.common_fields,
        },
        color_history_details: {
            ...this.common_fields,
        },
        //bunito
        issued_for_bunito_details: {
            ...this.common_fields,
        },
        bunito_history_details: {
            ...this.common_fields,
        },
        //polishing
        issued_for_polishing_details: {
            ...this.common_fields,
        },
        polishing_history_details: {
            ...this.common_fields,
        },
        //canvas
        issued_for_canvas_details: {
            ...this.common_fields,
        },
        canvas_history_details: {
            ...this.common_fields,
        },
        //canvas
        issued_for_canvas_details: {
            ...this.common_fields,
        },
        canvas_history_details: {
            ...this.common_fields,
        },
    };

    static order_item_collections = {
        [order_category?.decorative]: 'decorative_order_item_details',
        [order_category?.series_product]: 'series_product_order_item_details',
    };

    static validate_fields(fields, validate_for) {
        if (!fields?.order_id || !mongoose.isValidObjectId(fields?.order_id)) {
            throw new ApiError(
                'Order ID is required or invalid Order ID',
                StatusCodes.BAD_REQUEST
            );
        }
        if (validate_for === 'order_item') {
            if (
                !fields?.order_item_id ||
                !mongoose.isValidObjectId(fields?.order_item_id)
            ) {
                throw new ApiError(
                    'Order Item ID is required or invalid Order Item ID',
                    StatusCodes.BAD_REQUEST
                );
            }
        }
        if (!fields?.order_category) {
            throw new ApiError('Order Category is required', StatusCodes.BAD_REQUEST);
        }

        if (
            ![order_category.decorative, order_category.series_product].includes(
                fields?.order_category
            )
        ) {
            throw new ApiError('Invalid Order Category', StatusCodes.BAD_REQUEST);
        }
    }

    static fetch_order_details = async ({ order_id, order_category }) => {
        try {
            // Fetch order details logic here
            this.validate_fields({ order_id, order_category }, 'order');

            const match_query = {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(order_id),
                    order_category: order_category,
                },
            };
            const lookup_order_items = {
                $lookup: {
                    from: this.order_item_collections[order_category],
                    localField: '_id',
                    foreignField: 'order_id',
                    pipeline: [
                        {
                            $match: {
                                item_status: null,
                            },
                        },
                    ],
                    as: 'order_items_details',
                },
            };

            const [fetch_order_details] = await OrderModel.aggregate([
                match_query,
                lookup_order_items,
            ]);

            if (!fetch_order_details) {
                throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
            }

            if (fetch_order_details.order_status === order_status.cancelled) {
                throw new ApiError(
                    'Order is already cancelled',
                    StatusCodes.BAD_REQUEST
                );
            }
            if (fetch_order_details.order_status === order_status.closed) {
                throw new ApiError('Order is already closed', StatusCodes.BAD_REQUEST);
            }

            return fetch_order_details;
        } catch (error) {
            throw error;
        }
    };

    static fetch_order_item_details = async ({
        order_id,
        order_item_id,
        order_category,
    }) => {
        try {
            this.validate_fields(
                { order_id, order_item_id, order_category },
                'order_item'
            );

            const match_query = {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(order_item_id),
                    order_id: mongoose.Types.ObjectId.createFromHexString(order_id),
                    item_status: null,
                },
            };
            const lookup_order = {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: '_id',
                    as: 'order_details',
                },
            };
            const unwind_order = {
                $unwind: {
                    path: '$order_details',
                    preserveNullAndEmptyArrays: true,
                },
            };

            const [fetch_order_item_details] = await mongoose
                .model(this.order_item_collections[order_category])
                .aggregate([match_query, lookup_order, unwind_order]);

            if (!fetch_order_item_details) {
                throw new ApiError('Order item not found', StatusCodes.NOT_FOUND);
            }

            if (
                fetch_order_item_details.item_status === order_item_status.cancelled
            ) {
                throw new ApiError(
                    'Order item is already cancelled',
                    StatusCodes.BAD_REQUEST
                );
            }
            if (fetch_order_item_details.item_status === order_item_status.closed) {
                throw new ApiError(
                    'Order item is already closed',
                    StatusCodes.BAD_REQUEST
                );
            }

            return fetch_order_item_details;
        } catch (error) {
            throw error;
        }
    };

    static available_for_stock_for_issued_order = async (
        order_data,
        session = null
    ) => {
        try {
            this.validate_fields(
                {
                    order_id: order_data?.order_id,
                    order_item_id: order_data?.order_item_id,
                    order_category: order_data?.order_category,
                },
                'order_item'
            );

            const cancel_order_item_status = await mongoose
                .model(this.order_item_collections[order_data?.order_category])
                .findOneAndUpdate(
                    {
                        order_id: order_data?.order_id,
                        _id: order_data?.order_item_id,
                    },
                    {
                        $set: {
                            item_status: order_item_status.cancelled,
                            updated_by: order_data?.other_details?.userDetails?._id,
                        },
                    },
                    { session }
                );

            if (!cancel_order_item_status) {
                throw new ApiError(
                    `Failed to cancel order item (${order_data?.other_details?.order_no})(${order_data?.other_details?.order_item_no})`,
                    StatusCodes.INTERNAL_SERVER_ERROR
                );
            }

            const order_item_photo_id = cancel_order_item_status?.photo_number_id;
            const order_item_photo_number = cancel_order_item_status?.photo_number;
            const order_no_of_sheets = cancel_order_item_status?.no_of_sheets;

            const update_photo_details = async function (
                photo_number_id,
                photo_number,
                no_of_sheets
            ) {
                const update_photo_sheets = await photoModel.updateOne(
                    {
                        _id: photo_number_id,
                        photo_number: photo_number,
                    },
                    {
                        $inc: { available_no_of_sheets: no_of_sheets },
                    },
                    { session }
                );

                if (!update_photo_sheets?.acknowledged) {
                    throw new ApiError(
                        `Photo number ${photo_number} falied to revert sheets.`,
                        StatusCodes.BAD_REQUEST
                    );
                }
            };

            if (order_item_photo_number && order_item_photo_id) {
                await update_photo_details(
                    order_item_photo_id,
                    order_item_photo_number,
                    order_no_of_sheets
                );
            }

            // for different group (decorative)
            if (order_data?.order_category === order_category?.decorative) {
                const different_group_photo_number =
                    cancel_order_item_status?.different_group_photo_number;
                const different_group_photo_number_id =
                    cancel_order_item_status?.different_group_photo_number_id;
                if (
                    different_group_photo_number &&
                    different_group_photo_number_id &&
                    order_item_photo_number !== different_group_photo_number &&
                    order_item_photo_id !== different_group_photo_number_id
                ) {
                    await update_photo_details(
                        different_group_photo_number_id,
                        different_group_photo_number,
                        order_no_of_sheets
                    );
                }
            }

            //function
            const make_avaiable_for_stock = async function (model_name, data) {
                const update_document = await mongoose.model(model_name).updateMany(
                    {
                        [data.order_id]: mongoose.Types.ObjectId.createFromHexString(
                            order_data?.order_id
                        ),
                        [data.order_item_id]: mongoose.Types.ObjectId.createFromHexString(
                            order_data?.order_item_id
                        ),
                        [data.issued_for]: item_issued_for.order,
                    },
                    {
                        $set: {
                            [data.order_id]: null,
                            [data.order_item_id]: null,
                            order_category: null,
                            [data.issued_for]: item_issued_for.stock,
                            remark: `Order (${order_data?.other_details?.order_no})(${order_data?.other_details?.order_item_no}) cancelled`,
                        },
                    },
                    { session: session }
                );

                if (!update_document?.acknowledged) {
                    throw new ApiError(
                        `Failed to update issued items for ${model_name}`,
                        StatusCodes.INTERNAL_SERVER_ERROR
                    );
                }
            };

            for (let ele in this.issued_for_order_items) {
                const data = this.issued_for_order_items[ele];
                await make_avaiable_for_stock(ele, data);
            }
        } catch (error) {
            throw error;
        }
    };

    // static revert_issue_for_packing_items = async (
    //     { order_id, order_item_id, order_category, user },
    //     session = null
    // ) => {
    //     const [finished_ready_for_packing_details] =
    //         await finished_ready_for_packing_model.aggregate([
    //             {
    //                 $match: {
    //                     order_id: mongoose.Types.ObjectId.createFromHexString(order_id),
    //                     order_item_id:
    //                         mongoose.Types.ObjectId.createFromHexString(order_item_id),
    //                     order_category: order_category,
    //                 },
    //             },
    //             {
    //                 $facet: {
    //                     not_packed: [
    //                         {
    //                             $match: {
    //                                 is_packing_done: false,
    //                             },
    //                         },
    //                     ],
    //                     packed: [
    //                         {
    //                             $match: {
    //                                 is_packing_done: true,
    //                             },
    //                         },
    //                         { $count: 'count' },
    //                     ],
    //                 },
    //             },
    //         ]);

    //     if (finished_ready_for_packing_details.length === 0) {
    //         return;
    //     }

    //     if (finished_ready_for_packing_details.packed?.[0]?.count > 0) {
    //         throw new ApiError(
    //             'Cannot cancel order item as some items are already packed.',
    //             StatusCodes.BAD_REQUEST
    //         );
    //     }
    //     for (let item of finished_ready_for_packing_details?.not_packed) {
    //         const issued_from_model = this.issued_from_map[item?.issued_from];
    //         if (!issued_from_model) {
    //             throw new ApiError(
    //                 StatusCodes.BAD_REQUEST,
    //                 'Invalid issued from type.'
    //             );
    //         }

    //         const issued_from_details = await issued_from_model
    //             .findById(item?.issued_from_id)
    //             .session(session);
    //         if (!issued_from_details) {
    //             throw new ApiError(
    //                 StatusCodes.NOT_FOUND,
    //                 'Issued from details not found.'
    //             );
    //         }

    //         const update_issued_item_details = await issued_from_model.updateOne(
    //             { _id: issued_from_details?._id },
    //             {
    //                 $inc: {
    //                     'available_details.no_of_sheets': Number(
    //                         Number(item?.no_of_sheets)?.toFixed(2)
    //                     ),
    //                     'available_details.sqm': Number(Number(item?.sqm)?.toFixed(3)),
    //                     'available_details.amount': Number(
    //                         Number(item?.amount)?.toFixed(2)
    //                     ),
    //                 },
    //                 $set: {
    //                     isEditable: true,
    //                     updated_by: user?._id,
    //                 },
    //             },
    //             { session }
    //         );

    //         if (update_issued_item_details?.matchedCount === 0) {
    //             throw new ApiError(
    //                 StatusCodes.NOT_FOUND,
    //                 'Issued item details not found for update.'
    //             );
    //         }

    //         if (
    //             !update_issued_item_details?.acknowledged ||
    //             update_issued_item_details?.modifiedCount === 0
    //         ) {
    //             throw new ApiError(
    //                 StatusCodes.INTERNAL_SERVER_ERROR,
    //                 'Failed to update issued item details.'
    //             );
    //         }

    //         const delete_finished_ready_for_packing_result =
    //             await finished_ready_for_packing_model
    //                 .deleteOne({ _id: item?._id })
    //                 .session(session);

    //         if (
    //             !delete_finished_ready_for_packing_result?.acknowledged ||
    //             delete_finished_ready_for_packing_result.deletedCount === 0
    //         ) {
    //             throw new ApiError(
    //                 StatusCodes.NOT_FOUND,
    //                 'Failed to delete finished ready for packing details.'
    //             );
    //         }

    //         const delete_history_result = await this.issued_from_history_map[
    //             item?.issued_from
    //         ]
    //             .deleteOne({
    //                 issued_for_id: item?._id,
    //             })
    //             .session(session);

    //         if (
    //             !delete_history_result?.acknowledged ||
    //             delete_history_result.deletedCount === 0
    //         ) {
    //             throw new ApiError(
    //                 StatusCodes.NOT_FOUND,
    //                 'Failed to delete history for issued item.'
    //             );
    //         }
    //     }
    // };

    static cancel_order = catchAsync(async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const userDetails = req.userDetails;
            const { order_id, order_category } = req.body;
            this.validate_fields({ order_id, order_category }, 'order');

            const order_details = await this.fetch_order_details({
                order_id,
                order_category,
            });

            for (let items of order_details?.order_items_details) {
                await this.available_for_stock_for_issued_order(
                    {
                        order_id: items?.order_id?.toString(),
                        order_item_id: items?._id?.toString(),
                        order_category: order_details?.order_category,
                        other_details: {
                            order_no: order_details?.order_no,
                            order_item_no: items?.item_no,
                            userDetails: userDetails,
                        },
                    },
                    session
                );
                // await this.revert_issue_for_packing_items(
                //     {
                //         order_id: items?.order_id?.toString(),
                //         order_item_id: items?._id?.toString(),
                //         order_category: order_details?.order_category,
                //         user: userDetails,
                //     },
                //     session
                // );
            }

            const cancel_order_status = await OrderModel.updateOne(
                { _id: order_id },
                {
                    $set: {
                        order_status: order_status.cancelled,
                        updated_by: userDetails._id,
                    },
                },
                { session }
            );

            if (cancel_order_status?.matchedCount <= 0) {
                throw new ApiError(
                    `No order found for ${order_id}`,
                    StatusCodes.NOT_FOUND
                );
            }
            if (
                !cancel_order_status?.acknowledged ||
                cancel_order_status?.modifiedCount <= 0
            ) {
                throw new ApiError(
                    `Failed to cancel order ${order_id}`,
                    StatusCodes.INTERNAL_SERVER_ERROR
                );
            }

            await session.commitTransaction();
            const response = new ApiResponse(
                StatusCodes.OK,
                'Order Cancelled Successfully.',
                {
                    order_details: order_details,
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
            this.validate_fields(
                { order_id, order_item_id, order_category },
                'order_item'
            );

            const order_item_details = await this.fetch_order_item_details({
                order_id,
                order_item_id,
                order_category,
            });

            await this.available_for_stock_for_issued_order(
                {
                    order_id: order_item_details?.order_id?.toString(),
                    order_item_id: order_item_details?._id?.toString(),
                    order_category: order_item_details?.order_details?.order_category,
                    other_details: {
                        order_no: order_item_details?.order_details?.order_no,
                        order_item_no: order_item_details?.item_no,
                        userDetails: userDetails?._id,
                    },
                },
                session
            );
            // await this.revert_issue_for_packing_items(
            //     {
            //         order_id: order_item_details?.order_id?.toString(),
            //         order_item_id: order_item_details?._id?.toString(),
            //         order_category: order_item_details?.order_details?.order_category,
            //         user: userDetails,
            //     },
            //     session
            // );

            // const fetch_order_item_closed = await mongoose.model(this.order_item_collections[order_category]).find({
            //     order_id: order_item_details?.order_id,
            //     item_status: { $ne: null }
            // });

            // if (fetch_order_item_closed?.length <= 0) {
            //     const order_closed = await OrderModel.findOneAndUpdate({
            //         _id: order_item_details?.order_id
            //     }, {
            //         $set: {
            //             order_status: order_status.cancelled
            //         }
            //     }, { new: true, session });

            //     if (!order_closed) {
            //         throw new ApiError(`Failed to update order status as closed`, StatusCodes.BAD_REQUEST);
            //     }

            // }

            const remaining_open_items = await mongoose
                .model(this.order_item_collections[order_category])
                .find({
                    order_id: order_item_details?.order_id,
                    item_status: null,
                })
                .session(session);

            if (remaining_open_items.length === 0) {
                // All items cancelled (or single item order)
                await OrderModel.findOneAndUpdate(
                    { _id: order_item_details?.order_id },
                    { $set: { order_status: order_status.cancelled } },
                    { session }
                );
            } else {
                // Some items still open, keep order_status as null
                await OrderModel.findOneAndUpdate(
                    { _id: order_item_details?.order_id },
                    { $set: { order_status: null } },
                    { session }
                );
            }

            await session.commitTransaction();
            const response = new ApiResponse(
                StatusCodes.OK,
                'Order Item Cancelled Successfully.',
                {
                    order_item_details: order_item_details,
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
