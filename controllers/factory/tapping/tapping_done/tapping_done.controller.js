import mongoose from "mongoose";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import issue_for_tapping_model from "../../../../database/schema/factory/tapping/issue_for_tapping/issue_for_tapping.schema.js";
import { tapping_done_items_details_model, tapping_done_other_details_model } from "../../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import issue_for_tapping_wastage_model from "../../../../database/schema/factory/tapping/tapping_wastage/tapping_wastage.schema.js";
import ApiError from "../../../../utils/errors/apiError.js";
import { dynamic_filter } from "../../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../../utils/dynamicSearch/dynamic.js";

export const add_tapping_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userDetails = req.userDetails;
        const { other_details, items_details, is_wastage, wastage_details } = req.body;
        for (let i of ['other_details', 'items_details']) {
            if (!req.body?.[i]) {
                throw new ApiError(`Please provide ${i} details`, 400);
            }
        }
        if (!Array.isArray(items_details)) {
            throw new ApiError('items_details must be array', 400);
        }
        if (items_details?.length < 0) {
            throw new ApiError('Atleast one items is required', 400);
        }

        // issue for tapping
        const fetch_issue_for_tapping_data =
            await issue_for_tapping_model.findOne({
                _id: other_details?.issue_for_tapping_item_id,
            });
        if (!fetch_issue_for_tapping_data) {
            throw new ApiError('Issue for tapping data not found', 400);
        }
        if (fetch_issue_for_tapping_data?.is_tapping_done) {
            throw new ApiError(
                'Already created tapping done for this issue for tapping',
                400
            );
        }

        // Other goods details
        const add_other_details_data = await tapping_done_other_details_model.create(
            [
                {
                    ...other_details,
                    created_by: userDetails?._id,
                    updated_by: userDetails?._id,
                },
            ],
            {
                session,
            }
        );
        const other_details_data = add_other_details_data?.[0];

        if (!other_details_data) {
            throw new ApiError('Failed to add other details', 400);
        }
        const add_other_details_id = other_details_data?._id;

        // item details
        const items_details_data = items_details?.map((item, index) => {
            item.tapping_done_other_details_id = add_other_details_id;
            item.created_by = userDetails?._id;
            item.updated_by = userDetails?._id;
            return item;
        });
        const add_items_details_data =
            await tapping_done_items_details_model.insertMany(items_details_data, {
                session,
            });
        if (add_items_details_data?.length <= 0) {
            throw new ApiError('Failed to add Items details', 400);
        };

        const issue_for_tapping_item_id = other_details_data?.issue_for_tapping_item_id;
        // Wastage
        if (is_wastage && wastage_details) {
            const wastage_details_data = {
                ...wastage_details,
                issue_for_tapping_item_id: issue_for_tapping_item_id,
                created_by: userDetails?._id,
                updated_by: userDetails?._id,
            };
            const add_wastage_details_data =
                await issue_for_tapping_wastage_model.create([wastage_details_data], {
                    session,
                });
            if (add_wastage_details_data?.length <= 0) {
                throw new ApiError('Failed to add wastage details', 400);
            }
        };

        // update issue for tapping issue status
        const update_issue_for_tapping = await issue_for_tapping_model.updateOne(
            { _id: issue_for_tapping_item_id },
            {
                $set: {
                    is_tapping_done: true,
                    updated_by: userDetails?._id,
                },
            },
            { runValidators: true, session }
        );

        if (update_issue_for_tapping.matchedCount <= 0) {
            throw new ApiError('Failed to find Issue for tapping', 400);
        }
        if (
            !update_issue_for_tapping.acknowledged ||
            update_issue_for_tapping.modifiedCount <= 0
        ) {
            throw new ApiError('Failed to update Issue for tapping', 400);
        }

        await session.commitTransaction();
        const response = new ApiResponse(201, 'tapping Done Successfully', {
            other_details: other_details_data,
            items_details: add_items_details_data,
        });

        return res.status(201).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});

export const edit_tapping_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userDetails = req.userDetails;
        const { tapping_id } = req.params;
        if (!tapping_id && !mongoose.isValidObjectId(tapping_id)) {
            throw new ApiError('Invalid tapping id', 400);
        }
        const { other_details, items_details, wastage_details, is_wastage } =
            req.body;
        for (let i of ['other_details', 'items_details']) {
            if (!req.body?.[i]) {
                throw new ApiError(`Please provide ${i} details`, 400);
            }
        }
        if (!Array.isArray(items_details)) {
            throw new ApiError('items_details must be array', 400);
        }
        if (items_details?.length < 0) {
            throw new ApiError('Atleast one items is required', 400);
        }

        const fetch_other_details_data =
            await tapping_done_other_details_model.findOne({ _id: tapping_id });
        if (!fetch_other_details_data) {
            throw new ApiError('Not data found', 400);
        }

        if (!fetch_other_details_data.isEditable) {
            throw new ApiError('Cannot edit tapping data', 400);
        }

        // issue for tapping
        const fetch_issue_for_tapping_data = await issue_for_tapping_model.findOne({
            _id: fetch_other_details_data?.issue_for_tapping_item_id,
        });
        if (!fetch_issue_for_tapping_data) {
            throw new ApiError('Issue for tapping data not found', 400);
        }
        const issue_for_tapping_item_id = fetch_issue_for_tapping_data?.issue_for_tapping_item_id;

        // Other goods details
        const { createdAt, updatetAt, ...update_other_details } = other_details;
        const add_other_details_data = await tapping_done_other_details_model.findOneAndUpdate(
            { _id: tapping_id },
            {
                $set: {
                    ...update_other_details,
                    issue_for_tapping_item_id: issue_for_tapping_item_id,
                    updated_by: userDetails?._id,
                },
            },
            { new: true, runValidators: true, session }
        );
        const other_details_data = add_other_details_data;

        if (!other_details_data) {
            throw new ApiError('Failed to update other details', 400);
        }
        const other_details_id = other_details_data?._id;

        // item details
        const delete_items_details = await tapping_done_items_details_model.deleteMany(
            { tapping_done_other_details_id: other_details_id },
            {
                session,
            }
        );

        if (
            !delete_items_details.acknowledged ||
            delete_items_details.deletedCount <= 0
        ) {
            throw new ApiError('Failed to delete items details', 400);
        }

        const items_details_data = items_details?.map((item, index) => {
            item.tapping_done_other_details_id = other_details_id;
            item.created_by = item.created_by ? item.created_by : userDetails?._id;
            item.updated_by = userDetails?._id;
            item.createdAt = item.createdAt ? item.createdAt : new Date();
            item.updatedAt = new Date();
            return item;
        });

        const add_items_details_data = await tapping_done_items_details_model.insertMany(
            items_details_data,
            { session }
        );
        if (add_items_details_data?.length <= 0) {
            throw new ApiError('Failed to add Items details', 400);
        }

        // Wastage
        if (!is_wastage) {
            const delete_wastage_details =
                await issue_for_tapping_wastage_model.deleteOne(
                    {
                        issue_for_tapping_item_id: issue_for_tapping_item_id,
                    },
                    {
                        session,
                    }
                );

            if (
                !delete_wastage_details.acknowledged ||
                delete_wastage_details.deletedCount <= 0
            ) {
                throw new ApiError('Failed to delete items details', 400);
            }
        }

        if (is_wastage) {
            if (!wastage_details) {
                throw new ApiError('wastage details is required', 400);
            }
            const { _id: wastage_id, ...data } = wastage_details;
            const wastage_details_data = {
                ...data,
                issue_for_tapping_item_id: issue_for_tapping_item_id,
                created_by: userDetails?._id,
                updated_by: userDetails?._id,
            };
            const add_wastage_details_data =
                await issue_for_tapping_wastage_model.findOneAndUpdate(
                    {
                        issue_for_tapping_item_id: issue_for_tapping_item_id,
                    },
                    {
                        $set: {
                            ...wastage_details_data,
                        },
                    },
                    { upsert: true, new: true, runValidators: true, session }
                );

            if (!add_wastage_details_data) {
                throw new ApiError('Failed to update wastage details', 400);
            }
        }

        await session.commitTransaction();
        const response = new ApiResponse(201, 'Peeling Done Successfully', {
            other_details: other_details_data,
            items_details: add_items_details_data,
        });

        return res.status(201).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});

export const fetch_all_tapping_done_items = catchAsync(async (req, res, next) => {
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
  };

  const aggLookupOtherDetails = {
    $lookup: {
      from: 'tapping_done_other_details',
      localField: 'tapping_done_other_details_id',
      foreignField: '_id',
      as: 'tapping_done_other_details',
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
  const aggUnwindOtherDetails = {
    $unwind: {
      path: '$tapping_done_other_details',
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
    aggLookupOtherDetails,
    aggUnwindOtherDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatedUser,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ];

  const result =
    await tapping_done_items_details_model.aggregate(list_aggregate);

  const aggCount = {
    $count: 'totalCount',
  };

  const count_total_docs = [
    aggLookupOtherDetails,
    aggUnwindOtherDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatedUser,
    aggMatch,
    aggCount,
  ];

  const total_docs =
    await tapping_done_items_details_model.aggregate(count_total_docs);

  const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(200, 'Data Fetched Successfully', {
    data: result,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
}
);