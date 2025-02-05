import mongoose from 'mongoose';
import issues_for_peeling_available_model from '../../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_available.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import {
  re_flitching_items_model,
  re_flitching_other_details_model,
} from '../../../../database/schema/factory/peeling/peeling_done/re_flitching.schema.js';
import issues_for_peeling_wastage_model from '../../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_wastage.schema.js';
import { peeling_done_other_details_model } from '../../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';
import { issued_for_slicing_model } from '../../../../database/schema/factory/slicing/issue_for_slicing/issuedForSlicing.js';

export const fetch_issue_for_peeling_available_details = catchAsync(
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

    const aggLookupIssueForPeeling = {
      $lookup: {
        from: 'issues_for_peelings',
        localField: 'issue_for_peeling_id',
        foreignField: '_id',
        as: 'issue_for_peeling_details',
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
    const aggUnwindIssueForPeeling = {
      $unwind: {
        path: '$issue_for_peeling_details',
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
      aggLookupIssueForPeeling,
      aggUnwindIssueForPeeling,
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
      await issues_for_peeling_available_model.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      aggLookupIssueForPeeling,
      aggUnwindIssueForPeeling,
      aggCreatedUserDetails,
      aggUnwindCreatedUser,
      aggUpdatedUserDetails,
      aggUnwindUpdatdUser,
      aggMatch,
      aggCount,
    ];
    const total_docs =
      await issues_for_peeling_available_model.aggregate(count_total_docs);

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

export const add_reflitching_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
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

    const reflitching_available_data =
      await issues_for_peeling_available_model.findOne({
        _id: other_details?.issue_for_peeling_available_id,
      });

    if (!reflitching_available_data) {
      throw new ApiError('No available data found for issue for peeling', 404);
    }
    const issue_for_peeling_available_id = reflitching_available_data?._id;
    const issue_for_peeling_id =
      reflitching_available_data?.issue_for_peeling_id;

    // Other goods details
    const add_other_details_data =
      await re_flitching_other_details_model.create(
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
      item.re_flitching_other_details_id = add_other_details_id;
      item.created_by = userDetails?._id;
      item.updated_by = userDetails?._id;
      return item;
    });
    const add_items_details_data = await re_flitching_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage
    if (is_wastage && wastage_details) {
      const wastage_details_data = {
        ...wastage_details,
        issue_for_peeling_id: issue_for_peeling_id,
        issue_for_peeling_available_id: issue_for_peeling_available_id,
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

    //isEditable false for peeling done;
    const update_editable_peeling_done =
      await peeling_done_other_details_model.updateOne(
        { issue_for_peeling_id: issue_for_peeling_id },
        {
          $set: {
            isEditable: false,
          },
        },
        { session }
      );

    if (update_editable_peeling_done.matchedCount <= 0) {
      throw new ApiError('peeling done details not found', 400);
    }

    if (
      !update_editable_peeling_done.acknowledged ||
      update_editable_peeling_done.matchedCount <= 0
    ) {
      throw new ApiError('Failed to update peeling done details', 400);
    }

    await session.commitTransaction();
    const response = new ApiResponse(201, 'Re-flitching Added Successfully', {
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

export const edit_reflitching_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { reflitching_id } = req.params;
    if (!reflitching_id && !mongoose.isValidObjectId(reflitching_id)) {
      throw new ApiError('Invalid reflitching id', 400);
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
      await re_flitching_other_details_model.findOne({ _id: reflitching_id });
    if (!fetch_other_details_data) {
      throw new ApiError('Not data found', 400);
    }

    if (!fetch_other_details_data.isEditable) {
      throw new ApiError('Cannot edit reflitching data', 400);
    }

    const reflitching_available_data =
      await issues_for_peeling_available_model.findOne({
        _id: fetch_other_details_data?.issue_for_peeling_available_id,
      });

    if (!reflitching_available_data) {
      throw new ApiError('No available data found for reflitching', 404);
    }
    const issue_for_peeling_available_id = reflitching_available_data?._id;
    const issue_for_peeling_id =
      reflitching_available_data?.issue_for_peeling_id;

    // Other goods details
    const { createdAt, updatetAt, ...update_other_details } = other_details;
    const add_other_details_data =
      await re_flitching_other_details_model.findOneAndUpdate(
        { _id: reflitching_id },
        {
          $set: {
            ...update_other_details,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        },
        { new: true, session }
      );
    const other_details_data = add_other_details_data;

    if (!other_details_data) {
      throw new ApiError('Failed to update other details', 400);
    }
    const other_details_id = other_details_data?._id;

    // item details
    const delete_items_details = await re_flitching_items_model.deleteMany(
      { re_flitching_other_details_id: other_details_id },
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
      item.re_flitching_other_details_id = other_details_id;
      item.created_by = item.created_by ? item.created_by : userDetails?._id;
      item.updated_by = userDetails?._id;
      item.createdAt = item.createdAt ? item.createdAt : new Date();
      item.updatedAt = new Date();
      return item;
    });

    const add_items_details_data = await re_flitching_items_model.insertMany(
      items_details_data,
      { session }
    );
    if (add_items_details_data?.length <= 0) {
      throw new ApiError('Failed to add Items details', 400);
    }

    // Wastage
    if (!is_wastage) {
      const delete_wastage_details =
        await issues_for_peeling_wastage_model.deleteOne(
          {
            issue_for_peeling_id: issue_for_peeling_id,
            issue_for_peeling_available_id: issue_for_peeling_available_id,
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
      const wastage_details_data = {
        ...wastage_details,
        issue_for_peeling_id: issue_for_peeling_id,
        issue_for_peeling_available_id: issue_for_peeling_available_id,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_wastage_details_data =
        await issues_for_peeling_wastage_model.findOneAndUpdate(
          {
            _id: wastage_details?._id,
            issue_for_peeling_id: issue_for_peeling_id,
            issue_for_peeling_available_id: issue_for_peeling_available_id,
          },
          {
            $set: {
              ...wastage_details_data,
            },
          },
          { new: true, session }
        );

      if (!add_wastage_details_data) {
        throw new ApiError('Failed to update wastage details', 400);
      }
    }

    //isEditable false for peeling done;
    const update_editable_peeling_done =
      await peeling_done_other_details_model.updateOne(
        { issue_for_peeling_id: issue_for_peeling_id },
        {
          $set: {
            isEditable: false,
          },
        },
        { session }
      );

    if (update_editable_peeling_done.matchedCount <= 0) {
      throw new ApiError('peeling done details not found', 400);
    }

    if (
      !update_editable_peeling_done.acknowledged ||
      update_editable_peeling_done.matchedCount <= 0
    ) {
      throw new ApiError('Failed to update peeling done details', 400);
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

export const fetch_all_reflitching_items = catchAsync(
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

    const aggLookupReflitchingOtherDetails = {
      $lookup: {
        from: 're_flitching_other_details',
        localField: 're_flitching_other_details_id',
        foreignField: '_id',
        as: 're_flitching_other_details',
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
        path: '$re_flitching_other_details',
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
      aggLookupReflitchingOtherDetails,
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

    const result = await re_flitching_items_model.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      aggLookupReflitchingOtherDetails,
      aggUnwindOtherDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggCount,
    ];

    const total_docs =
      await re_flitching_items_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(200, 'Data Fetched Successfully', {
      data: result,
      totalPages: totalPages,
    });
    return res.status(200).json(response);
  }
);

export const fetch_all_details_by_reflitching_id = catchAsync(
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
          from: 'issues_for_peeling_available',
          foreignField: '_id',
          localField: 'issue_for_peeling_available_id',
          as: 'issue_for_peeling_available_details',
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
          from: 'issues_for_peeling_wastage',
          foreignField: 'issue_for_peeling_available_id',
          localField: 'issue_for_peeling_available_details._id',
          as: 'issue_for_peeling_wastage_details',
        },
      },
      {
        $unwind: {
          path: '$issue_for_peeling_wastage_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 're_flitching_items',
          foreignField: 're_flitching_other_details_id',
          localField: '_id',
          as: 're_flitching_items_details',
        },
      },
    ];
    const result = await re_flitching_other_details_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Details Fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const revert_all_reflitching = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    if (!id && !mongoose.isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
    }

    const fetch_re_flitching_other_details =
      await re_flitching_other_details_model.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId.createFromHexString(id),
          },
        },
        {
          $lookup: {
            from: 'issues_for_peeling_available',
            foreignField: '_id',
            localField: 'issue_for_peeling_available_id',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  issue_for_peeling_id: 1,
                },
              },
            ],
            as: 'issue_for_peeling_available_details',
          },
        },
        {
          $unwind: {
            path: '$issue_for_peeling_available_details',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);
    const re_flitching_other_details = fetch_re_flitching_other_details?.[0];

    if (!re_flitching_other_details) {
      throw new ApiError('Not data found', 400);
    }

    if (!re_flitching_other_details?.isEditable) {
      throw new ApiError('Cannot revert re-flitching', 400);
    }

    //delete other details
    const re_flitching_other_details_id = re_flitching_other_details?._id;
    const delete_re_flitching_other_details =
      await re_flitching_other_details_model.findOneAndDelete(
        { _id: re_flitching_other_details_id },
        { session }
      );

    if (!delete_re_flitching_other_details) {
      throw new ApiError('Failed to delete re-flitching', 400);
    }

    // delete items
    const deleted_re_flitching_other_details_id =
      delete_re_flitching_other_details?._id;
    const delete_re_flitching_items_details =
      await re_flitching_items_model.deleteMany(
        {
          re_flitching_other_details_id: deleted_re_flitching_other_details_id,
        },
        { session }
      );

    if (
      !delete_re_flitching_items_details.acknowledged ||
      delete_re_flitching_items_details.deletedCount <= 0
    ) {
      throw new ApiError('Failed to delete re-flitching items', 400);
    }

    const issue_for_peeling_available_id =
      re_flitching_other_details?.issue_for_peeling_available_details?._id;
    const issue_for_peeling_id =
      re_flitching_other_details?.issue_for_peeling_available_details
        ?.issue_for_peeling_id;
    //delete wastage
    const delete_wastage = await issues_for_peeling_wastage_model.deleteOne(
      {
        issue_for_peeling_id: issue_for_peeling_id,
        issue_for_peeling_available_id: issue_for_peeling_available_id,
      },
      { session }
    );

    if (!delete_wastage.acknowledged) {
      throw new ApiError('Failed to delete wastage details', 400);
    }

    // update peeling done
    const update_editable_peeling_done =
      await peeling_done_other_details_model.updateOne(
        { issue_for_peeling_id: issue_for_peeling_id },
        {
          $set: {
            isEditable: true,
          },
        },
        { session }
      );

    if (update_editable_peeling_done.matchedCount <= 0) {
      throw new ApiError('peeling done details not found', 400);
    }

    if (
      !update_editable_peeling_done.acknowledged ||
      update_editable_peeling_done.matchedCount <= 0
    ) {
      throw new ApiError('Failed to update peeling done details', 400);
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Re-flitching Revert Successfully'
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const reflitching_issue_for_slicing = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      let { reflitching_items_ids } = req.body;
      const userDetails = req.userDetails;
      if (!reflitching_items_ids) {
        throw new ApiError('reflitching_items_ids is missing', 400);
      }
      if (!Array.isArray(reflitching_items_ids)) {
        throw new ApiError(
          'invalid data type, reflitching_items_ids must be a array',
          400
        );
      }

      reflitching_items_ids = reflitching_items_ids.map((e) =>
        mongoose.Types.ObjectId.createFromHexString(e)
      );

      const fetch_reflitching_items_details =
        await re_flitching_items_model.aggregate([
          {
            $match: {
              _id: { $in: reflitching_items_ids },
            },
          },
        ]);
      if (
        !fetch_reflitching_items_details &&
        fetch_reflitching_items_details?.length <= 0
      ) {
        throw new ApiError('reflitching items not found', 400);
      }

      const re_flitching_other_details_ids = new Set();
      const issue_for_slicing = fetch_reflitching_items_details.map((item) => {
        re_flitching_other_details_ids.add(item.re_flitching_other_details_id);
        return {
          reflitching_item_id: item?._id,
          item_sr_no: item?.item_sr_no,
          item_id: item?.item_id,
          item_name: item?.item_name,
          item_sub_category_id: item?.item_sub_category_id,
          item_sub_category_name: item?.item_sub_category_name,
          color: item?.color,
          flitch_formula: item?.flitch_formula,
          log_no: item?.log_no,
          log_no_code: item?.log_no_code,
          flitch_code: item?.flitch_code,
          length: item?.length,
          width1: item?.width1,
          width2: item?.width2,
          width3: item?.width3,
          height: item?.height,
          cmt: item?.cmt,
          amount: item?.amount,
          expense_amount: item?.expense_amount,
          amount_factor: 1,
          issued_from: issues_for_status?.reflitching,
          is_peeling_done: true,
          remark: item?.remark,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        };
      });

      // add issue for slicing
      const add_issue_for_slicing_data =
        await issued_for_slicing_model.insertMany(issue_for_slicing, {
          session,
        });
      if (
        !add_issue_for_slicing_data ||
        add_issue_for_slicing_data?.length <= 0
      ) {
        throw new ApiError('issue for slicing not added', 400);
      }

      // update issue status for reflitching items
      const reflitching_item_ids = add_issue_for_slicing_data?.map(
        (e) => e.reflitching_item_id
      );
      const update_reflitching_items =
        await re_flitching_items_model.updateMany(
          { _id: { $in: reflitching_item_ids } },
          {
            $set: {
              issue_status: issues_for_status?.slicing,
            },
          },
          { session }
        );
      if (update_reflitching_items?.matchedCount <= 0) {
        throw new ApiError('Not found reflitching items');
      }

      if (
        !update_reflitching_items.acknowledged ||
        update_reflitching_items?.modifiedCount <= 0
      ) {
        throw new ApiError('Unable to change status of reflitching items');
      }

      //update reflitching other details isEditable
      const update_reflitching_other_details =
        await re_flitching_other_details_model.updateMany(
          {},
          {
            $set: {
              isEditable: false,
            },
          },
          { session }
        );
      if (update_reflitching_other_details?.matchedCount <= 0) {
        throw new ApiError('Not found reflitching other details');
      }

      if (
        !update_reflitching_other_details.acknowledged ||
        update_reflitching_other_details?.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Unable to change editable status of reflitching other details'
        );
      }

      await session.commitTransaction();
      const response = new ApiResponse(
        StatusCodes.CREATED,
        'Issued for slicing Successfully',
        add_issue_for_slicing_data
      );
      return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
);

export const fetch_reflitching_items_history = catchAsync(
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
      issue_status: { $ne: null },
    };

    const aggLookupReflitchingOtherDetails = {
      $lookup: {
        from: 're_flitching_other_details',
        localField: 're_flitching_other_details_id',
        foreignField: '_id',
        as: 're_flitching_other_details',
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
        path: '$re_flitching_other_details',
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
      aggLookupReflitchingOtherDetails,
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

    const result = await re_flitching_items_model.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      aggLookupReflitchingOtherDetails,
      aggUnwindOtherDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggCount,
    ];

    const total_docs =
      await re_flitching_items_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(200, 'Data Fetched Successfully', {
      data: result,
      totalPages: totalPages,
    });
    return res.status(200).json(response);
  }
);
