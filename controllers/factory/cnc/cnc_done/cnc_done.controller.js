import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import issue_for_plywood_resizing_model from '../../../../database/schema/factory/plywood_resizing_factory/issue_for_resizing/issue_for_resizing.schema.js';
import { plywood_resizing_done_details_model } from '../../../../database/schema/factory/plywood_resizing_factory/resizing_done/resizing.done.schema.js';
import plywood_resize_damage_model from '../../../../database/schema/factory/plywood_resizing_factory/resizing_damage/resizing_damage.schema.js';
import { face_inventory_items_details } from '../../../../database/schema/inventory/face/face.schema.js';

export const create_cnc = catchAsync(async (req, res) => {
    const userDetails = req.userDetails;

    const session = await mongoose.startSession();
    try {
        session.startTransaction()
        const add_resizing_data_result=[];
        const response = new ApiResponse(StatusCodes.CREATED, "CNC Created Successfully", add_resizing_data_result);
        await session.commitTransaction()
        return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

export const update_cnc_done = catchAsync(async (req, res) => {
    const userDetails = req.userDetails;
    const { id } = req.params;
    const { cnc_details, is_damage } = req.body
    const session = await mongoose.startSession();
    try {
        session.startTransaction()
        if (!id) {
            throw new ApiError("ID is missing.", StatusCodes.BAD_REQUEST)
        };
        if (!resizing_details) {
            throw new ApiError("CNC details are missing.", StatusCodes.BAD_REQUEST)
        };
        if (!isValidObjectId(id)) {
            throw new ApiError("Invalid ID.", StatusCodes.BAD_REQUEST)
        };
        const cnc_done_data = await plywood_resizing_done_details_model?.findById(id).lean();

        if (!cnc_done_data) {
            throw new ApiError("CNC done data not found", StatusCodes.NOT_FOUND)
        };

       const update_cnc_done_result=[];
        const response = new ApiResponse(StatusCodes.OK, "Resizing Item Updated Successfully", update_cnc_done_result);
        await session.commitTransaction()
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

export const listing_resizing_done = catchAsync(
    async (req, res) => {
        const {
            page = 1,
            limit = 10,
            sortBy = 'updatedAt',
            sort = 'desc',
            search = '',
        } = req.query;
        const {
            string,
            boolean,
            numbers,
            arrayField = [],
        } = req?.body?.searchFields || {};
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
            ...filterData,
            ...search_query
        };

        // Aggregation stage
        const aggCommonMatch = {
            $match: {
                "available_details.no_of_sheets": { $ne: 0 }
            },
        };

        const aggCreatedByLookup = {
            $lookup: {
                from: 'users',
                localField: 'created_by',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            user_name: 1,
                            user_type: 1,
                            dept_name: 1,
                            first_name: 1,
                            last_name: 1,
                            email_id: 1,
                            mobile_no: 1,
                        },
                    },
                ],
                as: 'created_by',
            },
        };
        const aggUpdatedByLookup = {
            $lookup: {
                from: 'users',
                localField: 'updated_by',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            user_name: 1,
                            user_type: 1,
                            dept_name: 1,
                            first_name: 1,
                            last_name: 1,
                            email_id: 1,
                            mobile_no: 1,
                        },
                    },
                ],
                as: 'updated_by',
            },
        };
        const aggCreatedByUnwind = {
            $unwind: {
                path: '$created_by',
                preserveNullAndEmptyArrays: true,
            },
        };
        const aggUpdatedByUnwind = {
            $unwind: {
                path: '$updated_by',
                preserveNullAndEmptyArrays: true,
            },
        };
        const aggMatch = {
            $match: {
                ...match_query,
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

        const listAggregate = [
            aggCommonMatch,
            aggCreatedByLookup,
            aggCreatedByUnwind,
            aggUpdatedByLookup,
            aggUpdatedByUnwind,
            aggMatch,
            aggSort,
            aggSkip,
            aggLimit,
        ]; // aggregation pipiline

        const resizing_done_list =
            await plywood_resizing_done_details_model.aggregate(listAggregate);

        const aggCount = {
            $count: 'totalCount',
        }; // count aggregation stage

        const totalAggregate = [
            ...listAggregate?.slice(0, -2),
            aggCount,
        ]; // total aggregation pipiline

        const [totalDocument] =
            await plywood_resizing_done_details_model.aggregate(totalAggregate);

        const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

        const response = new ApiResponse(
            200,
            'Resizing Done Data Fetched Successfully',
            {
                data: resizing_done_list,
                totalPages: totalPages,
            }
        );
        return res.status(200).json(response);
    }
);

export const fetch_single_resizing_done_item_with_issue_for_resizing_data = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError("ID is missing", StatusCodes.NOT_FOUND)
    }
    if (!isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
    };

    const pipeline = [
        {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(id)
            }
        },
        {
            $lookup: {
                from: "issued_for_plywood_resizing_items",
                localField: "issue_for_resizing_id",
                foreignField: "_id",
                as: "issue_for_resizing_details"
            }
        },
        {
            $unwind: {
                path: "$issue_for_resizing_details",
                preserveNullAndEmptyArrays: true
            }
        }
    ];

    const result = await plywood_resizing_done_details_model.aggregate(pipeline)
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, "Resizing details fetched successfully", result))

});

export const revert_resizing_done_items = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userDetails = req.userDetails
    if (!id) {
        throw new ApiError("ID is missing", StatusCodes.BAD_REQUEST)
    }
    if (!isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
    };
    const session = await mongoose.startSession()
    try {
        await session.startTransaction()
        const resizing_done_data = await plywood_resizing_done_details_model?.findById(id).lean();

        if (!resizing_done_data) {
            throw new ApiError("Resizing done data not found", StatusCodes.NOT_FOUND)
        };

        const [delete_resizing_done_result, delete_resizing_damage_result] = await Promise.all([await plywood_resizing_done_details_model?.deleteOne({ _id: resizing_done_data?._id }, { session }), await plywood_resize_damage_model.deleteOne({ issue_for_resizing_id: resizing_done_data?.issue_for_resizing_id }, { session })]);

        if (!delete_resizing_done_result?.acknowledged || delete_resizing_done_result?.deletedCount === 0) {
            throw new ApiError("Failed to delete resizing done details", StatusCodes.BAD_REQUEST)
        }
        if (!delete_resizing_damage_result?.acknowledged || delete_resizing_damage_result?.deletedCount === 0) {
            throw new ApiError("Failed to delete resizing damage details", StatusCodes.BAD_REQUEST)
        };

        if (resizing_done_data?.face_item_details?.length > 0) {
            const restoreBulkOperations = resizing_done_data?.face_item_details?.map(face => ({
                updateOne: {
                    filter: { _id: face?.face_item_id },
                    update: {
                        $inc: {
                            available_sheets: face?.no_of_sheets,
                            available_amount: face?.amount,
                            available_sqm: face?.sqm
                        },
                        $set: { updated_by: userDetails?._id }
                    }
                }
            }));

            if (restoreBulkOperations?.length > 0) {
                const result = await face_inventory_items_details.bulkWrite(restoreBulkOperations, { session });
                if (result?.modifiedCount === 0) {
                    throw new ApiError("Failed to update face inventory item details", StatusCodes.BAD_REQUEST)
                }
            }
        };

        const update_is_resizing_done_status_from_issue_for_resizing = await issue_for_plywood_resizing_model?.updateOne({ _id: resizing_done_data?.issue_for_resizing_id }, {
            $set: {
                is_resizing_done: false
            }
        }, { session });

        if (update_is_resizing_done_status_from_issue_for_resizing.matchedCount === 0) {
            throw new ApiError("Issue for resizing item not found.", StatusCodes.NOT_FOUND)
        }

        if (!update_is_resizing_done_status_from_issue_for_resizing?.acknowledged || update_is_resizing_done_status_from_issue_for_resizing.modifiedCount === 0) {
            throw new ApiError("Failed to update resizind done status.", StatusCodes.NOT_FOUND)
        }

        const response = new ApiResponse(StatusCodes.OK, "Resizing details Reverted Successfully", delete_resizing_done_result)
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response)
    } catch (error) {
        await session?.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }


});