import mongoose from 'mongoose';
import { issues_for_peeling_model } from '../../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling.schema.js';
import issues_for_peeling_available_model from '../../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_available.schema.js';
import issues_for_peeling_wastage_model from '../../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_wastage.schema.js';
import {
  peeling_done_items_model,
  peeling_done_other_details_model,
} from '../../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { issue_for_peeling } from '../../../../database/Utils/constants/constants.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { StatusCodes } from '../../../../utils/constants.js';

export const add_peeling_done = catchAsync(async (req, res, next) => {
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
    if (type === issue_for_peeling.wastage) {
      if (!wastage_details) {
        throw new ApiError('Please provide wastage details', 400);
      }
    }
    if (type === issue_for_peeling.re_flitching) {
      if (!available_details) {
        throw new ApiError('Please provide available details', 400);
      }
    }

    // Other goods details
    const add_other_details_data =
      await peeling_done_other_details_model.create(
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
      item.peeling_done_other_details_id = add_other_details_id;
      item.created_by = userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });
    const add_items_details_data = await peeling_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage or re-flitching
    const issue_for_peeling_id = other_details_data?.issue_for_peeling_id;
    const issue_for_peeling_type =
      await issues_for_peeling_model.findOneAndUpdate(
        { _id: issue_for_peeling_id },
        {
          $set: {
            type: type,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    if (!issue_for_peeling_type) {
      throw new ApiError('Failed to add type', 400);
    }

    if (
      issue_for_peeling_type?.type?.toLowerCase() ===
        issue_for_peeling.wastage?.toLowerCase() &&
      wastage_details
    ) {
      const wastage_details_data = {
        ...wastage_details,
        issue_for_peeling_id: issue_for_peeling_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_wastage_details_data =
        await issues_for_peeling_wastage_model.create([wastage_details_data], {
          session,
        });
      if (add_wastage_details_data?.length <= 0) {
        throw new ApiError('Failed to add wastage details', 400);
      }
    }

    if (
      issue_for_peeling_type?.type?.toLowerCase() ===
        issue_for_peeling.re_flitching?.toLowerCase() &&
      available_details
    ) {
      const re_flitching_details_data = {
        ...available_details,
        issue_for_peeling_id: issue_for_peeling_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_available_details_data =
        await issues_for_peeling_available_model.create(
          [re_flitching_details_data],
          {
            session,
          }
        );
      if (add_available_details_data?.length <= 0) {
        throw new ApiError('Failed to add rejection details', 400);
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

export const edit_peeling_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { peeling_done_id } = req.params;
    if (!peeling_done_id && !mongoose.isValidObjectId(peeling_done_id)) {
      throw new ApiError('Invalid peeling done id', 400);
    }
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
    if (type === issue_for_peeling.wastage) {
      if (!wastage_details) {
        throw new ApiError('Please provide wastage details', 400);
      }
    }
    if (type === issue_for_peeling.re_flitching) {
      if (!available_details) {
        throw new ApiError('Please provide available details', 400);
      }
    }

    const fetch_other_details_data =
      await peeling_done_other_details_model.findOne({ _id: peeling_done_id });
    if (!fetch_other_details_data) {
      throw new ApiError('Not data found', 400);
    }

    if (!fetch_other_details_data.isEditable) {
      throw new ApiError('Cannot edit peeling done', 400);
    }

    // Other goods details
    const { createdAt, updatetAt, ...update_other_details } = other_details;
    const add_other_details_data =
      await peeling_done_other_details_model.findOneAndUpdate(
        { _id: peeling_done_id },
        {
          $set: {
            ...update_other_details,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    const other_details_data = add_other_details_data;

    if (!other_details_data) {
      throw new ApiError('Failed to update other details', 400);
    }
    const add_other_details_id = other_details_data?._id;

    // item details

    const items_details_data = items_details?.map((item, index) => {
      item.peeling_done_other_details_id = add_other_details_id;
      item.created_by = item.created_by ? item.created_by : userDetails?._id;
      item.updated_by = userDetails?._id;
      item.createdAt = item.createdAt ? item.createdAt : new Date();
      item.updatedAt = new Date();
      return item;
    });

    const delete_items_details = await peeling_done_items_model.deleteMany(
      { peeling_done_other_details_id: add_other_details_id },
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

    const add_items_details_data = await peeling_done_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage or re-flitching
    const issue_for_peeling_id = other_details_data?.issue_for_peeling_id;

    const issue_for_peeling_type =
      await issues_for_peeling_model.findOneAndUpdate(
        { _id: issue_for_peeling_id },
        {
          $set: {
            type: type,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );

    if (!issue_for_peeling_type) {
      throw new ApiError('Failed to add type', 400);
    }

    //delete wastage
    const delete_wastage = await issues_for_peeling_wastage_model.deleteOne(
      { issue_for_peeling_id: issue_for_peeling_id },
      {
        session,
      }
    );

    if (!delete_wastage.acknowledged) {
      throw new ApiError('Failed to delete wastage details', 400);
    }

    //delete re-flitching
    const delete_available = await issues_for_peeling_available_model.deleteOne(
      { issue_for_peeling_id: issue_for_peeling_id },
      {
        session,
      }
    );

    if (!delete_available.acknowledged) {
      throw new ApiError('Failed to delete available details', 400);
    }

    //add wastage
    if (
      issue_for_peeling_type?.type?.toLowerCase() ===
        issue_for_peeling.wastage?.toLowerCase() &&
      wastage_details
    ) {
      const wastage_details_data = {
        ...wastage_details,
        issue_for_peeling_id: issue_for_peeling_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };

      const add_wastage_details_data =
        await issues_for_peeling_wastage_model.create([wastage_details_data], {
          session,
        });
      if (add_wastage_details_data?.length <= 0) {
        throw new ApiError('Failed to add wastage details', 400);
      }
    }

    // add available
    if (
      issue_for_peeling_type?.type?.toLowerCase() ===
        issue_for_peeling.re_flitching?.toLowerCase() &&
      available_details
    ) {
      const re_flitching_details_data = {
        ...available_details,
        issue_for_peeling_id: issue_for_peeling_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_available_details_data =
        await issues_for_peeling_available_model.create(
          [re_flitching_details_data],
          {
            session,
          }
        );
      if (add_available_details_data?.length <= 0) {
        throw new ApiError('Failed to add rejection details', 400);
      }
    }
    await session.commitTransaction();
    const response = new ApiResponse(201, 'Peeling Done Updated Successfully', {
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

export const fetch_all_peeling_done_items = catchAsync(
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

    const aggLookupPeelingDoneOtherDetails = {
      $lookup: {
        from: 'peeling_done_other_details',
        localField: 'peeling_done_other_details_id',
        foreignField: '_id',
        as: 'peeling_done_other_details',
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
        path: '$peeling_done_other_details',
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
      aggLookupPeelingDoneOtherDetails,
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

    const result = await peeling_done_items_model.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      aggLookupPeelingDoneOtherDetails,
      aggUnwindOtherDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggCount,
    ];

    const total_docs =
      await peeling_done_items_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(200, 'Data Fetched Successfully', {
      data: result,
      totalPages: totalPages,
    });
    return res.status(200).json(response);
  }
);

export const fetch_all_details_by_peeling_done_id = catchAsync(
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
          from: 'issues_for_peelings',
          foreignField: '_id',
          localField: 'issue_for_peeling_id',
          as: 'issue_for_peeling_details',
        },
      },
      {
        $unwind: {
          path: '$issue_for_peeling_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'issues_for_peeling_wastage',
          foreignField: 'issue_for_peeling_id',
          localField: 'issue_for_peeling_id',
          as: 'issue_for_peeling_wastage_details',
        },
      },
      {
        $lookup: {
          from: 'issues_for_peeling_available',
          foreignField: 'issue_for_peeling_id',
          localField: 'issue_for_peeling_id',
          as: 'issue_for_peeling_available_details',
        },
      },
      {
        $unwind: {
          path: '$issue_for_peeling_wastage_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$issue_for_peeling_available_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'peeling_done_items',
          foreignField: 'peeling_done_other_details_id',
          localField: '_id',
          as: 'peeling_done_items_details',
        },
      },
    ];
    const result = await peeling_done_other_details_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Details Fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const revert_all_pending_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    if (!id && !mongoose.isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
    }

    const fetch_peeling_done_other_details =
      await peeling_done_other_details_model.aggregate([
        {
          $match: { _id: mongoose.Types.ObjectId.createFromHexString(id) },
        },
        {
          $lookup: {
            from: 'issues_for_peelings',
            foreignField: '_id',
            localField: 'issue_for_peeling_id',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  type: 1,
                },
              },
            ],
            as: 'issue_for_peeling_details',
          },
        },
        {
          $unwind: {
            path: '$issue_for_peeling_details',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);
    const peeling_done_other_details = fetch_peeling_done_other_details?.[0];

    if (!peeling_done_other_details) {
      throw new ApiError('Not data found', 400);
    }

    if (!peeling_done_other_details?.isEditable) {
      throw new ApiError('Cannot revert peeling done', 400);
    }

    const peeling_done_other_details_id = peeling_done_other_details?._id;

    const delete_peeling_done_other_details =
      await peeling_done_other_details_model.findOneAndDelete(
        { _id: peeling_done_other_details_id },
        { session }
      );

    if (!delete_peeling_done_other_details) {
      throw new ApiError('Failed to delete peeling done', 400);
    }

    const deleted_peeling_done_other_details_id =
      delete_peeling_done_other_details?._id;

    const delete_peeling_done_items_details =
      await peeling_done_items_model.deleteMany(
        {
          peeling_done_other_details_id: deleted_peeling_done_other_details_id,
        },
        { session }
      );

    if (
      !delete_peeling_done_items_details.acknowledged ||
      delete_peeling_done_items_details.deletedCount <= 0
    ) {
      throw new ApiError('Failed to delete peeling done items', 400);
    }

    const issue_for_peeling_id =
      peeling_done_other_details?.issue_for_peeling_details?._id;
    const type = peeling_done_other_details?.issue_for_peeling_details?.type;

    if (type === issue_for_peeling?.re_flitching) {
      //delete re-flitching
      const delete_available =
        await issues_for_peeling_available_model.deleteOne(
          { issue_for_peeling_id: issue_for_peeling_id },
          {
            session,
          }
        );

      if (!delete_available.acknowledged) {
        throw new ApiError('Failed to delete available details', 400);
      }
    }

    if (type === issue_for_peeling?.wastage) {
      //delete wastage
      const delete_wastage = await issues_for_peeling_wastage_model.deleteOne(
        { issue_for_peeling_id: issue_for_peeling_id },
        {
          session,
        }
      );

      if (!delete_wastage.acknowledged) {
        throw new ApiError('Failed to delete wastage details', 400);
      }
    }

    const update_issue_for_peeling = await issues_for_peeling_model.updateOne(
      { _id: issue_for_peeling_id },
      {
        $set: { type: null },
      },
      { session }
    );

    if (
      !update_issue_for_peeling.acknowledged ||
      update_issue_for_peeling.deletedCount <= 0
    ) {
      throw new ApiError('Failed to update type issue for peeling', 400);
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Peeling Done Revert Successfully'
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

// export const fetch_slicing_done_history = catchAsync(async (req, res, next) => {
//   const {
//     page = 1,
//     sortBy = 'updatedAt',
//     sort = 'desc',
//     limit = 10,
//     search = '',
//   } = req.query;
//   const {
//     string,
//     boolean,
//     numbers,
//     arrayField = [],
//   } = req.body?.searchFields || {};

//   const filter = req.body?.filter;

//   let search_query = {};
//   if (search != '' && req?.body?.searchFields) {
//     const search_data = DynamicSearch(
//       search,
//       boolean,
//       numbers,
//       string,
//       arrayField
//     );
//     if (search_data?.length == 0) {
//       return res.status(404).json({
//         statusCode: 404,
//         status: false,
//         data: {
//           data: [],
//         },
//         message: 'Results Not Found',
//       });
//     }
//     search_query = search_data;
//   }

//   const filterData = dynamic_filter(filter);

//   const match_query = {
//     ...search_query,
//     ...filterData,
//     issue_status: { $ne: null },
//   };
//   const aggMatch = {
//     $match: {
//       ...match_query,
//     },
//   };
//   const aggCreatedUserDetails = {
//     $lookup: {
//       from: 'users',
//       localField: 'created_by',
//       foreignField: '_id',
//       pipeline: [
//         {
//           $project: {
//             first_name: 1,
//             last_name: 1,
//             user_name: 1,
//             user_type: 1,
//             email_id: 1,
//           },
//         },
//       ],
//       as: 'created_user_details',
//     },
//   };
//   const aggUpdatedUserDetails = {
//     $lookup: {
//       from: 'users',
//       localField: 'updated_by',
//       foreignField: '_id',
//       pipeline: [
//         {
//           $project: {
//             first_name: 1,
//             last_name: 1,
//             user_name: 1,
//             user_type: 1,
//             email_id: 1,
//           },
//         },
//       ],
//       as: 'updated_user_details',
//     },
//   };
//   const aggUnwindCreatedUser = {
//     $unwind: {
//       path: '$created_user_details',
//       preserveNullAndEmptyArrays: true,
//     },
//   };
//   const aggUnwindUpdatdUser = {
//     $unwind: {
//       path: '$updated_user_details',
//       preserveNullAndEmptyArrays: true,
//     },
//   };

//   const aggLimit = {
//     $limit: parseInt(limit),
//   };

//   const aggSkip = {
//     $skip: (parseInt(page) - 1) * parseInt(limit),
//   };

//   const aggSort = {
//     $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
//   };
//   const list_aggregate = [
//     aggCreatedUserDetails,
//     aggUpdatedUserDetails,
//     aggUnwindCreatedUser,
//     aggUnwindUpdatdUser,
//     aggMatch,
//     aggSort,
//     aggSkip,
//     aggLimit,
//   ];

//   const result = await slicing_done_items_model.aggregate(list_aggregate);

//   const aggCount = {
//     $count: 'totalCount',
//   };

//   const count_total_docs = [
//     aggCreatedUserDetails,
//     aggUpdatedUserDetails,
//     aggUnwindCreatedUser,
//     aggUnwindUpdatdUser,
//     aggMatch,
//     aggCount,
//   ];

//   const total_docs = await slicing_done_items_model.aggregate(count_total_docs);

//   const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

//   const response = new ApiResponse(
//     StatusCodes.OK,
//     'Data fetched successfully...',
//     {
//       data: result,
//       totalPages: totalPages,
//     }
//   );

//   return res.status(StatusCodes.OK).json(response);
// });
