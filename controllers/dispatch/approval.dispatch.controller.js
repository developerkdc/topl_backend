import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../utils/ApiResponse.js';
import { approval_status, StatusCodes } from '../../utils/constants.js';
import { dynamic_filter } from '../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../utils/errors/apiError.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import approval_dispatch_model from '../../database/schema/dispatch/approval/approval.dispatch.schema.js';
import dispatchModel from '../../database/schema/dispatch/dispatch.schema.js';
import approval_dispatch_items_model from '../../database/schema/dispatch/approval/approval.dispatch_items.schema.js';
import dispatchItemsModel from '../../database/schema/dispatch/dispatch_items.schema.js';
import { order_category, order_item_status } from '../../database/Utils/constants/constants.js';
import { OrderModel } from '../../database/schema/order/orders.schema.js';
import { packing_done_other_details_model } from '../../database/schema/packing/packing_done/packing_done.schema.js';
import { RawOrderItemDetailsModel } from '../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { decorative_order_item_details_model } from '../../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import series_product_order_item_details_model from '../../database/schema/order/series_product_order/series_product_order_item_details.schema.js';
import { create_dispatch_approval_report } from '../../config/downloadExcel/dispatch/dispatch.approval.report.js';

const order_items_models = {
    [order_category.raw]: RawOrderItemDetailsModel,
    [order_category.decorative]: decorative_order_item_details_model,
    [order_category.series_product]: series_product_order_item_details_model,
};
export const fetch_all_dispatch_details = catchAsync(async (req, res, next) => {
    const {
        page = 1,
        sortBy = 'updatedAt',
        sort = 'desc',
        limit = 10,
        search = '',
        export_report = 'false'
    } = req.query;
    const {
        string,
        boolean,
        numbers,
        arrayField = [],
    } = req.body?.searchFields || {};
    const { _id } = req.userDetails;
    const filter = req.body?.filter;

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
        'approval.approvalPerson': _id,
    };

    const aggLookupDispatchItemsDetails = {
        $lookup: {
            from: 'approval_dispatch_items',
            localField: '_id',
            foreignField: 'approval_dispatch_id',
            as: 'dispatch_items_details',
        },
    };
    const approval_user_details_pipeline = [
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
    ];
    const aggMatch = {
        $match: {
            ...match_query,
        },
    };

    const aggAddInvoiceSort = {
        $addFields: {
            invoice_sort_key: {
                $add: [
                    {
                        $multiply: [
                            {
                                $convert: {
                                    input: {
                                        $getField: {
                                            field: 'match',
                                            input: {
                                                $regexFind: {
                                                    input: { $ifNull: ['$invoice_no', '0'] },
                                                    regex: '(?<=/)(\\d{2})',
                                                },
                                            },
                                        },
                                    },
                                    to: 'int',
                                    onError: 0,
                                    onNull: 0,
                                },
                            },
                            1000,
                        ],
                    },
                    {
                        $convert: {
                            input: {
                                $getField: {
                                    field: 'match',
                                    input: {
                                        $regexFind: {
                                            input: { $ifNull: ['$invoice_no', '0'] },
                                            regex: '^[0-9]+',
                                        },
                                    },
                                },
                            },
                            to: 'int',
                            onError: 0,
                            onNull: 0,
                        },
                    },
                ],
            },
        },
    };
    const aggSort = {
        $sort:
            sortBy === 'invoice_no'
                ? {
                    invoice_sort_key: sort === 'desc' ? -1 : 1,
                    invoice_no: sort === 'desc' ? -1 : 1,
                }
                : { [sortBy]: sort === 'desc' ? -1 : 1 },
    };
    const aggSkip = {
        $skip: (parseInt(page) - 1) * parseInt(limit),
    };
    const aggLimit = {
        $limit: parseInt(limit),
    };

    const list_aggregate = [
        aggLookupDispatchItemsDetails,
        ...approval_user_details_pipeline,
        aggMatch,
        // aggAddInvoiceSort,
        aggSort,
        ...(export_report === 'false' ?
            [aggSkip, aggLimit] : [])
    ];

    const result = await approval_dispatch_model.aggregate(list_aggregate);

    if (export_report === "true") {
        return await create_dispatch_approval_report(result, req, res, next)
    }

    const aggCount = {
        $count: 'totalCount',
    };

    const count_total_docs = [
        aggLookupDispatchItemsDetails,
        ...approval_user_details_pipeline,
        aggMatch,
        aggCount,
    ];

    const total_docs = await approval_dispatch_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
        200,
        'Approval Dispatch Data Fetched Successfully',
        {
            data: result,
            totalPages: totalPages,
        }
    );
    return res.status(200).json(response);
});
export const fetch_all_dispatch_items_by_dispatch_id = catchAsync(
    async (req, res) => {
        const { id } = req.params;

        if (!id) {
            throw new ApiError('ID is missing', StatusCodes.BAD_REQUEST);
        }
        if (!isValidObjectId(id)) {
            throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
        }

        const dispatch_details_result = await approval_dispatch_model
            .findById(id)
            .lean();

        if (!dispatch_details_result) {
            throw new ApiError('Dispatch Details not found', StatusCodes.NOT_FOUND);
        }

        const is_approval_sent =
            dispatch_details_result?.approval_status?.sendForApproval?.status;

        const previous_dispacth_items_details_pipeline = [
            {
                $lookup: {
                    from: 'dispatch_items',
                    foreignField: '_id',
                    localField: 'approval_dispatch_item_id',
                    as: 'previous_dispatch_item_details',
                },
            },
            {
                $unwind: {
                    path: '$previous_dispatch_item_details',
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
                            from: 'dispatches',
                            foreignField: '_id',
                            localField: 'approval_dispatch_id',
                            as: 'previous_dispatch_details',
                        },
                    },
                    {
                        $unwind: {
                            path: '$previous_dispatch_details',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                ]
                : []),

            {
                $lookup: {
                    from: 'approval_dispatch_items',
                    foreignField: 'approval_dispatch_id',
                    localField: '_id',
                    as: 'dispatch_items_details',
                    pipeline: is_approval_sent
                        ? previous_dispacth_items_details_pipeline
                        : [],
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

        const [result] = await approval_dispatch_model.aggregate(pipeline);

        const response = new ApiResponse(
            StatusCodes.OK,
            'Dispatch Details fetched Successfully',
            result
        );
        return res.status(StatusCodes.OK).json(response);
    }
);

export const approve_dispatch_details = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = req.userDetails;

    if (!id) {
        throw new ApiError('Dispatch ID is required', StatusCodes.BAD_REQUEST);
    }
    if (!isValidObjectId(id)) {
        throw new ApiError('Dispatch Packing ID', StatusCodes.BAD_REQUEST);
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

        const dispatch_details_approval_result = await approval_dispatch_model
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
        if (!dispatch_details_approval_result) {
            throw new ApiError(
                'Failed to update dispatch details',
                StatusCodes.BAD_REQUEST
            );
        }

        const { _id, approval_dispatch_id, approvalBy, ...rest_dispatch_Details } =
            dispatch_details_approval_result;
        const approval_item_details = await approval_dispatch_items_model
            .find({
                approval_dispatch_id: id,
                dispatch_id: approval_dispatch_id,
            })
            .session(session)
            .lean();
        if (approval_item_details?.length <= 0) {
            throw new ApiError(
                'No approval item details found',
                StatusCodes.BAD_REQUEST
            );
        }

        const old_dispatch_details = await dispatchModel
            .findById(dispatch_details_approval_result?.approval_dispatch_id)
            .session(session);
        if (!old_dispatch_details) {
            throw new ApiError("Old Dispatch Details not found.")
        }
        const old_dispatch_items = await dispatchItemsModel
            .find({
                dispatch_id: dispatch_details_approval_result?.approval_dispatch_id,
            })
            .session(session);

        if (old_dispatch_items?.length === 0) {
            throw new ApiError('No Old Dispatch items found');
        }
        // revert order status
        for (let item of old_dispatch_items) {
            const dispatch_no_of_sheets =
                (item?.no_of_sheets || 0) +
                (item?.no_of_leaves || 0) +
                (item?.number_of_rolls || 0);

            const order_items_details = await order_items_models[
                item?.order_category
            ].findOneAndUpdate(
                {
                    _id: item?.order_item_id,
                    order_id: item?.order_id,
                },
                {
                    $inc: {
                        dispatch_no_of_sheets: -dispatch_no_of_sheets,
                    },
                },
                { new: true, session: session }
            );

            if (!order_items_details) {
                throw new ApiError(
                    `Failed to update dispatch no of sheets in order for ${item?.order_category}`,
                    StatusCodes.BAD_REQUEST
                );
            }

            const update_order_item = await order_items_models[
                item?.order_category
            ].findOneAndUpdate(
                {
                    _id: order_items_details?._id,
                    order_id: order_items_details?.order_id,
                    // no_of_sheets: order_items_details?.dispatch_no_of_sheets
                    no_of_sheets: order_items_details?.no_of_sheets,
                },
                {
                    $set: {
                        item_status: null,
                    },
                },
                { new: true, session: session }
            );

            if (!update_order_item) {
                throw new ApiError(
                    `Failed to update order item status as closed`,
                    StatusCodes.BAD_REQUEST
                );
            }

            const update_order = await OrderModel.findOneAndUpdate(
                {
                    _id: order_items_details?.order_id,
                },
                {
                    $set: {
                        order_status: null,
                    },
                },
                { new: true, session }
            );

            if (!update_order) {
                throw new ApiError(
                    `Failed to update order status as closed`,
                    StatusCodes.BAD_REQUEST
                );
            }
        }

        const update_dispatch_details = {
            ...rest_dispatch_Details,
            created_by: dispatch_details_approval_result?.created_by ? dispatch_details_approval_result?.created_by : user?._id,
            updated_by: dispatch_details_approval_result?.updated_by ? dispatch_details_approval_result?.updated_by : user?._id,
        };

        const update_dispatch_details_data = await dispatchModel.findOneAndUpdate(
            {
                _id: approval_dispatch_id,
            },
            {
                $set: update_dispatch_details,
            },
            { session, new: true, runValidators: true }
        );

        if (!update_dispatch_details_data) {
            throw new ApiError(
                'Failed to update dispatch details',
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }

        // delete existing dispatch items
        const delete_dispatch_items = await dispatchItemsModel.deleteMany(
            { dispatch_id: approval_dispatch_id },
            { session }
        );
        if (
            !delete_dispatch_items?.acknowledged ||
            delete_dispatch_items?.deletedCount === 0
        ) {
            throw new ApiError(
                'Failed to delete existing dispatch items',
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }

        // Create new dispatch items details
        const dispatch_items_data = approval_item_details.map((items) => {
            items.dispatch_id = update_dispatch_details_data?._id;
            items.invoice_no = update_dispatch_details_data?.invoice_no;
            items.created_by = items.created_by ? items.created_by : user?._id;
            items.updated_by = items.updated_by ? items.updated_by : user?._id;
            items.createdAt = items.createdAt ? items.createdAt : new Date();
            items.updatedAt = items.updatedAt ? items.updatedAt : new Date();
            return items;
        });
        if (!dispatch_items_data || dispatch_items_data?.length === 0) {
            throw new ApiError(
                'Dispatch items details are required',
                StatusCodes.BAD_REQUEST
            );
        }

        const add_dispatch_items_data = await dispatchItemsModel.insertMany(
            dispatch_items_data,
            { session }
        );
        if (!add_dispatch_items_data || add_dispatch_items_data?.length === 0) {
            throw new ApiError(
                'Failed to create dispatch items',
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }

        // update order and order item as closed status
        for (let item of add_dispatch_items_data) {
            const dispatch_no_of_sheets =
                (item?.no_of_sheets || 0) +
                (item?.no_of_leaves || 0) +
                (item?.number_of_rolls || 0);

            const order_items_details = await order_items_models[
                item?.order_category
            ].findOneAndUpdate(
                {
                    _id: item?.order_item_id,
                    order_id: item?.order_id,
                },
                {
                    $inc: {
                        dispatch_no_of_sheets: dispatch_no_of_sheets,
                    },
                },
                { new: true, session: session }
            );

            if (!order_items_details) {
                throw new ApiError(
                    `Failed to update dispatch no of sheets in order for ${item?.order_category}`,
                    StatusCodes.BAD_REQUEST
                );
            }

            if (
                order_items_details?.no_of_sheets ===
                order_items_details?.dispatch_no_of_sheets
            ) {
                const order_item_closed = await order_items_models[
                    item?.order_category
                ].findOneAndUpdate(
                    {
                        _id: order_items_details?._id,
                        order_id: order_items_details?.order_id,
                        no_of_sheets: order_items_details?.dispatch_no_of_sheets,
                    },
                    {
                        $set: {
                            item_status: order_item_status.closed,
                        },
                    },
                    { new: true, session: session }
                );

                if (!order_item_closed) {
                    throw new ApiError(
                        `Failed to update order item status as closed`,
                        StatusCodes.BAD_REQUEST
                    );
                }

                const fetch_order_item_closed = await order_items_models[
                    item?.order_category
                ].find({
                    order_id: order_items_details?.order_id,
                    item_status: { $ne: null },
                });

                if (fetch_order_item_closed?.length <= 0) {
                    const order_closed = await OrderModel.findOneAndUpdate(
                        {
                            _id: order_items_details?.order_id,
                        },
                        {
                            $set: {
                                order_status: order_status.closed,
                            },
                        },
                        { new: true, session }
                    );

                    if (!order_closed) {
                        throw new ApiError(
                            `Failed to update order status as closed`,
                            StatusCodes.BAD_REQUEST
                        );
                    }
                }
            }
        }

        // Update packing done other details for old dispatch details
        const prev_packing_done_ids =
            old_dispatch_details?.packing_done_ids?.map((item) => item?.packing_done_other_details_id);

        const prev_update_packing_done_details =
            await packing_done_other_details_model.updateMany(
                { _id: { $in: prev_packing_done_ids } },
                {
                    $set: {
                        is_dispatch_done: false,
                        isEditable: true,
                        updated_by: user?._id,
                    },
                },
                { session }
            );

        if (prev_update_packing_done_details?.matchedCount === 0) {
            throw new ApiError(
                'Packing done details not found',
                StatusCodes.NOT_FOUND
            );
        }
        if (
            !prev_update_packing_done_details?.acknowledged ||
            prev_update_packing_done_details?.modifiedCount === 0
        ) {
            throw new ApiError(
                'Failed to update packing done details',
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }

        // Update packing done other details with new packing done IDs
        const packing_done_ids = dispatch_details_approval_result?.packing_done_ids;
        if (packing_done_ids?.length <= 0) {
            throw new ApiError(
                'Packing done IDs are not allowed for dispatch',
                StatusCodes.BAD_REQUEST
            );
        }
        const packing_done_ids_data = packing_done_ids.map(
            (item) => item?.packing_done_other_details_id
        );

        const alreadyDispatched = await packing_done_other_details_model
            .find({
                _id: { $in: packing_done_ids_data },
                is_dispatch_done: true,
                dispatch_id: { $ne: update_dispatch_details_data?._id },
            })
            .session(session);

        if (alreadyDispatched?.length > 0) {
            throw new ApiError(
                'Packing done details not found or already dispatch for some packing id',
                StatusCodes.BAD_REQUEST
            );
        }

        const update_packing_done_details =
            await packing_done_other_details_model.updateMany(
                { _id: { $in: packing_done_ids_data } },
                {
                    $set: {
                        is_dispatch_done: true,
                        isEditable: false,
                        updated_by: user?._id,
                    },
                },
                { session }
            );
        if (update_packing_done_details?.matchedCount === 0) {
            throw new ApiError(
                'Packing done details not found',
                StatusCodes.NOT_FOUND
            );
        }
        if (
            !update_packing_done_details?.acknowledged ||
            update_packing_done_details?.modifiedCount === 0
        ) {
            throw new ApiError(
                'Failed to update packing done details',
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }

        const response = new ApiResponse(
            StatusCodes.OK,
            'Dispatch Approved Successfully',
            {
                dispatch_details: update_dispatch_details_data,
                dispatch_items_details: add_dispatch_items_data,
            }
        );
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session?.abortTransaction();
        throw error;
    } finally {
        await session?.endSession();
    }
});

export const reject_dispatch_details = catchAsync(async (req, res) => {
    const { dispatch_details_id } = req.params;
    const user = req.userDetails;

    if (!dispatch_details_id) {
        throw new ApiError(
            'Dispatch details ID is required',
            StatusCodes.BAD_REQUEST
        );
    }
    if (!isValidObjectId(dispatch_details_id)) {
        throw new ApiError('Invalid Dispatch details ID', StatusCodes.BAD_REQUEST);
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

        const dispatch_details_approval_status_result =
            await approval_dispatch_model
                .findOneAndUpdate(
                    {
                        _id: dispatch_details_id,
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

        if (!dispatch_details_approval_status_result) {
            throw new ApiError(
                'Failed to update dispatch details ',
                StatusCodes.BAD_REQUEST
            );
        }

        const update_dispatch_details_result = await dispatchModel
            .updateOne(
                {
                    _id: dispatch_details_approval_status_result?.approval_dispatch_id,
                },
                {
                    $set: { approval_status: updated_approval_status },
                },
                { session }
            )
            .lean();

        if (update_dispatch_details_result?.matchedCount === 0) {
            throw new ApiError('Dispatch details not found', StatusCodes.BAD_REQUEST);
        }
        if (
            !update_dispatch_details_result?.acknowledged ||
            update_dispatch_details_result?.modifiedCount === 0
        ) {
            throw new ApiError(
                'Failed to reject dispatch details',
                StatusCodes.BAD_REQUEST
            );
        }
        const response = new ApiResponse(
            StatusCodes.OK,
            'Dispatch Details Rejected successfully'
        );
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session?.abortTransaction();
        throw error;
    } finally {
        await session?.endSession();
    }
});
