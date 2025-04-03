import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import plywood_resize_damage_model from '../../../../database/schema/factory/plywood_resizing_factory/resizing_damage/resizing_damage.schema.js';

export const listing_cnc_damage = catchAsync(
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

        const aggLookupIssueForResizing = {
            $lookup: {
                from: "issued_for_plywood_resizing_items",
                localField: "issue_for_resizing_id",
                foreignField: "_id",
                as: "issue_for_resizing_details"
            }
        }

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

        const aggUnwindIssueForResizing = {
            $unwind: {
                path: "$issue_for_resizing_details",
                preserveNullAndEmptyArrays: true
            }
        }
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
            aggLookupIssueForResizing,
            aggUnwindIssueForResizing,
            aggCreatedByLookup,
            aggCreatedByUnwind,
            aggUpdatedByLookup,
            aggUpdatedByUnwind,
            aggMatch,
            aggSort,
            aggSkip,
            aggLimit,
        ]; // aggregation pipiline

        const cnc_damage_list =
            await plywood_resize_damage_model.aggregate(listAggregate);

        const aggCount = {
            $count: 'totalCount',
        }; // count aggregation stage

        const totalAggregate = [
            ...listAggregate?.slice(0, -2),
            aggCount,
        ]; // total aggregation pipiline

        const [totalDocument] =
            await plywood_resize_damage_model.aggregate(totalAggregate);

        const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

        const response = new ApiResponse(
            StatusCodes.OK,
            'CNC Damage Data Fetched Successfully',
            {
                data: cnc_damage_list,
                totalPages: totalPages,
            }
        );
        return res.status(StatusCodes.OK).json(response);
    }
);

export const add_cnc_damage = catchAsync(async (req, res) => {
    const userDetails = req.userDetails;

    const session = await mongoose.startSession();
    try {
        session.startTransaction();


        const add_cnc_damage_data_result = [];
        const response = new ApiResponse(StatusCodes.CREATED, "CNC Damage Created Successfully", add_cnc_damage_data_result);
        await session.commitTransaction()
        return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});