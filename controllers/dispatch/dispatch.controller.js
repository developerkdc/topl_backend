import mongoose from "mongoose";
import catchAsync from "../../utils/errors/catchAsync.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { StatusCodes } from "../../utils/constants.js";
import dispatchModel from "../../database/schema/dispatch/dispatch.schema.js";
import ApiError from "../../utils/errors/apiError.js";
import dispatchItemsModel from "../../database/schema/dispatch/dispatch_items.schema.js";

export const add_dispatch_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userDetails = req.userDetails;
        const { dispatch_details, dispatch_items_details } = req.body;
        if (!dispatch_details) {
            throw new ApiError('Dispatch data required', StatusCodes.BAD_REQUEST)
        };
        if (!dispatch_items_details || !Array.isArray(dispatch_items_details)) {
            throw new ApiError('Dispatch items details must be an array', StatusCodes.BAD_REQUEST);
        }
        if (dispatch_items_details?.length === 0) {
            throw new ApiError('Dispatch items details are required', StatusCodes.BAD_REQUEST)
        }

        const dispatch_details_data = {
            ...dispatch_details,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
        };

        const add_dispatch_details_data = await dispatchModel.create([dispatch_details_data], { session });
        if (!add_dispatch_details_data || add_dispatch_details_data.length === 0) {
            throw new ApiError('Failed to create dispatch details', StatusCodes.INTERNAL_SERVER_ERROR);
        };

        const dispatch_id = add_dispatch_details_data?.[0]?._id;
        const dispatch_items_data = dispatch_items_details.map((items) => {
            return {
                ...items,
                dispatch_id: dispatch_id,
                created_by: userDetails?._id,
                updated_by: userDetails?._id,
            }
        });
        if (!dispatch_items_data || dispatch_items_data?.length === 0) {
            throw new ApiError('Dispatch items details are required', StatusCodes.BAD_REQUEST);
        };

        const add_dispatch_items_data = await dispatchItemsModel.insertMany(dispatch_items_data, { session });
        if (!add_dispatch_items_data || add_dispatch_items_data?.length === 0) {
            throw new ApiError('Failed to create dispatch items', StatusCodes.INTERNAL_SERVER_ERROR);
        }

        await session.commitTransaction();
        const response = new ApiResponse(StatusCodes.CREATED, 'Dispatched Successfully', {
            dispatch_details: add_dispatch_details_data?.[0],
            dispatch_items_details: add_dispatch_items_data,
        });
        return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});

export const edit_dispatch_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userDetails = req.userDetails;
        const { dispatch_id } = req.params;
        if (!dispatch_id || !mongoose.isValidObjectId(dispatch_id)) {
            throw new ApiError('Invalid Dispatch ID', StatusCodes.BAD_REQUEST);
        }
        const { dispatch_details, dispatch_items_details } = req.body;
        if (!dispatch_details) {
            throw new ApiError('Dispatch data required', StatusCodes.BAD_REQUEST)
        };
        if (!dispatch_items_details || !Array.isArray(dispatch_items_details)) {
            throw new ApiError('Dispatch items details must be an array', StatusCodes.BAD_REQUEST);
        }
        if (dispatch_items_details?.length === 0) {
            throw new ApiError('Dispatch items details are required', StatusCodes.BAD_REQUEST)
        };

        const fetch_dipsatch_details = await dispatchModel.findById(dispatch_id).session(session);
        if (!fetch_dipsatch_details) {
            throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
        }
        const fetch_dispatch_items_details = await dispatchItemsModel.find({ dispatch_id: dispatch_id }).session(session);
        if (!fetch_dispatch_items_details || fetch_dispatch_items_details?.length === 0) {
            throw new ApiError('Dispatch items details not found', StatusCodes.NOT_FOUND);
        }

        const update_dispatch_details = {
            ...dispatch_details,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
        };

        const update_dispatch_details_data = await dispatchModel.findOneAndUpdate({
            _id: dispatch_id
        }, {
            $set: update_dispatch_details,
        }, { session, new: true, runValidators: true });

        if (!update_dispatch_details_data) {
            throw new ApiError('Failed to update dispatch details', StatusCodes.INTERNAL_SERVER_ERROR);
        };

        const delete_dispatch_items = await dispatchItemsModel.deleteMany({ dispatch_id: dispatch_id }, { session });
        if (!delete_dispatch_items?.acknowledged || delete_dispatch_items?.deletedCount === 0) {
            throw new ApiError('Failed to delete existing dispatch items', StatusCodes.INTERNAL_SERVER_ERROR);
        };

        const dispatch_items_data = dispatch_items_details.map((items) => {
            items.dispatch_id = update_dispatch_details_data?.dispatch_id,
            items.created_by = items.created_by ? items.created_by : userDetails?._id;
            items.updated_by = userDetails?._id;
            items.createdAt = items.createdAt ? items.createdAt : new Date();
            items.updatedAt = new Date();
            return items;
        });
        if (!dispatch_items_data || dispatch_items_data?.length === 0) {
            throw new ApiError('Dispatch items details are required', StatusCodes.BAD_REQUEST);
        };

        const add_dispatch_items_data = await dispatchItemsModel.insertMany(dispatch_items_data, { session });
        if (!add_dispatch_items_data || add_dispatch_items_data?.length === 0) {
            throw new ApiError('Failed to create dispatch items', StatusCodes.INTERNAL_SERVER_ERROR);
        }

        await session.commitTransaction();
        const response = new ApiResponse(StatusCodes.OK, 'Dispatched Updated Successfully', {
            dispatch_details: update_dispatch_details_data,
            dispatch_items_details: add_dispatch_items_data,
        });
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});

export const fetch_all_details_by_dispatch_id = catchAsync(
    async (req, res, next) => {
        const { id } = req.params;

        if (!id && !mongoose.isValidObjectId(id)) {
            throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
        }

        const pipeline = [
            {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(id),
                },
            },
            {
                $lookup: {
                    from: 'dispatch_items',
                    localField: '_id',
                    foreignField: 'dispatch_id',
                    as: 'dispatch_items_details',
                },
            },
            {
                $unwind: {
                    path: '$dispatch_items_details',
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];
        const result = await dispatchModel.aggregate(pipeline);

        const response = new ApiResponse(
            StatusCodes.OK,
            'Details Fetched successfully',
            result?.[0]
        );

        return res.status(StatusCodes.OK).json(response);
    }
);

export const fetch_all_dispatch_details = catchAsync(
    async (req, res, next) => {
        const {
            page = 1,
            sortBy = 'updatedAt',
            sort = 'desc',
            limit = 10,
            search = '',
        } = req.query;
        const {
            string,
            boolean,
            numbers,
            arrayField = [],
        } = req.body?.searchFields || {};

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

        const match_common_query = {
            $match: {
            },
        };

        const match_query = {
            ...search_query,
            ...filterData,
        };

        const aggLookupDispatchItemsDetails = {
            $lookup: {
                from: 'dispatch_items',
                localField: '_id',
                foreignField: 'dispatch_id',
                as: 'dispatch_items_details',
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
        const aggUnwindDispatchItemsDetails = {
            $unwind: {
                path: '$dispatch_items_details',
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
            // match_common_query,
            aggLookupDispatchItemsDetails,
            aggUnwindDispatchItemsDetails,
            aggCreatedUserDetails,
            aggUpdatedUserDetails,
            aggUnwindCreatedUser,
            aggUnwindUpdatedUser,
            aggMatch,
            aggSort,
            aggSkip,
            aggLimit,
        ];

        const result = await dispatchModel.aggregate(list_aggregate);

        const aggCount = {
            $count: 'totalCount',
        };

        const count_total_docs = [
            // match_common_query,
            aggLookupDispatchItemsDetails,
            aggUnwindDispatchItemsDetails,
            aggCreatedUserDetails,
            aggUpdatedUserDetails,
            aggUnwindCreatedUser,
            aggUnwindUpdatedUser,
            aggMatch,
            aggCount,
        ];

        const total_docs = await dispatchModel.aggregate(count_total_docs);

        const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

        const response = new ApiResponse(200, 'Data Fetched Successfully', {
            data: result,
            totalPages: totalPages,
        });
        return res.status(200).json(response);
    }
);

export const fetch_all_dispatch_items_details = catchAsync(
    async (req, res, next) => {
        const {
            page = 1,
            sortBy = 'updatedAt',
            sort = 'desc',
            limit = 10,
            search = '',
        } = req.query;
        const {
            string,
            boolean,
            numbers,
            arrayField = [],
        } = req.body?.searchFields || {};

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

        const match_common_query = {
            $match: {
            },
        };

        const match_query = {
            ...search_query,
            ...filterData,
        };

        const aggLookupDispatchDetails = {
            $lookup: {
                from: 'dispatchs',
                localField: 'dispatch_id',
                foreignField: '_id',
                as: 'dispatch_details',
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
        const aggUnwindDispatchDetails = {
            $unwind: {
                path: '$dispatch_details',
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
            // match_common_query,
            aggLookupDispatchDetails,
            aggUnwindDispatchDetails,
            aggCreatedUserDetails,
            aggUpdatedUserDetails,
            aggUnwindCreatedUser,
            aggUnwindUpdatedUser,
            aggMatch,
            aggSort,
            aggSkip,
            aggLimit,
        ];

        const result = await dispatchModel.aggregate(list_aggregate);

        const aggCount = {
            $count: 'totalCount',
        };

        const count_total_docs = [
            // match_common_query,
            aggLookupDispatchDetails,
            aggUnwindDispatchDetails,
            aggCreatedUserDetails,
            aggUpdatedUserDetails,
            aggUnwindCreatedUser,
            aggUnwindUpdatedUser,
            aggMatch,
            aggCount,
        ];

        const total_docs = await dispatchModel.aggregate(count_total_docs);

        const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

        const response = new ApiResponse(200, 'Data Fetched Successfully', {
            data: result,
            totalPages: totalPages,
        });
        return res.status(200).json(response);
    }
);