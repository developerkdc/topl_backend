import mongoose, { isValidObjectId, set } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import issue_for_plywood_resizing_model from '../../../../database/schema/factory/plywood_resizing_factory/issue_for_resizing/issue_for_resizing.schema.js';

export const add_issue_for_colour_from_pressing = catchAsync(async (req, res) => {
    const userDetails = req.userDetails;
    const {  } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        
       const maxNumber = await plywood_production_model.aggregate([
               {
                 $group: {
                   _id: null,
                   max: {
                     $max: '$sr_no',
                   },
                 },
               },
             ]);
       
        const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
       
       
        const response = new ApiResponse(StatusCodes.OK, "Item Issued For Colour Successfully",{message:"this is add add_issue_for_colour_from_pressing"});
        
        await session?.commitTransaction();
        return res.status(StatusCodes.OK).json(response)

    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

export const revert_issue_for_colour = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError("ID is missing", StatusCodes.BAD_REQUEST)
    }
    if (!isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
    };

    const userDetails = req.userDetails;
    const session = await mongoose.startSession()
    try {
        session.startTransaction()
        

        const response = new ApiResponse(StatusCodes.OK, "Item Reverted Successfully",{message:"THis is revert cmc api"});
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response)

    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

export const listing_issued_for_colour = catchAsync(
    async (req, res, next) => {
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
            is_resizing_done: false
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
            aggCreatedByLookup,
            aggCreatedByUnwind,
            aggUpdatedByLookup,
            aggUpdatedByUnwind,
            aggMatch,
            aggSort,
            aggSkip,
            aggLimit,
        ]; // aggregation pipiline

        const issue_for_colour =
            await issue_for_plywood_resizing_model.aggregate(listAggregate);

        const aggCount = {
            $count: 'totalCount',
        }; // count aggregation stage

        const totalAggregate = [
            ...listAggregate?.slice(0, -2),
            aggCount,
        ]; // total aggregation pipiline

        const totalDocument =
            await issue_for_plywood_resizing_model.aggregate(totalAggregate);

        const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

        console.log("listing_issued_for_colour");
        const response = new ApiResponse(
            200,
            'Issue For Colour Data Fetched Successfully',
            {
                data: issue_for_colour,
                totalPages: totalPages,
            }
        );
        return res.status(200).json(response);
    }
);

export const fetch_single_issue_for_colour_item = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError("ID is missing", StatusCodes.NOT_FOUND)
    };
    if (!isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
    };

    const result = await issue_for_plywood_resizing_model.findOne({ _id: id }).lean();

    if (!result) {
        throw new ApiError("Issue for Colour data not found", StatusCodes.NOT_FOUND)
    };

    const response = new ApiResponse(StatusCodes.OK, "Colour Details fetched successfully", result);
    return res.status(StatusCodes.OK).json(response)
});