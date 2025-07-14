import issue_for_order_model from '../../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';

export const fetch_all_raw_ready_for_packing = catchAsync(async (req, res) => {
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
        // is_challan_done: false,
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

    const issue_for_raw_packing =
        await issue_for_order_model.aggregate(listAggregate);

    const aggCount = {
        $count: 'totalCount',
    }; // count aggregation stage

    const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

    const totalDocument = await issue_for_order_model.aggregate(totalAggregate);

    const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
        StatusCodes.OK,
        'Issued For Raw Packing Data Fetched Successfully',
        {
            data: issue_for_raw_packing,
            totalPages: totalPages,
        }
    );
    return res.status(StatusCodes.OK).json(response);
})