import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import face_history_model from '../../../../database/schema/inventory/face/face.history.schema.js';
import issue_for_plywood_resizing_model from '../../../../database/schema/factory/plywood_resizing_factory/issue_for_resizing/issue_for_resizing.schema.js';
import { plywood_resizing_done_details_model } from '../../../../database/schema/factory/plywood_resizing_factory/resizing_done/resizing.done.schema.js';
import plywood_resize_damage_model from '../../../../database/schema/factory/plywood_resizing_factory/resizing_damage/resizing_damage.schema.js';
import { face_inventory_items_details } from '../../../../database/schema/inventory/face/face.schema.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';

export const create_resizing = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { resizing_details, is_damage } = req.body;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!resizing_details) {
      throw new ApiError(
        'Resizing Details are required.',
        StatusCodes.BAD_REQUEST
      );
    }

    const issue_for_resizing_details =
      await issue_for_plywood_resizing_model.findOne({
        _id: resizing_details?.issue_for_resizing_id,
      });

    if (!issue_for_resizing_details) {
      throw new ApiError(
        'Issue for Resizing details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    if (issue_for_resizing_details?.is_resizing_done) {
      throw new ApiError(
        'Resizing is already done for this plywood',
        StatusCodes.BAD_REQUEST
      );
    }

    const maxNumber = await plywood_resizing_done_details_model?.aggregate([
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
    

    const [add_resizing_data_result] =
      await plywood_resizing_done_details_model.create(
        [
          {
            sr_no: newMax,
            ...resizing_details,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        { session }
      );

    if (!add_resizing_data_result) {
      throw new ApiError(
        'Failed to add resizing details',
        StatusCodes.BAD_REQUEST
      );
    }

    if (is_damage && resizing_details?.damage_details) {
      const updated_data = {
        issue_for_resizing_id: issue_for_resizing_details?._id,
        no_of_sheets: resizing_details?.damage_details?.no_of_sheets,
        sqm: resizing_details?.damage_details?.sqm,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };

      const [add_damage_data_result] = await plywood_resize_damage_model.create(
        [updated_data],
        { session }
      );

      if (!add_damage_data_result) {
        throw new ApiError(
          'Failed to add damage details',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    if (resizing_details?.face_item_details?.length > 0) {
      const restoreBulkOperations = resizing_details?.face_item_details?.map(
        (face) => ({
          updateOne: {
            filter: { _id: face?.face_item_id },
            update: {
              $inc: {
                available_sheets: -face?.no_of_sheets,
                available_amount: -face?.amount,
                available_sqm: -face?.sqm,
              },
              $set: { updated_by: userDetails?._id },
            },
          },
        })
      );

      if (restoreBulkOperations?.length > 0) {
        const result = await face_inventory_items_details.bulkWrite(
          restoreBulkOperations,
          { session }
        );
        if (result.modifiedCount === 0) {
          throw new ApiError(
            'Failed to update face inventory details',
            StatusCodes.BAD_REQUEST
          );
        }
      }
      console.log("resizing_details?.face_item_details : ",resizing_details?.face_item_details);
      const face_details_array_for_history = resizing_details?.face_item_details?.map((item) => {
        (item.issued_for_plywood_resizing_done_id =add_resizing_data_result?._id),
          (item.issue_status = issues_for_status?.plywood_resizing),
          (item.face_item_id = item?.face_item_id),
          (item.issued_sheets = item.no_of_sheets),
          (item.issued_sqm = item?.sqm),
          (item.issued_amount = item?.amount),
          (item.created_by = userDetails?._id),
          (item.updated_by = userDetails?._id);
          delete item?._id
        return item;
      });

      console.log("face_details_array_for_history : ",face_details_array_for_history);

      const is_face_history_updated = await face_history_model.insertMany(
        face_details_array_for_history,
        { session }
      );

      if (!is_face_history_updated || is_face_history_updated.length === 0) {
        throw new ApiError('Failed to update face history details');
      }


    }
    const update_issue_for_resizing_status =
      await issue_for_plywood_resizing_model.updateOne(
        { _id: issue_for_resizing_details?._id },
        {
          $set: {
            is_resizing_done: true,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_resizing_status?.matchedCount === 0) {
      throw new ApiError(
        'Issue for resizing data not found',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_issue_for_resizing_status?.acknowledged ||
      update_issue_for_resizing_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update status of issue for resizing',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Resizing Created Successfully',
      add_resizing_data_result
    );
    await session.commitTransaction();
    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});
export const update_resizing_done = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { id } = req.params;
  const { resizing_details, is_damage } = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!id) {
      throw new ApiError('ID is missing.', StatusCodes.BAD_REQUEST);
    }
    if (!resizing_details) {
      throw new ApiError(
        'Resizing details are missing.',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID.', StatusCodes.BAD_REQUEST);
    }
    const resizing_done_data = await plywood_resizing_done_details_model
      ?.findById(id)
      .lean();

    if (!resizing_done_data) {
      throw new ApiError('Resizing done data not found', StatusCodes.NOT_FOUND);
    }

    if (resizing_done_data?.face_item_details?.length > 0) {
      console.log("resizing_done_data?.face_item_details? : ",resizing_done_data?.face_item_details);

      const restoreBulkOperations = resizing_done_data?.face_item_details?.map(
        (face) => ({
          updateOne: {
            filter: { _id: face?.face_item_id },
            update: {
              $inc: {
                available_sheets: face?.no_of_sheets,
                available_amount: face?.amount,
                available_sqm: face?.sqm,
              },
              $set: { updated_by: userDetails?._id },
            },
          },
        })
      );

      if (restoreBulkOperations?.length > 0) {
        await face_inventory_items_details.bulkWrite(restoreBulkOperations, {
          session,
        });
      }

      //deleting history even if it is added or edited
      const is_face_history_deleted=await face_history_model.deleteMany({issued_for_plywood_resizing_done_id:id});

      console.log("is_face_history_deleted : ",is_face_history_deleted);

      if (!is_face_history_deleted || is_face_history_deleted.length === 0) {
        throw new ApiError('Failed to update face history details');
      }

      const face_details_array_for_history = resizing_done_data?.face_item_details?.map((item) => {
        (item.issued_for_plywood_resizing_done_id =id),
          (item.issue_status = issues_for_status?.plywood_resizing),
          (item.face_item_id = item?.face_item_id),
          (item.issued_sheets = item.no_of_sheets),
          (item.issued_sqm = item?.sqm),
          (item.issued_amount = item?.amount),
          (item.created_by = userDetails?._id),
          (item.updated_by = userDetails?._id);
          delete item?._id
        return item;
      });

      console.log("face_details_array_for_history : ",face_details_array_for_history);

      const is_face_history_updated = await face_history_model.insertMany(
        face_details_array_for_history,
        { session }
      );

      if (!is_face_history_updated || is_face_history_updated.length === 0) {
        throw new ApiError('Failed to update face history details');
      }

    }
    const updated_data = {
      ...resizing_details,
      'available_details.no_of_sheets': resizing_details.no_of_sheets,
      'available_details.amount': resizing_details.amount,
      'available_details.sqm': resizing_details.sqm,
      updated_by: userDetails?._id,
    };
    const update_resizing_done_result =
      await plywood_resizing_done_details_model.updateOne(
        { _id: id },
        {
          $set: updated_data,
        },
        { session }
      );

    if (update_resizing_done_result.matchedCount === 0) {
      throw new ApiError(
        'Failed to add resizing details',
        StatusCodes.BAD_REQUEST
      );
    }
    if (
      !update_resizing_done_result.acknowledged ||
      update_resizing_done_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update resizing details',
        StatusCodes.BAD_REQUEST
      );
    }

    if (resizing_details?.face_item_details?.length > 0) {
      const restoreBulkOperations = resizing_done_data?.face_item_details?.map(
        (face) => ({
          updateOne: {
            filter: { _id: face?.face_item_id },
            update: {
              $inc: {
                available_sheets: -face?.no_of_sheets,
                available_amount: -face?.amount,
                available_sqm: -face?.sqm,
              },
              $set: { updated_by: userDetails?._id },
            },
          },
        })
      );

      if (restoreBulkOperations?.length > 0) {
        await face_inventory_items_details.bulkWrite(restoreBulkOperations, {
          session,
        });
      }
    }

    if (!is_damage) {
      const delete_damage_document_result =
        await plywood_resize_damage_model.deleteOne(
          { issue_for_resizing_id: resizing_details?.issue_for_resizing_id },
          { session }
        );

      if (!delete_damage_document_result?.acknowledged) {
        throw new ApiError(
          'Failed to delete damage details',
          StatusCodes.BAD_REQUEST
        );
      }
    }
    if (is_damage) {
      if (!resizing_details?.damage_details) {
        throw new ApiError('Damage Details not found.', StatusCodes.NOT_FOUND);
      }
      const updated_data = {
        no_of_sheets: resizing_details?.damage_details?.no_of_sheets,
        sqm: resizing_details?.damage_details?.sqm,
        updated_by: userDetails?._id,
      };

      const update_damage_data_result =
        await plywood_resize_damage_model.findOneAndUpdate(
          { issue_for_resizing_id: resizing_details?.issue_for_resizing_id },
          { $set: updated_data },
          { session }
        );

      if (!update_damage_data_result) {
        const insert_damage_data = await plywood_resize_damage_model.insertMany(
          [
            {
              issue_for_resizing_id: resizing_details?.issue_for_resizing_id,
              ...updated_data,
              updated_by: userDetails?._id,
              created_by: userDetails?._id,
            },
          ],
          { session }
        );

        if (!insert_damage_data) {
          throw new ApiError(
            'Failed to update damage details',
            StatusCodes.BAD_REQUEST
          );
        }
      }
    }
    if (resizing_details?.face_item_details?.length > 0) {
      for (let face of resizing_details?.face_item_details) {
        const update_face_inventory =
          await face_inventory_items_details.updateOne(
            { _id: face?.face_item_id },
            {
              $inc: {
                available_sheets: -face?.no_of_sheets,
                available_amount: face?.amount,
                available_sqm: face?.sqm,
              },
              $set: {
                updated_by: userDetails?._id,
              },
            },
            { session }
          );
        if (update_face_inventory?.matchedCount === 0) {
          throw new ApiError(
            'Face Inventory Item Not found',
            StatusCodes.BAD_REQUEST
          );
        }
        if (
          !update_face_inventory?.acknowledged ||
          update_face_inventory?.modifiedCount === 0
        ) {
          throw new ApiError(
            'Face Inventory Item Not found',
            StatusCodes.BAD_REQUEST
          );
        }
      }
    }
    const response = new ApiResponse(
      StatusCodes.OK,
      'Resizing Item Updated Successfully',
      update_resizing_done_result
    );
    await session.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const listing_resizing_done = catchAsync(async (req, res) => {
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
  };

  // Aggregation stage
  const aggCommonMatch = {
    $match: {
      'available_details.no_of_sheets': { $ne: 0 },
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

  const resizing_done_list =
    await plywood_resizing_done_details_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const [totalDocument] =
    await plywood_resizing_done_details_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

  const response = new ApiResponse(
    200,
    'Resizing Done Data Fetched Successfully',
    {
      data: resizing_done_list,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

export const fetch_single_resizing_done_item_with_issue_for_resizing_data =
  catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }
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
          from: 'issued_for_plywood_resizing_items',
          localField: 'issue_for_resizing_id',
          foreignField: '_id',
          as: 'issue_for_resizing_details',
        },
      },
      {
        $unwind: {
          path: '$issue_for_resizing_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'plywood_resize_damage_details',
          localField: 'issue_for_resizing_id',
          foreignField: 'issue_for_resizing_id',
          as: 'damage_details',
        },
      },
      {
        $unwind: {
          path: '$damage_details',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const result =
      await plywood_resizing_done_details_model.aggregate(pipeline);
    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'Resizing details fetched successfully',
          result
        )
      );
  });

export const revert_resizing_done_items = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userDetails = req.userDetails;
  if (!id) {
    throw new ApiError('ID is missing', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const resizing_done_data = await plywood_resizing_done_details_model
      ?.findById(id)
      .lean();

    if (!resizing_done_data) {
      throw new ApiError('Resizing done data not found', StatusCodes.NOT_FOUND);
    }

    const [delete_resizing_done_result, delete_resizing_damage_result] =
      await Promise.all([
        await plywood_resizing_done_details_model?.deleteOne(
          { _id: resizing_done_data?._id },
          { session }
        ),
        await plywood_resize_damage_model.deleteOne(
          { issue_for_resizing_id: resizing_done_data?.issue_for_resizing_id },
          { session }
        ),
      ]);

    if (
      !delete_resizing_done_result?.acknowledged ||
      delete_resizing_done_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete resizing done details',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!delete_resizing_damage_result?.acknowledged) {
      throw new ApiError(
        'Failed to delete resizing damage details',
        StatusCodes.BAD_REQUEST
      );
    }

    if (resizing_done_data?.face_item_details?.length > 0) {
      const restoreBulkOperations = resizing_done_data?.face_item_details?.map(
        (face) => ({
          updateOne: {
            filter: { _id: face?.face_item_id },
            update: {
              $inc: {
                available_sheets: face?.no_of_sheets,
                available_amount: face?.amount,
                available_sqm: face?.sqm,
              },
              $set: { updated_by: userDetails?._id },
            },
          },
        })
      );

      if (restoreBulkOperations?.length > 0) {
        const result = await face_inventory_items_details.bulkWrite(
          restoreBulkOperations,
          { session }
        );
        if (result?.modifiedCount === 0) {
          throw new ApiError(
            'Failed to update face inventory item details',
            StatusCodes.BAD_REQUEST
          );
        }
      }
    }

    const update_is_resizing_done_status_from_issue_for_resizing =
      await issue_for_plywood_resizing_model?.updateOne(
        { _id: resizing_done_data?.issue_for_resizing_id },
        {
          $set: {
            is_resizing_done: false,
          },
        },
        { session }
      );

    if (
      update_is_resizing_done_status_from_issue_for_resizing.matchedCount === 0
    ) {
      throw new ApiError(
        'Issue for resizing item not found.',
        StatusCodes.NOT_FOUND
      );
    }

    if (
      !update_is_resizing_done_status_from_issue_for_resizing?.acknowledged ||
      update_is_resizing_done_status_from_issue_for_resizing.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update resizind done status.',
        StatusCodes.NOT_FOUND
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Resizing details Reverted Successfully',
      delete_resizing_done_result
    );
    await session.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});
