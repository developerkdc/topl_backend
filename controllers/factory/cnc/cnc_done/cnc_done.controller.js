import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { plywood_resizing_done_details_model } from '../../../../database/schema/factory/plywood_resizing_factory/resizing_done/resizing.done.schema.js';
import issue_for_cnc_model from '../../../../database/schema/factory/cnc/issue_for_cnc/issue_for_cnc.schema.js';
import { cnc_done_details_model } from '../../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';

//done
export const create_cnc = catchAsync(async (req, res) => {
    const userDetails = req.userDetails;
    const { cnc_done_details } = req.body;
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        if (!cnc_done_details) {
            throw new ApiError("CNC Done details not found.", StatusCodes.NOT_FOUND)
        }
        if (!isValidObjectId(cnc_done_details?.issue_for_cnc_id)) {
            throw new ApiError("Invalid Issue for CNC ID.", StatusCodes.BAD_REQUEST)
        };

        const issue_for_cnc_details = await issue_for_cnc_model.findById(cnc_done_details?.issue_for_cnc_id).session(session).lean();

        if (!issue_for_cnc_details) {
            throw new ApiError("Issue for CNC Details not found.", StatusCodes.NOT_FOUND)
        };

        const [max_sr_no] = await cnc_done_details_model.aggregate([{
            $group: {
                _id: null,
                max_sr_no: {
                    $max: "$sr_no"
                }
            }
        }])
        const updated_cnc_done_details = {
            ...cnc_done_details,
            sr_no: max_sr_no ? max_sr_no?.max_sr_no + 1 : 1,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
        };

        const [create_cnc_result] = await cnc_done_details_model.create([updated_cnc_done_details], { session });

        if (!create_cnc_result) {
            throw new ApiError("Failed to add cnc done data", StatusCodes.BAD_REQUEST)
        };

        const update_issue_for_cnc_details = await issue_for_cnc_model.updateOne({ _id: issue_for_cnc_details?._id }, {
            $inc: {
                "available_details.no_of_sheets": -create_cnc_result?.no_of_sheets,
                "available_details.sqm": -create_cnc_result?.sqm,
                "available_details.amount": -create_cnc_result?.amount
            }, $set: {
                updated_by: userDetails?._id
            }
        }, { session });

        if (update_issue_for_cnc_details?.matchedCount === 0) {
            throw new ApiError("Issue for CNC Details not found.", StatusCodes.NOT_FOUND)
        };

        if (!update_issue_for_cnc_details?.acknowledged || update_issue_for_cnc_details?.modifiedCount === 0) {
            throw new ApiError("Failed to update issue for cnc details", StatusCodes.BAD_REQUEST)
        };
        const response = new ApiResponse(StatusCodes.CREATED, "CNC Created Successfully", create_cnc_result);
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
    const { cnc_details } = req.body
    const session = await mongoose.startSession();
    try {
        session.startTransaction()
        if (!id) {
            throw new ApiError("ID is missing.", StatusCodes.BAD_REQUEST)
        };
        if (!cnc_details) {
            throw new ApiError("CNC details are missing.", StatusCodes.BAD_REQUEST)
        };
        if (!isValidObjectId(id)) {
            throw new ApiError("Invalid ID.", StatusCodes.BAD_REQUEST)
        };

        const issue_for_cnc_details = await issue_for_cnc_model.findById(id).lean().session(session);

        if (!issue_for_cnc_details) {
            throw new ApiError("Issue for cnc details not found.", StatusCodes.BAD_REQUEST)
        }
        const cnc_done_data = await plywood_resizing_done_details_model?.findById(id).lean();

        if (!cnc_done_data) {
            throw new ApiError("CNC done data not found", StatusCodes.NOT_FOUND)
        };



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

//done
export const listing_cnc_done = catchAsync(
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
            ...search_query,
        };

        // Aggregation stage
        const aggCommonMatch = {
            $match: {
                "available_details.no_of_sheets": { $gt: 0 }
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

        const cnc_done_list =
            await cnc_done_details_model.aggregate(listAggregate);

        const aggCount = {
            $count: 'totalCount',
        }; // count aggregation stage

        const totalAggregate = [
            ...listAggregate?.slice(0, -2),
            aggCount,
        ]; // total aggregation pipiline

        const [totalDocument] =
            await cnc_done_details_model.aggregate(totalAggregate);

        const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

        const response = new ApiResponse(
            StatusCodes.OK,
            'CNC Done Data Fetched Successfully',
            {
                data: cnc_done_list,
                totalPages: totalPages,
            }
        );
        return res.status(200).json(response);
    }
);

export const fetch_single_cnc_done_item_with_issue_for_cnc_data = catchAsync(async (req, res) => {
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
                from: "issued_for_cnc_details",
                localField: "issue_for_cnc_id",
                foreignField: "_id",
                as: "issue_for_cnc_details"
            }
        },
        {
            $unwind: {
                path: "$issue_for_cnc_details",
                preserveNullAndEmptyArrays: true
            }
        }
    ];

    const result = await cnc_done_details_model.aggregate(pipeline)
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, "CNC details fetched successfully", result))

});

export const revert_cnc_done_items = catchAsync(async (req, res) => {
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
        session.startTransaction()

        const cnc_done_data = await cnc_done_details_model.findById(id).session(session).lean();

        if (!cnc_done_data) {
            throw new ApiError("CNC done data not found", StatusCodes.NOT_FOUND)
        };

        const delete_cnc_done_data_result = await cnc_done_details_model.deleteOne({ _id: cnc_done_data?._id }, { session });

        if (!delete_cnc_done_data_result?.acknowledged || delete_cnc_done_data_result.deletedCount === 0) {
            throw new ApiError("Failed to delete cnc done details", StatusCodes.BAD_REQUEST)
        }
        const update_issue_for_cnc_update_result = await issue_for_cnc_model.updateOne({ _id: cnc_done_data?.issue_for_cnc_id }, {
            $inc: {
                "available_details.sqm": cnc_done_data?.available_details?.sqm,
                "available_details.no_of_sheets": cnc_done_data?.available_details?.no_of_sheets,
                "available_details.amount": cnc_done_data?.available_details?.amount,
            }, $set: {
                updated_by: userDetails?._id
            }
        }, { session });

        if (update_issue_for_cnc_update_result?.matchedCount === 0) {
            throw new ApiError("Issue for cnc details not found.", StatusCodes.NOT_FOUND)
        }
        if (!update_issue_for_cnc_update_result.acknowledged || update_issue_for_cnc_update_result?.modifiedCount === 0) {
            throw new ApiError("Failed to update issue for cnc details", StatusCodes.BAD_REQUEST)
        };
        const response = new ApiResponse(StatusCodes.OK, "CNC items Reverted Successfully", update_issue_for_cnc_update_result)
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response)
    } catch (error) {
        await session?.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

