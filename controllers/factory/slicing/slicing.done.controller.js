import { StatusCodes } from '../../../utils/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import {
  issues_for_status,
  issue_for_slicing,
} from '../../../database/Utils/constants/constants.js';

import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import {
  slicing_done_items_model,
  slicing_done_other_details_model,
} from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import { issued_for_slicing_model } from '../../../database/schema/factory/slicing/issue_for_slicing/issuedForSlicing.js';
import issue_for_slicing_available_model from '../../../database/schema/factory/slicing/issue_for_slicing/issue_for_slicing_available_schema.js';
import issue_for_slicing_wastage_model from '../../../database/schema/factory/slicing/issue_for_slicing/issue_for_slicing_wastage_schema.js';

export const add_slicing_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const {
      other_details,
      items_details,
      type,
      wastage_details,
      available_details,
    } = req.body;
    for (let i of ['other_details', 'items_details', 'type']) {
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
    if (type === issue_for_slicing.wastage) {
      if (!wastage_details) {
        throw new ApiError('Please provide wastage details', 400);
      }
    }
    if (type === issue_for_slicing.rest_roller) {
      if (!available_details) {
        throw new ApiError('Please provide available details', 400);
      }
    }

    // Other goods details
    const add_other_details_data =
      await slicing_done_other_details_model.create(
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
      item.slicing_done_other_details_id = add_other_details_id;
      item.created_by = userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });
    const add_items_details_data = await slicing_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length === 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage or re-slicing
    const issue_for_slicing_id = other_details_data?.issue_for_slicing_id;
    const issue_for_slicing_type =
      await issued_for_slicing_model.findOneAndUpdate(
        { _id: issue_for_slicing_id },
        {
          $set: {
            type: type,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    if (!issue_for_slicing_type) {
      throw new ApiError('Failed to add type', 400);
    }

    if (
      issue_for_slicing_type?.type?.toLowerCase() ===
      issue_for_slicing.wastage?.toLowerCase()
    ) {
      const wastage_details_data = {
        ...wastage_details,
        issue_for_slicing_id: issue_for_slicing_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_wastage_details_data =
        await issue_for_slicing_wastage_model.create([wastage_details_data], {
          session,
        });
      if (add_wastage_details_data?.length <= 0) {
        throw new ApiError('Failed to add wastage details', 400);
      }
    }

    if (
      issue_for_slicing_type?.type?.toLowerCase() ===
      issue_for_slicing.rest_roller?.toLowerCase()
    ) {
      const available_details_data = {
        ...available_details,
        issue_for_slicing_id: issue_for_slicing_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_available_details_data =
        await issue_for_slicing_available_model.create(
          [available_details_data],
          {
            session,
          }
        );
      if (add_available_details_data?.length === 0) {
        throw new ApiError('Failed to add available details', 400);
      }
    }

    await session.commitTransaction();

    const response = new ApiResponse(201, 'Slicing Done Successfully', {
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

export const revert_slicing_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { other_details_id } = req.params;
    if (!other_details_id) {
      throw new ApiError('Please provide other details id', 400);
    }

    const other_details =
      await slicing_done_other_details_model.findById(other_details_id);
    if (!other_details) {
      throw new ApiError('Other details not found', 404);
    }

    const items_details = await slicing_done_items_model.find({
      slicing_done_other_details_id: other_details_id,
    });
    if (items_details?.length <= 0) {
      throw new ApiError('Items details not found', 404);
    }

    await slicing_done_other_details_model.findByIdAndDelete(other_details_id, {
      session,
    });
    await slicing_done_items_model.deleteMany(
      { slicing_done_other_details_id: other_details_id },
      { session }
    );

    const response = new ApiResponse(
      200,
      'Slicing Done Reverted Successfully',
      {
        other_details,
        items_details,
      }
    );

    return res.status(200).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const fetch_all_slicing_done_items = catchAsync(
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

    const match_query = {
      ...search_query,
      ...filterData,
    };

    const aggLookupSlicingDoneOtherDetails = {
      $lookup: {
        from: 'slicing_done_other_details',
        localField: 'slicing_done_other_details_id',
        foreignField: '_id',
        as: 'slicing_done_other_details',
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
        path: '$slicing_done_other_details',
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
      aggLookupSlicingDoneOtherDetails,
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

    console.log('agg => ', list_aggregate);
    const result = await slicing_done_items_model?.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      aggLookupSlicingDoneOtherDetails,
      aggUnwindOtherDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggCount,
    ];

    const total_docs =
      await slicing_done_items_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(200, 'Data Fetched Successfully', {
      data: result,
      totalPages: totalPages,
    });
    return res.status(200).json(response);
  }
);

export const fetch_all_details_by_slicing_done_id = catchAsync(
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
          from: 'issued_for_slicings',
          foreignField: '_id',
          localField: 'issue_for_slicing_id',
          as: 'issued_for_slicing_details',
        },
      },
      {
        $unwind: {
          path: '$issued_for_slicing_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'issue_for_slicing_wastage',
          foreignField: 'issue_for_slicing_id',
          localField: 'issue_for_slicing_id',
          as: 'issue_for_slicing_wastage_details',
        },
      },
      {
        $lookup: {
          from: 'issue_for_slicing_available',
          foreignField: 'issue_for_slicing_id',
          localField: 'issue_for_slicing_id',
          as: 'issue_for_slicing_available_details',
        },
      },
      {
        $unwind: {
          path: '$issue_for_slicing_wastage_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$issue_for_slicing_available_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'slicing_done_items',
          foreignField: 'slicing_done_other_details_id',
          localField: '_id',
          as: 'slicing_done_items_details',
        },
      },
    ];
    const result = await slicing_done_other_details_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Details Fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_slicing_done_history = catchAsync(async (req, res, next) => {
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
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatdUser,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ];

  const result = await slicing_done_items_model.aggregate(list_aggregate);

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

  const total_docs = await slicing_done_items_model.aggregate(count_total_docs);

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
