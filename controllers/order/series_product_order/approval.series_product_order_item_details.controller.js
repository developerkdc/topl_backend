import mongoose, { isValidObjectId } from 'mongoose';
import { create_series_product_order_approval_report } from '../../../config/downloadExcel/orders/series_product/series_product_order.approval.report.js';
import { order_status } from '../../../database/Utils/constants/constants.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import salesItemNameModel from '../../../database/schema/masters/salesItemName.schema.js';
import { orders_approval_model } from '../../../database/schema/order/orders.approval.schema.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import approval_series_product_order_item_details_model from '../../../database/schema/order/series_product_order/approval.series_product_order_item_details.schema.js';
import series_product_order_item_details_model from '../../../database/schema/order/series_product_order/series_product_order_item_details.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { approval_status, StatusCodes } from '../../../utils/constants.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

export const fetch_all_series_product_order_items = catchAsync(
    async (req, res, next) => {
        const {
            page = 1,
            sortBy = 'updatedAt',
            sort = 'desc',
            limit = 10,
            search = '',
            export_report = 'false',
        } = req.query;
        const {
            string,
            boolean,
            numbers,
            arrayField = [],
        } = req.body?.searchFields || {};

        const filter = req.body?.filter;
        const { _id } = req.userDetails;

        let search_query = {};
        if (search != '' && req?.body?.searchFields) {
            const search_data = DynamicSearch(
                search,
                boolean,
                numbers,
                string,
                arrayField
            );
            if (search_data?.length == 0) {
                return res.status(404).json({
                    statusCode: 404,
                    status: false,
                    data: {
                        data: [],
                    },
                    message: 'Results Not Found',
                });
            }
            search_query = search_data;
        }

        const filterData = dynamic_filter(filter);

        const match_query = {
            ...search_query,
            ...filterData,
            'order_details.approval.approvalPerson': _id,
        };

        const aggLookupOrderDetails = {
            $lookup: {
                from: 'orders_approval',
                localField: 'approval_order_id',
                foreignField: '_id',
                as: 'order_details',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'created_by',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        first_name: 1,
                                        last_name: 1,
                                        user_name: 1,
                                        user_type: 1,
                                        email_id: 1,
                                    },
                                },
                            ],
                            as: 'order_created_user_details',
                        },
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'updated_by',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        first_name: 1,
                                        last_name: 1,
                                        user_name: 1,
                                        user_type: 1,
                                        email_id: 1,
                                    },
                                },
                            ],
                            as: 'order_updated_user_details',
                        },
                    },
                    {
                        $unwind: {
                            path: '$order_created_user_details',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $unwind: {
                            path: '$order_updated_user_details',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'approval.rejectedBy.user',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        first_name: 1,
                                        last_name: 1,
                                        user_name: 1,
                                    },
                                },
                            ],
                            as: 'rejected_user_details',
                        },
                    },
                    {
                        $unwind: {
                            path: '$rejected_user_details',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'approval.approvalBy.user',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        first_name: 1,
                                        last_name: 1,
                                        user_name: 1,
                                    },
                                },
                            ],
                            as: 'approved_user_details',
                        },
                    },
                    {
                        $unwind: {
                            path: '$approved_user_details',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'approval.editedBy',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        first_name: 1,
                                        last_name: 1,
                                        user_name: 1,
                                    },
                                },
                            ],
                            as: 'edited_user_details',
                        },
                    },
                    {
                        $unwind: {
                            path: '$edited_user_details',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                ],
            },
        };
        const aggCreatedUserDetails = {
            $lookup: {
                from: 'users',
                localField: 'created_by',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            first_name: 1,
                            last_name: 1,
                            user_name: 1,
                            user_type: 1,
                            email_id: 1,
                        },
                    },
                ],
                as: 'created_user_details',
            },
        };

        const aggUpdatedUserDetails = {
            $lookup: {
                from: 'users',
                localField: 'updated_by',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            first_name: 1,
                            last_name: 1,
                            user_name: 1,
                            user_type: 1,
                            email_id: 1,
                        },
                    },
                ],
                as: 'updated_user_details',
            },
        };

        const aggMatch = {
            $match: {
                ...match_query,
            },
        };
        const aggUnwindOtherDetails = {
            $unwind: {
                path: '$order_details',
                preserveNullAndEmptyArrays: true,
            },
        };

        const aggUnwindCreatedUser = {
            $unwind: {
                path: '$created_user_details',
                preserveNullAndEmptyArrays: true,
            },
        };
        const aggUnwindUpdatedUser = {
            $unwind: {
                path: '$updated_user_details',
                preserveNullAndEmptyArrays: true,
            },
        };
        // const aggOrderUnwindCreatedUser = {
        //   $unwind: {
        //     path: '$order_created_user_details',
        //     preserveNullAndEmptyArrays: true,
        //   },
        // };
        const aggSort = {
            $sort: {
                [sortBy]: sort === 'desc' ? -1 : 1,
            },
        };

        const aggSkip = {
            $skip: (parseInt(page) - 1) * parseInt(limit),
        };

        const aggLimit = {
            $limit: parseInt(limit),
        };

        const list_aggregate = [
            aggLookupOrderDetails,
            aggUnwindOtherDetails,
            aggCreatedUserDetails,
            aggUpdatedUserDetails,
            aggUnwindCreatedUser,
            aggUnwindUpdatedUser,
            // aggOrderCreatedUserDetails,
            // aggOrderUpdatedUserDetails,
            // aggOrderUnwindCreatedUser,
            // aggOrderUnwindUpdatedUser,
            aggMatch,
            aggSort,
            // aggSkip,
            // aggLimit,
            ...(export_report === "false" ? [aggSkip,
                aggLimit] : [])
        ];

        const result =
            await approval_series_product_order_item_details_model?.aggregate(
                list_aggregate
            );

        if (export_report === 'true') {
            await create_series_product_order_approval_report(result, req, res);
        }
        const aggCount = {
            $count: 'totalCount',
        };

        const count_total_docs = [
            aggLookupOrderDetails,
            aggUnwindOtherDetails,
            aggCreatedUserDetails,
            aggUpdatedUserDetails,
            aggUnwindCreatedUser,
            aggUnwindUpdatedUser,
            aggMatch,
            aggCount,
        ];

        const total_docs = await approval_series_product_order_item_details_model.aggregate(
            count_total_docs
        );

        const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

        const response = new ApiResponse(
            StatusCodes?.OK,
            'Series Product Order Approval Details Fetched Successfully',
            {
                data: result,
                totalPages: totalPages,
            }
        );
        return res.status(StatusCodes?.OK).json(response);
    }
);

export const fetch_all_series_product_order_items_by_order_id = catchAsync(
    async (req, res) => {
        const { id } = req.params;

        if (!id) {
            throw new ApiError('ID is missing', StatusCodes.BAD_REQUEST);
        }
        if (!isValidObjectId(id)) {
            throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
        }

        const order_result = await orders_approval_model.findById(id).lean();

        if (!order_result) {
            throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
        }

        const is_approval_sent =
            order_result?.approval_status?.sendForApproval?.status;

        // if (!is_approval_sent) {
        //   throw new ApiError('Approval not sent for this order', StatusCodes.BAD_REQUEST);
        // };

        const previous_order_details_pipeline = [
            {
                $lookup: {
                    from: 'series_product_order_item_details',
                    foreignField: '_id',
                    localField: 'series_product_item_id',
                    as: 'previous_order_item_details',
                },
            },
            {
                $unwind: {
                    path: '$previous_order_item_details',
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];
        const pipeline = [
            {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(id),
                },
            },
            ...(is_approval_sent
                ? [
                    {
                        $lookup: {
                            from: 'orders',
                            foreignField: '_id',
                            localField: 'order_id',
                            as: 'previous_order_details',
                        },
                    },
                    {
                        $unwind: {
                            path: '$previous_order_details',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                ]
                : []),

            {
                $lookup: {
                    from: 'approval_series_product_order_item_details',
                    foreignField: 'approval_order_id',
                    localField: '_id',
                    as: 'order_items_details',
                    pipeline: is_approval_sent ? previous_order_details_pipeline : [],
                },
            },
            {
                $lookup: {
                    from: 'users',
                    foreignField: '_id',
                    localField: 'created_by',
                    as: 'created_user_details',
                    pipeline: [
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                user_name: 1,
                                user_type: 1,
                                email_id: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'users',
                    foreignField: '_id',
                    localField: 'updated_by',
                    as: 'updated_user_details',
                    pipeline: [
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                user_name: 1,
                                user_type: 1,
                                email_id: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: '$created_user_details',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $unwind: {
                    path: '$updated_user_details',
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];

        const [result] = await orders_approval_model.aggregate(pipeline);

        const response = new ApiResponse(
            StatusCodes.OK,
            'All Items of order fetched successfully',
            result
        );
        return res.status(StatusCodes.OK).json(response);
    }
);

export const approve_order = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = req.userDetails;

    if (!id) {
        throw new ApiError('Order ID is required', StatusCodes.BAD_REQUEST);
    }
    if (!isValidObjectId(id)) {
        throw new ApiError('Invalid Order ID', StatusCodes.BAD_REQUEST);
    }
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const updated_approval_status = {
            ...approval_status,
            approved: {
                status: true,
                remark: null,
            },
        };

        const order_approval = await orders_approval_model
            .findOneAndUpdate(
                {
                    _id: id,
                },
                {
                    $set: {
                        approval_status: updated_approval_status,
                        'approval.approvalBy.user': user._id,
                    },
                },
                { session, new: true, runValidators: true }
            )
            .lean();
        if (!order_approval) {
            throw new ApiError(
                'Failed to update order details',
                StatusCodes.BAD_REQUEST
            );
        }

        if (order_approval.order_status === order_status.closed) {
            throw new ApiError('Order is already closed', StatusCodes.BAD_REQUEST);
        }

        const { _id, order_id, approvalBy, ...rest_order_Details } = order_approval;

        const update_order_details_result = await OrderModel.updateOne(
            { _id: order_id },
            {
                $set: { ...rest_order_Details },
            },
            { session }
        ).lean();

        if (update_order_details_result?.matchedCount === 0) {
            throw new ApiError('Order details not found', StatusCodes.BAD_REQUEST);
        }

        if (
            !update_order_details_result?.acknowledged ||
            update_order_details_result?.modifiedCount === 0
        ) {
            throw new ApiError(
                'Failed to approve order details',
                StatusCodes.BAD_REQUEST
            );
        }

        const approval_item_details =
            await approval_series_product_order_item_details_model
                .find({ approval_order_id: id, order_id: order_id })
                .session(session)
                .lean();
        if (approval_item_details?.length <= 0) {
            throw new ApiError(
                'No approval item details found for this order',
                StatusCodes.BAD_REQUEST
            );
        }

        const existing_series_product_order_items =
            await series_product_order_item_details_model
                .find({ order_id: order_id })
                .session(session)
                .lean();

        //function to revert photo sheets here we are reverting sheets of existing order items before approving new ones
        const revert_photo_details = async function (
            photo_number_id,
            photo_number,
            no_of_sheets,
            pressing_instructions
        ) {
            const revertSheets = pressing_instructions === "BOTH SIDE WITH SAME GROUP" ? no_of_sheets * 2 : no_of_sheets;
            const update_photo_sheets = await photoModel.updateOne(
                {
                    _id: photo_number_id,
                    photo_number: photo_number,
                },
                {
                    $inc: { available_no_of_sheets: revertSheets },
                },
                { session }
            );

            if (!update_photo_sheets?.acknowledged) {
                throw new ApiError(
                    `Photo number ${photo_number} failed to revert sheets.`,
                    StatusCodes.BAD_REQUEST
                );
            }
        };
        for (const item of existing_series_product_order_items) {
            if (item.photo_number && item.photo_number_id) {
                await revert_photo_details(
                    item.photo_number_id,
                    item.photo_number,
                    item.no_of_sheets,
                    item.pressing_instructions
                );
            }

        }

        const delete_existing_series_product_order_items =
            await series_product_order_item_details_model
                .deleteMany({ order_id: order_id }, { session })
                .lean();

        if (
            !delete_existing_series_product_order_items?.acknowledged ||
            delete_existing_series_product_order_items?.deletedCount === 0
        ) {
            throw new ApiError(
                'Failed to delete existing series product order items',
                StatusCodes.BAD_REQUEST
            );
        }

        //function to update photo sheets
        const update_photo_details = async function (
            photo_number_id,
            photo_number,
            no_of_sheets,
            pressing_instructions
        ) {
            const requiredSheets = pressing_instructions === "BOTH SIDE WITH SAME GROUP" ? no_of_sheets * 2 : no_of_sheets;
            const photoUpdate = await photoModel.findOneAndUpdate(
                {
                    _id: photo_number_id,
                    photo_number: photo_number,
                    available_no_of_sheets: { $gte: Number(requiredSheets) },
                },
                { $inc: { available_no_of_sheets: -Number(requiredSheets) } },
                { session: session, new: true }
            );
            if (!photoUpdate) {
                throw new ApiError(
                    `Photo number ${photo_number} does not have enough sheets.`,
                    StatusCodes.BAD_REQUEST
                );
            }
            return photoUpdate;
        };

        const updated_item_details = [];
        for await (const item of approval_item_details) {
            if (item.photo_number && item.photo_number_id) {
                const updated_photo_details = await update_photo_details(
                    item.photo_number_id,
                    item.photo_number,
                    item.no_of_sheets,
                    item.pressing_instructions
                );
                if (item?.sales_item_name) {
                    const upperCaseName = item.sales_item_name.toUpperCase();

                    const existingItem = await salesItemNameModel.findOne(
                        { sales_item_name: upperCaseName },
                        null,
                        { session }
                    );

                    if (!existingItem) {
                        const maxNumber = await salesItemNameModel
                            .aggregate([
                                {
                                    $group: {
                                        _id: null,
                                        max: { $max: '$sr_no' },
                                    },
                                },
                            ])
                            .session(session);

                        const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;

                        await salesItemNameModel.create(
                            [
                                {
                                    sales_item_name: upperCaseName,
                                    sr_no: maxSrNo,
                                    created_by: user?._id,
                                    updated_by: user?._id,
                                },
                            ],
                            { session }
                        );
                    }
                }
            }
            updated_item_details.push({
                ...item,
                _id: item?.decorative_item_id,
                approval_order_id: null,
                decorative_item_id: null,
                order_id: order_approval?.order_id,
                product_category: order_approval?.product_category,
                created_by: item.created_by ? item?.created_by : user?._id,
                updated_by: item?.updated_by ? item?.updated_by : user?._id,
                createdAt: item.createdAt ? item?.createdAt : new Date(),
                updatedAt: new Date(),
            });
        }
        const create_order_result =
            await series_product_order_item_details_model?.insertMany(
                updated_item_details,
                { session }
            );
        if (create_order_result?.length === 0) {
            throw new ApiError(
                'Failed to add order item details',
                StatusCodes?.BAD_REQUEST
            );
        }

        await session.commitTransaction();

        const response = new ApiResponse(
            StatusCodes.OK,
            'Series Product Order approved successfully',
            {
                order_details: update_order_details_result,
                approved_raw_order_items: create_order_result,
            }
        );
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session?.abortTransaction();
        throw error;
    } finally {
        await session?.endSession();
    }
});
export const reject_order = catchAsync(async (req, res) => {
    const { order_id } = req.params;
    const user = req.userDetails;

    if (!order_id) {
        throw new ApiError('Order ID is required', StatusCodes.BAD_REQUEST);
    }
    if (!isValidObjectId(order_id)) {
        throw new ApiError('Invalid Order ID', StatusCodes.BAD_REQUEST);
    }
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const updated_approval_status = {
            ...approval_status,
            rejected: {
                status: true,
                remark: null,
            },
        };

        const order_approval_status_result = await orders_approval_model
            .findOneAndUpdate(
                {
                    _id: order_id,
                },
                {
                    $set: {
                        approval_status: updated_approval_status,
                        'approval.rejectedBy.user': user._id,
                    },
                },
                { session, new: true, runValidators: true }
            )
            .lean();

        if (!order_approval_status_result) {
            throw new ApiError(
                'Failed to update order details',
                StatusCodes.BAD_REQUEST
            );
        }

        const update_order_details_result = await OrderModel.updateOne(
            { _id: order_approval_status_result?.order_id },
            {
                $set: { approval_status: updated_approval_status },
            },
            { session }
        ).lean();

        if (update_order_details_result?.matchedCount === 0) {
            throw new ApiError('Order details not found', StatusCodes.BAD_REQUEST);
        }
        if (
            !update_order_details_result?.acknowledged ||
            update_order_details_result?.modifiedCount === 0
        ) {
            throw new ApiError(
                'Failed to reject order details',
                StatusCodes.BAD_REQUEST
            );
        }
        await session.commitTransaction();

        const response = new ApiResponse(
            StatusCodes.OK,
            'Series Product Order Rejected successfully'
        );
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session?.abortTransaction();
        throw error;
    } finally {
        await session?.endSession();
    }
});
