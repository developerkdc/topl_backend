import { StatusCodes } from '../../../../utils/constants.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';
import {
    issue_for_dressing_model,
    slicing_done_items_model,
    slicing_done_other_details_model,
} from '../../../../database/schema/factory/slicing/slicing_done.schema.js';
import {
    peeling_done_items_model,
    peeling_done_other_details_model,
} from '../../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import mongoose, { isValidObjectId } from 'mongoose';
import {
    dressing_done_items_model,
    dressing_done_other_details_model,
} from '../../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import dressing_done_history_model from '../../../../database/schema/factory/dressing/dressing_done/dressing.done.history.schema.js';

export const create_dressing = catchAsync(async (req, res, next) => {
<<<<<<< HEAD
    const { _id } = req.userDetails;
    const { other_details, item_details } = req.body;
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();
        for (let field of ['other_details', 'item_details']) {
            if (!req.body[field]) throw new ApiError(`${field} is required..`, StatusCodes.NOT_FOUND);
        }

        if (!Array.isArray(item_details)) {
            throw new ApiError(
                'Item Details must be an array',
                StatusCodes.NOT_FOUND
            );
        }
        if (item_details?.length === 0) {
            throw new ApiError(
                'At least one item is required',
                StatusCodes.NOT_FOUND
            );
        }

        const total_no_of_leaves_by_log_no_code = item_details?.reduce(
            (acc, item) => {
                acc[item?.log_no_code] =
                    (acc[item?.log_no_code] || 0) + item.no_of_leaves;
                return acc;
            },
            {}
        );
        const add_peeling_done_item = async () => {
            const peeling_done_details = await peeling_done_items_model.find({
                peeling_done_other_details_id:
                    other_details?.peeling_done_other_details_id,
            });
            if (peeling_done_details.length === 0) {
                throw new ApiError(
                    'Peeling Done item details no found..!',
                    StatusCodes.NOT_FOUND
                );
            }
            const peelingDoneMap = peeling_done_details?.reduce((acc, item) => {
                acc[item.log_no_code] = item;
                return acc;
            }, {});
            for (let item of item_details) {
                const peeling_done_data = peelingDoneMap[item?.log_no_code];

                if (
                    total_no_of_leaves_by_log_no_code[item?.log_no_code] !==
                    peeling_done_data?.no_of_leaves
                ) {
                    throw new ApiError(
                        `No.of Leaves Missmatch for ${item?.log_no_code}, Actual No. of Leaves Issued : ${item?.no_of_leaves}, Dressing Done No.of Leaves : ${item?.no_of_leaves} `,
                        StatusCodes.BAD_REQUEST
                    );
                }

                if (item.thickness !== peeling_done_data?.thickness) {
                    throw new ApiError(
                        `Thickness missmatch for Log No.Code ${item?.log_no_code}`
                    );
                }
            }

            const updated_item_details = item_details?.map((item) => {
                item.dressing_done_other_details_id = add_other_details?._id;
                item.created_by = _id;
                item.updated_by = _id;
                return item;
            });

            const add_items_result = await dressing_done_items_model.insertMany(
                updated_item_details,
                { session }
            );



            if (add_items_result?.length === 0) {
                throw new ApiError('Failed to add items', StatusCodes.BAD_REQUEST);
            }
            const update_dressing_done_status = await peeling_done_items_model.updateMany({
                peeling_done_other_details_id: add_other_details?.peeling_done_other_details_id
            }, {
                $set: {
                    is_dressing_done: true,
                    issue_status: issues_for_status.dressing
                }
            }, { session });

            if (!update_dressing_done_status.acknowledged || update_dressing_done_status.modifiedCount === 0) {
                throw new ApiError("Failed to updated dressing done status ", StatusCodes.BAD_REQUEST)
            };

            const peeling_done_other_details_update_result = await peeling_done_other_details_model.updateOne({ _id: other_details?.peeling_done_other_details_id }, {
                $set: {
                    isEditable: false
                }
            }, { session });

            if (!peeling_done_other_details_update_result.acknowledged || peeling_done_other_details_update_result.modifiedCount === 0) {
                throw new ApiError("Failed to update is peeling done editable status", StatusCodes.BAD_REQUEST)
            };


        };

        const add_slicing_done_item = async () => {
            const slicing_done_details = await slicing_done_items_model
                .find({
                    slicing_done_other_details_id:
                        other_details?.slicing_done_other_details_id,
                })
                .session(session);
            if (slicing_done_details.length === 0) {
                throw new ApiError(
                    'Slicing Done item details no found.',
                    StatusCodes.NOT_FOUND
                );
            }
            const slicingDoneMap = slicing_done_details?.reduce((acc, item) => {
                acc[item.log_no_code] = item;
                return acc;
            }, {});
            console.log(total_no_of_leaves_by_log_no_code)
            for (let item of item_details) {
                const slicing_done_data = slicingDoneMap[item?.log_no_code];
                if (
                    total_no_of_leaves_by_log_no_code[item?.log_no_code] !==
                    slicing_done_data?.no_of_leaves
                ) {
                    throw new ApiError(
                        `No.of Leaves Missmatch for ${item?.log_no_code}, Actual No. of Leaves Issued : ${slicing_done_data?.no_of_leaves}, Dressing Done No.of Leaves : ${item?.no_of_leaves} `,
                        StatusCodes.BAD_REQUEST
                    );
                }

                if (item.thickness !== slicing_done_data?.thickness) {
                    throw new ApiError(
                        `Thickness missmatch for Log No.Code ${item?.log_no_code}, Provided : ${item?.thickness},Actual : ${slicing_done_data?.thickness} Thickness`
                    );
                }
            }

            const updated_item_details = item_details?.map((item) => {
                item.dressing_done_other_details_id = add_other_details?._id;
                item.created_by = _id;
                item.updated_by = _id;
                return item;
            });

            const add_items_result = await dressing_done_items_model.insertMany(
                updated_item_details,
                { session }
            );

            if (add_items_result?.length === 0) {
                throw new ApiError('Failed to add items', StatusCodes.BAD_REQUEST);
            }

            const update_dressing_done_status =
                await slicing_done_items_model.updateMany(
                    {
                        slicing_done_other_details_id:
                            other_details?.slicing_done_other_details_id,
                    },
                    {
                        $set: {
                            is_dressing_done: true,
                            issue_status: issues_for_status?.dressing
                        },
                    },
                    { session }
                );

            if (
                !update_dressing_done_status.acknowledged ||
                update_dressing_done_status.modifiedCount === 0
            ) {
                throw new ApiError(
                    'Failed to updated dressing done status ',
                    StatusCodes.BAD_REQUEST
                );
                const slicing_done_other_details_update_result = await slicing_done_other_details_model.updateOne({ _id: other_details?.slicing_done_other_details_id }, {
                    $set: {
                        isEditable: false
                    }
                }, { session });

                if (!slicing_done_other_details_update_result.acknowledged || slicing_done_other_details_update_result.modifiedCount === 0) {
                    throw new ApiError("Failed to update is slicing done editable status", StatusCodes.BAD_REQUEST)
                };
            }
        };

        const [add_other_details] = await dressing_done_other_details_model.create(
            [
                {
                    ...other_details,
                    created_by: _id,
                    updated_by: _id,
                },
            ],
            { session }
        );

        if (other_details?.peeling_done_other_details_id) {
            await add_peeling_done_item();
        }
        if (other_details?.slicing_done_other_details_id) {
            await add_slicing_done_item();
        }


        await session.commitTransaction();
        const response = new ApiResponse(
            StatusCodes.OK,
            'Dressing Done Successfully',
            { other_details, item_details }
        );
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        await session.endSession();
=======
  const { _id } = req.userDetails;
  const { other_details, item_details } = req.body;
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    for (let field of ['other_details', 'item_details']) {
      if (!req.body[field])
        throw new ApiError(`${field} is required..`, StatusCodes.NOT_FOUND);
>>>>>>> 3946c6b304d544d7155b3df6522d27c71315fb95
    }

    if (!Array.isArray(item_details)) {
        throw new ApiError(
            'Item Details must be an array',
            StatusCodes.NOT_FOUND
        );
    }
    if (item_details?.length === 0) {
        throw new ApiError(
            'At least one item is required',
            StatusCodes.NOT_FOUND
        );
    }

    const total_no_of_leaves_by_log_no_code = item_details?.reduce(
        (acc, item) => {
            acc[item?.log_no_code] =
                (acc[item?.log_no_code] || 0) + item.no_of_leaves;
            return acc;
        },
        {}
    );
    const add_peeling_done_item = async () => {
        const peeling_done_details = await peeling_done_items_model.find({
            peeling_done_other_details_id:
                other_details?.peeling_done_other_details_id,
        });
        if (peeling_done_details.length === 0) {
            throw new ApiError(
                'Peeling Done item details no found..!',
                StatusCodes.NOT_FOUND
            );
        }
        const peelingDoneMap = peeling_done_details?.reduce((acc, item) => {
            acc[item.log_no_code] = item;
            return acc;
        }, {});
        for (let item of item_details) {
            const peeling_done_data = peelingDoneMap[item?.log_no_code];

            if (
                total_no_of_leaves_by_log_no_code[item?.log_no_code] !==
                peeling_done_data?.no_of_leaves
            ) {
                throw new ApiError(
                    `No.of Leaves Missmatch for ${item?.log_no_code}, Actual No. of Leaves Issued : ${item?.no_of_leaves}, Dressing Done No.of Leaves : ${item?.no_of_leaves} `,
                    StatusCodes.BAD_REQUEST
                );
            }

            if (item.thickness !== peeling_done_data?.thickness) {
                throw new ApiError(
                    `Thickness missmatch for Log No.Code ${item?.log_no_code}`
                );
            }
        }

        const updated_item_details = item_details?.map((item) => {
            item.dressing_done_other_details_id = add_other_details?._id;
            item.created_by = _id;
            item.updated_by = _id;
            return item;
        });

        const add_items_result = await dressing_done_items_model.insertMany(
            updated_item_details,
            { session }
        );

        if (add_items_result?.length === 0) {
            throw new ApiError('Failed to add items', StatusCodes.BAD_REQUEST);
        }
        const update_dressing_done_status =
            await peeling_done_items_model.updateMany(
                {
                    peeling_done_other_details_id:
                        add_other_details?.peeling_done_other_details_id,
                },
                {
                    $set: {
                        is_dressing_done: true,
                    },
                },
                { session }
            );

        if (
            !update_dressing_done_status.acknowledged ||
            update_dressing_done_status.modifiedCount === 0
        ) {
            throw new ApiError(
                'Failed to updated dressing done status ',
                StatusCodes.BAD_REQUEST
            );
        }
    };

    const add_slicing_done_item = async () => {
        const slicing_done_details = await slicing_done_items_model
            .find({
                slicing_done_other_details_id:
                    other_details?.slicing_done_other_details_id,
            })
            .session(session);
        if (slicing_done_details.length === 0) {
            throw new ApiError(
                'Slicing Done item details no found.',
                StatusCodes.NOT_FOUND
            );
        }
        const slicingDoneMap = slicing_done_details?.reduce((acc, item) => {
            acc[item.log_no_code] = item;
            return acc;
        }, {});
        console.log(total_no_of_leaves_by_log_no_code);
        for (let item of item_details) {
            const slicing_done_data = slicingDoneMap[item?.log_no_code];
            if (
                total_no_of_leaves_by_log_no_code[item?.log_no_code] !==
                slicing_done_data?.no_of_leaves
            ) {
                throw new ApiError(
                    `No.of Leaves Missmatch for ${item?.log_no_code}, Actual No. of Leaves Issued : ${slicing_done_data?.no_of_leaves}, Dressing Done No.of Leaves : ${item?.no_of_leaves} `,
                    StatusCodes.BAD_REQUEST
                );
            }

            if (item.thickness !== slicing_done_data?.thickness) {
                throw new ApiError(
                    `Thickness missmatch for Log No.Code ${item?.log_no_code}, Provided : ${item?.thickness},Actual : ${slicing_done_data?.thickness} Thickness`
                );
            }
        }

        const updated_item_details = item_details?.map((item) => {
            item.dressing_done_other_details_id = add_other_details?._id;
            item.created_by = _id;
            item.updated_by = _id;
            return item;
        });

        const add_items_result = await dressing_done_items_model.insertMany(
            updated_item_details,
            { session }
        );

        if (add_items_result?.length === 0) {
            throw new ApiError('Failed to add items', StatusCodes.BAD_REQUEST);
        }

        const update_dressing_done_status =
            await slicing_done_items_model.updateMany(
                {
                    slicing_done_other_details_id:
                        other_details?.slicing_done_other_details_id,
                },
                {
                    $set: {
                        is_dressing_done: true,
                    },
                },
                { session }
            );

        if (
            !update_dressing_done_status.acknowledged ||
            update_dressing_done_status.modifiedCount === 0
        ) {
            throw new ApiError(
                'Failed to updated dressing done status ',
                StatusCodes.BAD_REQUEST
            );
        }
    };

    const [add_other_details] = await dressing_done_other_details_model.create(
        [
            {
                ...other_details,
                created_by: _id,
                updated_by: _id,
            },
        ],
        { session }
    );

    if (other_details?.peeling_done_other_details_id) {
        await add_peeling_done_item();
    }
    if (other_details?.slicing_done_other_details_id) {
        await add_slicing_done_item();
    }

    await session.commitTransaction();
    const response = new ApiResponse(
        StatusCodes.OK,
        'Dressing Done Successfully',
        { other_details, item_details }
    );
    return res.status(StatusCodes.OK).json(response);
} catch (error) {
    await session.abortTransaction();
    next(error);
} finally {
    await session.endSession();
}
});

export const fetch_all_dressing_done_items = catchAsync(async (req, res) => {
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
    } = req.body.searchFields || {};

    const { filter } = req.body;
    let search_query = {};

<<<<<<< HEAD
    if (search != '' && req?.body?.searchFields) {
        const search_data = DynamicSearch(
            search,
            boolean,
            numbers,
            string,
            arrayField
        );

        if (search_data?.length === 0) {
            throw new ApiError('NO Data found...', StatusCodes.NOT_FOUND);
        }
        search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const matchQuery = {
        ...search_query,
        ...filterData,

    };

    const aggMatch = {
        $match: {
            ...matchQuery,
            issue_status: null
        },
    };

    const aggGroupBy = {
        $group: {
            _id: "$pallet_number",
            item_name: {
                $first: "$item_name"
            },
            item_sub_cat: {
                $first: "$item_sub_category_name"
            },
            log_no_code: {
                $first: "$log_no_code"
            },
            bundles: {
                $push: "$$ROOT"
            },
            total_bundles: {
                $sum: 1
            },
            available_bundles: {
                $sum: {
                    $cond: {
                        if: { $eq: ["$issue_status", null] },
                        then: 1,
                        else: 0
                    }
                }
            }
        }

    }
    const aggLookupOtherDetails = {
        $lookup: {
            from: "dressing_done_other_details",
            localField: "dressing_done_other_details_id",
            foreignField: "_id",
            as: "dressing_done_other_details"
        }
    }

    const aggUnwindOtherDetails = {
        $unwind: {
            path: "$dressing_done_other_details",
            preserveNullAndEmptyArrays: true
        }
    }

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

    const aggUnwindCreatedUserDetails = {
        $unwind: {
            path: "$created_user_details",
            preserveNullAndEmptyArrays: true
        }
    }
    const aggUnwindUpdatedUserDetails = {
        $unwind: {
            path: "$updated_user_details",
            preserveNullAndEmptyArrays: true
        }
    }

    const aggSort = {
        $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
    };

    const aggSkip = {
        $skip: (parseInt(page) - 1) * parseInt(limit),
    };

    const aggLimit = {
        $limit: parseInt(limit),
    };

    const all_aggregates = [aggLookupOtherDetails, aggUnwindOtherDetails, aggCreatedUserDetails, aggUpdatedUserDetails, aggUnwindCreatedUserDetails, aggGroupBy, aggUnwindUpdatedUserDetails, aggMatch, aggSort, aggSkip, aggLimit];


    const list_dressing_done_items =
        await dressing_done_items_model.aggregate(all_aggregates);

    const aggCount = {
        $count: 'totalCount',
    };

    const aggCountTotalDocs = [aggLookupOtherDetails, aggCreatedUserDetails, aggUpdatedUserDetails, aggUnwindOtherDetails, aggUnwindCreatedUserDetails, aggUnwindUpdatedUserDetails, aggMatch, aggCount];

    const total_docs =
        await dressing_done_items_model.aggregate(aggCountTotalDocs);

    const totalPages = Math.ceil(
        (total_docs?.[0]?.totalCount || 0) / parseInt(limit)
=======
  if (search != '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
>>>>>>> 3946c6b304d544d7155b3df6522d27c71315fb95
    );

    if (search_data?.length === 0) {
        throw new ApiError('NO Data found...', StatusCodes.NOT_FOUND);
    }
    search_query = search_data;
}

  const filterData = dynamic_filter(filter);

const matchQuery = {
    ...search_query,
    ...filterData,
};

const aggMatch = {
    $match: {
        ...matchQuery,
    },
};

const aggGroupBy = {
    $group: {
        _id: '$pallet_number',
        item_name: {
            $first: '$item_name',
        },
        item_sub_cat: {
            $first: '$item_sub_category_name',
        },
        log_no_code: {
            $first: '$log_no_code',
        },
        bundles: {
            $push: '$$ROOT',
        },
        total_bundles: {
            $sum: 1,
        },
        available_bundles: {
            $sum: {
                $cond: {
                    if: { $eq: ['$issue_status', null] },
                    then: 1,
                    else: 0,
                },
            },
        },
    },
};
const aggLookupOtherDetails = {
    $lookup: {
        from: 'dressing_done_other_details',
        localField: 'dressing_done_other_details_id',
        foreignField: '_id',
        as: 'dressing_done_other_details',
    },
};

const aggUnwindOtherDetails = {
    $unwind: {
        path: '$dressing_done_other_details',
        preserveNullAndEmptyArrays: true,
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

const aggUnwindCreatedUserDetails = {
    $unwind: {
        path: '$created_user_details',
        preserveNullAndEmptyArrays: true,
    },
};
const aggUnwindUpdatedUserDetails = {
    $unwind: {
        path: '$updated_user_details',
        preserveNullAndEmptyArrays: true,
    },
};

const aggSort = {
    $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
};

const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
};

const aggLimit = {
    $limit: parseInt(limit),
};

const all_aggregates = [
    aggLookupOtherDetails,
    aggUnwindOtherDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUserDetails,
    aggGroupBy,
    aggUnwindUpdatedUserDetails,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
];

const list_dressing_done_items =
    await dressing_done_items_model.aggregate(all_aggregates);

const aggCount = {
    $count: 'totalCount',
};

const aggCountTotalDocs = [
    aggLookupOtherDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindOtherDetails,
    aggUnwindCreatedUserDetails,
    aggUnwindUpdatedUserDetails,
    aggMatch,
    aggCount,
];

const total_docs =
    await dressing_done_items_model.aggregate(aggCountTotalDocs);

const totalPages = Math.ceil(
    (total_docs?.[0]?.totalCount || 0) / parseInt(limit)
);

const response = new ApiResponse(
    StatusCodes.OK,
    'Dressing Done List Fetched Successfully',
    { data: list_dressing_done_items, totalPages: totalPages }
);

return res.status(StatusCodes.OK).json(response);
});

export const fetch_all_dressing_done_items_by_other_details_id = catchAsync(
    async (req, res) => {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
        }

        const pipeline = [
            {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(id),
                },
            },
            {
                $lookup: {
                    from: 'issue_for_dressing',
                    let: {
                        peeling_done_other_details_id: '$peeling_done_other_details_id',
                        slicing_done_other_details_id: '$slicing_done_other_details_id',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        {
                                            $eq: [
                                                '$peeling_done_other_details_id',
                                                '$$peeling_done_other_details_id',
                                            ],
                                        },
                                        {
                                            $eq: [
                                                '$slicing_done_other_details_id',
                                                '$$slicing_done_other_details_id',
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                created_user_details: 0,
                                updated_user_details: 0,
                            },
                        },
                    ],
                    as: 'issued_for_dressing_details',
                },
            },
            // {
            //     $unwind: {
            //         path: "$issued_details",
            //         preserveNullAndEmptyArrays: true
            //     }
            // },
            {
                $lookup: {
                    from: 'dressing_done_items',
                    foreignField: 'dressing_done_other_details_id',
                    localField: '_id',
                    as: 'dressing_done_items',
                },
            },
        ];

        const result = await dressing_done_other_details_model.aggregate(pipeline);

        const response = new ApiResponse(
            StatusCodes.OK,
            'All Dressing Done items fetched successfully.',
            result
        );

        return res.status(StatusCodes.OK).json(response);
    }
);

export const edit_dressing_done_items = catchAsync(async (req, res) => {
    const { slicing_done_other_details_id } = req.params;
    const { other_details, item_details } = req.body;
    const { _id } = req.userDetails;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (!isValidObjectId(slicing_done_other_details_id)) {
            throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
        }

        for (let field of ['other_details', 'item_details']) {
            if (!req.body[field]) {
                throw new ApiError(`${field} is required`, StatusCodes.NOT_FOUND);
            }
        }

<<<<<<< HEAD
    })

export const fetch_single_dressing_done_item = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
    };

    const pipeline = [
        {
            $match: { _id: mongoose.Types.ObjectId.createFromHexString(id) }
        },
        {
            $lookup: {
                from: "dressing_done_other_details",
                localField: "dressing_done_other_details_id",
                foreignField: "_id",
                as: "dressing_done_other_details"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "created_by",
                foreignField: "_id",
                as: "created_user_details",
                pipeline: [
                    {
                        $project: {
                            user_name: 1,
                            first_name: 1,
                            last_name: 1,
                            dept_name: 1,
                            role_name: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "updated_by",
                foreignField: "_id",
                as: "updated_user_details",
                pipeline: [
                    {
                        $project: {
                            user_name: 1,
                            first_name: 1,
                            last_name: 1,
                            dept_name: 1,
                            role_name: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$dressing_done_other_details",
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: "$created_user_details",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: "$updated_user_details",
                preserveNullAndEmptyArrays: true
            }
        },

    ];

    const result = await dressing_done_items_model.aggregate(pipeline);

    const response = new ApiResponse(StatusCodes.OK, "Dressing done item fetched successfully", result);

    return res.status(StatusCodes.OK).json(response)
})

export const fetch_dressing_done_history = catchAsync(async (req, res, next) => {
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

    const match_query = {
        ...search_query,
        ...filterData,
        issue_status: { $ne: null },
    };
    const aggMatch = {
        $match: {
            ...match_query,
        },
    };
    // const aggGroupBy = {
    //     $group: {
    //         _id: { pallet_number: "$bundle_details.pallet_number" },

    //         item_name: { $first: "$bundle_details.item_name" },
    //         item_sub_cat: { $first: "$bundle_details.item_sub_category_name" },
    //         issue_status: { $first: "$bundle_details.issue_status" },
    //         // bundles: {
    //         //     $push: "$$ROOT"
    //         // },
    //         // total_bundles: {
    //         //     $sum: 1
    //         // },
    //         // available_bundles: {
    //         //     $sum: {
    //         //         $cond: {
    //         //             if: { $eq: ["$issue_status", null] },
    //         //             then: 1,
    //         //             else: 0
    //         //         }
    //         //     }
    //         // }
    //     }

    // }
    const aggAddGlobalFields = {
        $addFields: {
            item_name: { $arrayElemAt: ["$bundle_details.item_name", 0] },
            item_sub_cat: { $arrayElemAt: ["$bundle_details.item_sub_category_name", 0] },
            issue_status: { $arrayElemAt: ["$bundle_details.issue_status", 0] },
            log_no_code: { $arrayElemAt: ["$bundle_details.log_no_code", 0] },
        },
    };
    const aggLookupDressingDoneOtherDetails = {
        $lookup: {
            from: "dressing_done_other_details",
            localField: "dressing_done_other_details_id",
            foreignField: "_id",
            as: "dressing_done_other_details"
        }
    }
    const aggUnwindDressingDoneOtherDetails = {
        $unwind: {
            path: "$dressing_done_other_details",
            preserveNullAndEmptyArrays: true
        }
    }
    const aggLookupBundles = {
        $lookup: {
            from: "dressing_done_items",
            localField: "bundles",
            foreignField: "_id",
            as: "bundle_details"
        }
    }
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
                    },
                },
            ],
            as: 'updated_user_details',
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

    const aggLimit = {
        $limit: parseInt(limit),
    };

    const aggSkip = {
        $skip: (parseInt(page) - 1) * parseInt(limit),
    };

    const aggSort = {
        $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
    };
    const list_aggregate = [
        aggLookupDressingDoneOtherDetails,
        aggLookupBundles,
        aggAddGlobalFields,
        aggUnwindDressingDoneOtherDetails,
        aggCreatedUserDetails,
        aggUpdatedUserDetails,
        aggUnwindCreatedUser,
        aggUnwindUpdatdUser,
        aggMatch,
        // aggAddGlobalFields,
        aggSort,
        aggSkip,
        aggLimit,

    ];

    const result = await dressing_done_history_model.aggregate(list_aggregate);


    const aggCount = {
        $count: 'totalCount',
    };

    const count_total_docs = [
        aggCreatedUserDetails,
        aggUpdatedUserDetails,
        aggUnwindCreatedUser,
        aggUnwindUpdatdUser,
        aggMatch,
        aggCount,
    ];

    const total_docs = await dressing_done_history_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
        StatusCodes.OK,
        'Data fetched successfully...',
        {
            data: result,
            totalPages: totalPages,
        }
    );

    return res.status(StatusCodes.OK).json(response);
});


export const revert_dressing_done_items = catchAsync(async (req, res) => {
    const { other_details_id } = req.params;

})
=======
    if (!Array.isArray(item_details)) {
      throw new ApiError(
        'Item Details must be an array.',
        StatusCodes.BAD_REQUEST
      );
    }

    if (item_details?.length === 0) {
      throw new ApiError(
        'Item Details must have atleast one item',
        StatusCodes.BAD_REQUEST
      );
    }

    const other_details_data = await dressing_done_other_details_model.findOne({
      _id: slicing_done_other_details_id,
    });

    if (!other_details_data) {
      throw new ApiError('Other Details not found', StatusCodes.NOT_FOUND);
    }

    if (!other_details_data?.isEditable) {
      throw new ApiError(
        'Dressing done item is not editable',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_other_details_result = await dressing_done_other_details_model
      .findOneAndUpdate(
        {
          _id: slicing_done_other_details_id,
        },
        {
          $set: {
            ...other_details,
            updated_by: _id,
          },
        },
        { new: true }
      )
      .session(session);

    if (!update_other_details_result) {
      throw new ApiError(
        'Failed to update dressing other details ',
        StatusCodes.BAD_REQUEST
      );
    }
    const total_no_of_leaves_by_log_no_code = item_details?.reduce(
      (acc, item) => {
        acc[item?.log_no_code] =
          (acc[item?.log_no_code] || 0) + item.no_of_leaves;
        return acc;
      },
      {}
    );

    const add_peeling_done_item = async () => {
      const delete_existing_items_result =
        await dressing_done_items_model?.deleteMany(
          {
            dressing_done_other_details_id: other_details_data?._id,
          },
          { session }
        );

      if (
        !delete_existing_items_result.acknowledged ||
        delete_existing_items_result.deletedCount === 0
      ) {
        throw new ApiError(
          'Failed to delete dressing done items',
          StatusCodes.BAD_REQUEST
        );
      }

      const peeling_done_details = await peeling_done_items_model.find({
        peeling_done_other_details_id:
          other_details?.peeling_done_other_details_id,
      });
      if (peeling_done_details.length === 0) {
        throw new ApiError(
          'Peeling Done item details no found..!',
          StatusCodes.NOT_FOUND
        );
      }
      const peelingDoneMap = peeling_done_details?.reduce((acc, item) => {
        acc[item.log_no_code] = item;
        return acc;
      }, {});
      for (let item of item_details) {
        const peeling_done_data = peelingDoneMap[item?.log_no_code];
        if (
          total_no_of_leaves_by_log_no_code[item?.log_no_code] !==
          peeling_done_data?.no_of_leaves
        ) {
          throw new ApiError(
            `No.of Leaves Missmatch for ${item?.log_no_code}, Actual No. of Leaves Issued : ${item?.no_of_leaves}, Dressing Done No.of Leaves : ${item?.no_of_leaves} `,
            StatusCodes.BAD_REQUEST
          );
        }

        if (item.thickness !== peeling_done_data?.thickness) {
          throw new ApiError(
            `Thickness missmatch for Log No.Code ${item?.log_no_code}`
          );
        }
      }

      const updated_item_details = item_details?.map((item) => {
        item.dressing_done_other_details_id = other_details_data?._id;
        item.created_by = _id;
        item.updated_by = _id;
        return item;
      });

      const add_items_result = await dressing_done_items_model.insertMany(
        updated_item_details,
        { session }
      );

      if (add_items_result?.length === 0) {
        throw new ApiError('Failed to add items', StatusCodes.BAD_REQUEST);
      }
      // const update_dressing_done_status = await peeling_done_items_model.updateMany({
      //     peeling_done_other_details_id: other_details_data?.peeling_done_other_details_id
      // }, {
      //     $set: {
      //         is_dressing_done: true
      //     }
      // }, { session });

      // if (!update_dressing_done_status.acknowledged || update_dressing_done_status.modifiedCount === 0) {
      //     throw new ApiError("Failed to updated dressing done status ", StatusCodes.BAD_REQUEST)
      // }
    };

    const add_slicing_done_item = async () => {
      console.log('inside');
      const delete_existing_item_result =
        await dressing_done_items_model.deleteMany(
          {
            dressing_done_other_details_id: other_details_data?._id,
          },
          { session }
        );

      if (
        !delete_existing_item_result.acknowledged ||
        delete_existing_item_result.deletedCount === 0
      ) {
        throw new ApiError(
          'Failed to delete existing dressing done items ',
          StatusCodes.BAD_REQUEST
        );
      }
      const slicing_done_details = await slicing_done_items_model
        .find({
          slicing_done_other_details_id:
            other_details?.slicing_done_other_details_id,
        })
        .session(session);

      if (slicing_done_details.length === 0) {
        throw new ApiError(
          'Slicing Done item details no found.',
          StatusCodes.NOT_FOUND
        );
      }
      const slicingDoneMap = slicing_done_details?.reduce((acc, item) => {
        acc[item.log_no_code] = item;
        return acc;
      }, {});

      for (let item of item_details) {
        const slicing_done_data = slicingDoneMap[item?.log_no_code];
        if (
          total_no_of_leaves_by_log_no_code[item?.log_no_code] !==
          slicing_done_data?.no_of_leaves
        ) {
          throw new ApiError(
            `No.of Leaves Missmatch for ${item?.log_no_code}, Actual No. of Leaves Issued : ${slicing_done_data?.no_of_leaves}, Dressing Done No.of Leaves : ${total_no_of_leaves_by_log_no_code[item?.log_no_code]} `,
            StatusCodes.BAD_REQUEST
          );
        }

        if (item.thickness !== slicing_done_data?.thickness) {
          throw new ApiError(
            `Thickness missmatch for Log No.Code ${item?.log_no_code}, Provided : ${item?.thickness},Actual : ${slicing_done_data?.thickness} Thickness`
          );
        }
      }

      const updated_item_details = item_details?.map((item) => {
        item.dressing_done_other_details_id = other_details_data?._id;
        item.created_by = _id;
        item.updated_by = _id;
        return item;
      });

      const add_items_result = await dressing_done_items_model.insertMany(
        updated_item_details,
        { session }
      );

      if (add_items_result?.length === 0) {
        throw new ApiError('Failed to add items', StatusCodes.BAD_REQUEST);
      }

      // const update_dressing_done_status = await slicing_done_items_model.updateMany({
      //     slicing_done_other_details_id: other_details?.slicing_done_other_details_id
      // }, {
      //     $set: {
      //         is_dressing_done: true
      //     }
      // }, { session });

      // if (!update_dressing_done_status.acknowledged || update_dressing_done_status.modifiedCount === 0) {
      //     throw new ApiError("Failed to updated dressing done status ", StatusCodes.BAD_REQUEST)
      // };
      console.log('executed');
    };
    if (other_details_data?.peeling_done_other_details_id) {
      await add_peeling_done_item();
    }
    if (other_details_data?.slicing_done_other_details_id) {
      await add_slicing_done_item();
    }
    console.log('outside');
    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Dressing items updated successfully'
    );

    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});
>>>>>>> 3946c6b304d544d7155b3df6522d27c71315fb95

export const fetch_single_dressing_done_item = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
    };

    const pipeline = [
        {
            $match: { _id: mongoose.Types.ObjectId.createFromHexString(id) }
        },
        {
            $lookup: {
                from: "dressing_done_other_details",
                localField: "dressing_done_other_details_id",
                foreignField: "_id",
                as: "dressing_done_other_details"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "created_by",
                foreignField: "_id",
                as: "created_user_details",
                pipeline: [
                    {
                        $project: {
                            user_name: 1,
                            first_name: 1,
                            last_name: 1,
                            dept_name: 1,
                            role_name: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "updated_by",
                foreignField: "_id",
                as: "updated_user_details",
                pipeline: [
                    {
                        $project: {
                            user_name: 1,
                            first_name: 1,
                            last_name: 1,
                            dept_name: 1,
                            role_name: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$dressing_done_other_details",
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: "$created_user_details",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: "$updated_user_details",
                preserveNullAndEmptyArrays: true
            }
        },

    ];

    const result = await dressing_done_items_model.aggregate(pipeline);

    const response = new ApiResponse(StatusCodes.OK, "Dressing done item fetched successfully", result);

    return res.status(StatusCodes.OK).json(response)
})

export const fetch_dressing_done_history = catchAsync(async (req, res, next) => {
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

    const match_query = {
        ...search_query,
        ...filterData,
        issue_status: { $ne: null },
    };
    const aggMatch = {
        $match: {
            ...match_query,
        },
    };
    // const aggGroupBy = {
    //     $group: {
    //         _id: { pallet_number: "$bundle_details.pallet_number" },

    //         item_name: { $first: "$bundle_details.item_name" },
    //         item_sub_cat: { $first: "$bundle_details.item_sub_category_name" },
    //         issue_status: { $first: "$bundle_details.issue_status" },
    //         // bundles: {
    //         //     $push: "$$ROOT"
    //         // },
    //         // total_bundles: {
    //         //     $sum: 1
    //         // },
    //         // available_bundles: {
    //         //     $sum: {
    //         //         $cond: {
    //         //             if: { $eq: ["$issue_status", null] },
    //         //             then: 1,
    //         //             else: 0
    //         //         }
    //         //     }
    //         // }
    //     }

    // }
    const aggAddGlobalFields = {
        $addFields: {
            item_name: { $arrayElemAt: ["$bundle_details.item_name", 0] },
            item_sub_cat: { $arrayElemAt: ["$bundle_details.item_sub_category_name", 0] },
            issue_status: { $arrayElemAt: ["$bundle_details.issue_status", 0] },
            log_no_code: { $arrayElemAt: ["$bundle_details.log_no_code", 0] },
        },
    };
    const aggLookupDressingDoneOtherDetails = {
        $lookup: {
            from: "dressing_done_other_details",
            localField: "dressing_done_other_details_id",
            foreignField: "_id",
            as: "dressing_done_other_details"
        }
    }
    const aggUnwindDressingDoneOtherDetails = {
        $unwind: {
            path: "$dressing_done_other_details",
            preserveNullAndEmptyArrays: true
        }
    }
    const aggLookupBundles = {
        $lookup: {
            from: "dressing_done_items",
            localField: "bundles",
            foreignField: "_id",
            as: "bundle_details"
        }
    }
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
                    },
                },
            ],
            as: 'updated_user_details',
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

    const aggLimit = {
        $limit: parseInt(limit),
    };

    const aggSkip = {
        $skip: (parseInt(page) - 1) * parseInt(limit),
    };

    const aggSort = {
        $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
    };
    const list_aggregate = [
        aggLookupDressingDoneOtherDetails,
        aggLookupBundles,
        aggAddGlobalFields,
        aggUnwindDressingDoneOtherDetails,
        aggCreatedUserDetails,
        aggUpdatedUserDetails,
        aggUnwindCreatedUser,
        aggUnwindUpdatdUser,
        aggMatch,
        // aggAddGlobalFields,
        aggSort,
        aggSkip,
        aggLimit,

    ];

    const result = await dressing_done_history_model.aggregate(list_aggregate);


    const aggCount = {
        $count: 'totalCount',
    };

    const count_total_docs = [
        aggCreatedUserDetails,
        aggUpdatedUserDetails,
        aggUnwindCreatedUser,
        aggUnwindUpdatdUser,
        aggMatch,
        aggCount,
    ];

    const total_docs = await dressing_done_history_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
        StatusCodes.OK,
        'Data fetched successfully...',
        {
            data: result,
            totalPages: totalPages,
        }
    );

    return res.status(StatusCodes.OK).json(response);
});


export const revert_dressing_done_items = catchAsync(async (req, res) => {
    const { other_details_id } = req.params;

})