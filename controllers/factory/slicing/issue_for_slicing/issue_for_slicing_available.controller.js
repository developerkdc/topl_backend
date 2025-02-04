import { StatusCodes } from '../../../../utils/constants.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';

import { issues_for_status } from '../../../../database/Utils/constants/constants.js';

import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import issue_for_slicing_available_model from '../../../../database/schema/factory/slicing/issue_for_slicing/issue_for_slicing_available_schema.js';


export const fetch_issue_for_slicing_available_details = catchAsync(
    async (req, res, next) => {
        const {
            page = 1,
            limit = 10,
            sortBy = 'updatdAt',
            sort = 'desc',
            search = '',
        } = req.query;

        const {
            string,
            boolean,
            numbers,
            arrayField = [],
        } = req.body.searchFields || {};

        const { filter } = req.body;

        let search_query = {};

        if (search != '' && req?.body?.searchFields) {
            const search_data = DynamicSearch(
                search,
                string,
                boolean,
                numbers,
                arrayField
            );

            if (search_data?.length === 0) {
                throw new ApiError('NO Data found...', StatusCodes.NOT_FOUND);
            }
            search_query = search_data;
        }

        const filterData = dynamic_filter(filter);

        const match_query = {
            ...search_query,
            ...filterData,
        };

        const aggLookupIssueForSlicing = {
            $lookup: {
                from: 'issued_for_slicings',
                localField: 'issue_for_slicing_id',
                foreignField: '_id',
                as: 'issue_for_slicing_details',
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

        const aggUnwindIssueForSlicing = {
            $unwind: {
                path: '$issue_for_slicing_details',
                preserveNullAndEmptyArrays: true,
            },
        };

        const aggUnwindCreatedUser = {
            $unwind: {
                path: '$created_user_details',
                preserveNullAndEmptyArrays: true,
            },
        };
        const aggUnwindUpdatdUser = {
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
            aggLookupIssueForSlicing,
            aggUnwindIssueForSlicing,
            aggCreatedUserDetails,
            aggUnwindCreatedUser,
            aggUpdatedUserDetails,
            aggUnwindUpdatdUser,
            aggMatch,
            aggSort,
            aggSkip,
            aggLimit,
        ];

        const result =
            await issue_for_slicing_available_model.aggregate(list_aggregate);

        const aggCount = {
            $count: 'totalCount',
        };

        const count_total_docs = [
            aggLookupIssueForSlicing,
            aggUnwindIssueForSlicing,
            aggCreatedUserDetails,
            aggUnwindCreatedUser,
            aggUpdatedUserDetails,
            aggUnwindUpdatdUser,
            aggMatch,
            aggCount,
        ];
        const total_docs =
            await issue_for_slicing_available_model.aggregate(count_total_docs);

        const totalPages = Math.ceil((total_docs?.[0]?.totalCount || 0) / limit);

        const response = new ApiResponse(
            StatusCodes.OK,
            'Data fetched successfully',
            {
                data: result,
                totalPages: totalPages,
            }
        );
        return res.status(StatusCodes.OK).json(response);
    }
);