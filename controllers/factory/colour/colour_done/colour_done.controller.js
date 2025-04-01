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

export const create_colour = catchAsync(async (req, res) => {
    const userDetails = req.userDetails;

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

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
    

        const add_resizing_data_result=[];
        const response = new ApiResponse(StatusCodes.CREATED, "Colour Created Successfully", add_resizing_data_result);
        await session.commitTransaction()
        return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

export const update_colour_done = catchAsync(async (req, res) => {
    const userDetails = req.userDetails;
    const { id } = req.params;
    const { colour_details, is_damage } = req.body
    const session = await mongoose.startSession();
    try {
        session.startTransaction()
        if (!id) {
            throw new ApiError("ID is missing.", StatusCodes.BAD_REQUEST)
        };
        if (!resizing_details) {
            throw new ApiError("Colour details are missing.", StatusCodes.BAD_REQUEST)
        };
        if (!isValidObjectId(id)) {
            throw new ApiError("Invalid ID.", StatusCodes.BAD_REQUEST)
        };
        const colour_done_data = await plywood_resizing_done_details_model?.findById(id).lean();

        if (!colour_done_data) {
            throw new ApiError("Colour done data not found", StatusCodes.NOT_FOUND)
        };

       const update_colour_done_result=[];
        const response = new ApiResponse(StatusCodes.OK, "Resizing Item Updated Successfully", update_colour_done_result);
        await session.commitTransaction()
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

export const listing_colour_done = catchAsync(
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

        const colour_done_list =
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
            'Colour Done Data Fetched Successfully',
            {
                data: colour_done_list,
                totalPages: totalPages,
            }
        );
        return res.status(200).json(response);
    }
);

export const fetch_single_colour_done_item_with_issue_for_colour_data = catchAsync(async (req, res) => {
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

export const revert_colour_done_items = catchAsync(async (req, res) => {
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

        const colour_done_data = await plywood_resizing_done_details_model?.findById(id).lean();

        if (!colour_done_data) {
            throw new ApiError("Colour done data not found", StatusCodes.NOT_FOUND)
        };
        const delete_colour_done_result=[];
        const response = new ApiResponse(StatusCodes.OK, "Colour details Reverted Successfully", delete_colour_done_result)
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response)
    } catch (error) {
        await session?.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }


});