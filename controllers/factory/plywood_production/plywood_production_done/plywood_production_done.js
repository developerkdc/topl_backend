import {
  plywood_production_consumed_items_model,
  plywood_production_model,
} from '../../../../database/schema/factory/plywood_production/plywood_production.schema.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';

import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import mongoose, { isValidObjectId } from 'mongoose';
import face_history_model from '../../../../database/schema/inventory/face/face.history.schema.js';
import core_history_model from '../../../../database/schema/inventory/core/core.history.schema.js';
import { face_inventory_items_details } from '../../../../database/schema/inventory/face/face.schema.js';
import { core_inventory_items_details } from '../../../../database/schema/inventory/core/core.schema.js';
import { plywood_production_damage_model } from '../../../../database/schema/factory/plywood_production/plywood_production_damage_sheets.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';

export const listing_plywood_production_done = catchAsync(
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

    const plywood_production_list =
      await plywood_production_model.aggregate(listAggregate);

    const aggCount = {
      $count: 'totalCount',
    }; // count aggregation stage

    const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

    const totalDocument =
      await plywood_production_model.aggregate(totalAggregate);

    const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
      200,
      'Plywood production Data Fetched Successfully',
      {
        data: plywood_production_list,
        totalPages: totalPages,
      }
    );
    return res.status(200).json(response);
  }
);

export const single_plywood_production_done_for_update = catchAsync(
  async (req, res) => {
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
          from: 'plywood_production_consumed_items',
          localField: '_id',
          foreignField: 'plywood_production_id',
          as: 'plywood_production_consumed_items_details',
        },
      },
      //   {
      //       $unwind: {
      //           path: "$plywood_production_consumed_items_details",
      //           preserveNullAndEmptyArrays: true
      //       }
      //   }
    ];

    const [result] = await plywood_production_model.aggregate(pipeline);

    const core_item_list = [];
    const face_item_list = [];

    result?.plywood_production_consumed_items_details?.map((item) => {
      if (
        item?.core_inventory_item_id !== null &&
        item?.face_inventory_item_id === null
      ) {
        core_item_list.push(item);
      } else {
        face_item_list.push(item);
      }
    });

    delete result?.plywood_production_consumed_items_details;

    const finalResult = {
      plywood_production_details: result,
      face_details_array: face_item_list,
      core_details_array: core_item_list,
    };
    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'Plywood production details fetched successfully',
          finalResult
        )
      );
  }
);

export const update_plywood_production_done = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { id } = req.params;
  const { plywood_production_details, face_details_array, core_details_array } =
    req.body;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!id) {
      throw new ApiError('ID is missing.', StatusCodes.BAD_REQUEST);
    }

    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID.', StatusCodes.BAD_REQUEST);
    }
    if (!plywood_production_details) {
      throw new ApiError(
        'Plywood production details are missing.',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!face_details_array) {
      throw new ApiError(
        'face_details_array  details are missing.',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!core_details_array) {
      throw new ApiError(
        'core_details_array details are missing.',
        StatusCodes.BAD_REQUEST
      );
    }

    if (core_details_array?.length === 0) {
      throw new ApiError('Atleast One Core required.', StatusCodes.BAD_REQUEST);
    }

    if (face_details_array?.length === 0) {
      throw new ApiError('Atleast One Face required.', StatusCodes.BAD_REQUEST);
    }

    console.log("plywood_production_details : ",plywood_production_details);
    const plywood_production_done_data = await plywood_production_model
      .findById(id)
      .lean();
    // const resizing_done_data = await plywood_resizing_done_details_model?.findById(id).lean();

    if (!plywood_production_done_data) {
      throw new ApiError(
        'Plywood Production done data not found',
        StatusCodes.NOT_FOUND
      );
    }

    const updated_plywood_production_data =
      await plywood_production_model.updateOne(
        { _id: plywood_production_done_data?._id },
        {
          $set:{
            item_name: plywood_production_details?.item_name,
            sub_category: plywood_production_details?.sub_category,
            length: plywood_production_details?.length,
            width: plywood_production_details?.width,
            thickness: plywood_production_details?.thickness,
            no_of_sheets: plywood_production_details?.issued_sheets,
            total_sqm: plywood_production_details?.issued_sqm,
            amount:plywood_production_details?.issued_amount,
            available_sheets:plywood_production_details?.available_sheets,
            available_sqm:plywood_production_details?.available_sqm,
            available_amount:plywood_production_details?.available_amount,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (
      !updated_plywood_production_data ||
      updated_plywood_production_data.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update Plywood production details',
        StatusCodes?.BAD_REQUEST
      );
    }

    //fetching all plywood_production_consumed_items_details base on plywood_production_id so we can revert sheets face and core inventory
    const plywood_production_consumed_items =
      await plywood_production_consumed_items_model.find({
        plywood_production_id: plywood_production_done_data?._id,
      });

    if (
      !plywood_production_consumed_items ||
      plywood_production_consumed_items.length == 0
    ) {
      throw new ApiError(
        'Failed to fetch plywood production consumed items',
        StatusCodes?.BAD_REQUEST
      );
    }

    const is_face_and_core_details_reverted = await Promise.all(
      plywood_production_consumed_items?.map(async (item) => {
        const promiseArray = [];
        if (
          item.face_inventory_item_id !== null &&
          item.core_inventory_item_id === null
        ) {
          const is_face_updated = await face_inventory_items_details.updateOne(
            { _id: item?.face_inventory_item_id },
            {
              $inc: {
                available_sheets: item?.number_of_sheets,
                available_amount: item?.amount,
                available_sqm: item?.total_sq_meter,
              },
              $set: {
                // issue_status: issues_for_status?.plywood_resizing,
                updated_by: userDetails?._id,
              },
            },
            { session }
          );
          promiseArray.push(is_face_updated);
        } else {
          const is_core_updated = await core_inventory_items_details.updateOne(
            { _id: item?.core_inventory_item_id },
            {
              $inc: {
                available_sheets: item?.number_of_sheets,
                available_amount: item?.amount,
                available_sqm: item?.total_sq_meter,
              },
              $set: {
                // issue_status: issues_for_status?.plywood_resizing,
                updated_by: userDetails?._id,
              },
            },
            { session }
          );

          promiseArray.push(is_core_updated);
        }
        return promiseArray;
      })
    );

    if (
      !is_face_and_core_details_reverted ||
      is_face_and_core_details_reverted.length <= 0
    ) {
      throw new ApiError(
        'Failed to revert plywood production consumed items into face and core inventory',
        StatusCodes?.BAD_REQUEST
      );
    }

    //deleting issued item for plywood production to insert new one

    const is_plywood_production_consumed_items_deleted =
      await plywood_production_consumed_items_model.deleteMany(
        {
          plywood_production_id: plywood_production_done_data?._id,
        },
        { session }
      );

    if (
      !is_plywood_production_consumed_items_deleted ||
      is_plywood_production_consumed_items_deleted.deletedCount <= 0
    ) {
      throw new ApiError(
        'Failed to delete plywood production consumed items',
        StatusCodes?.BAD_REQUEST
      );
    }

    const is_face_history_deleted = await face_history_model.deleteMany(
      {
        issued_for_plywood_production_id: plywood_production_done_data?._id,
      },
      { session }
    );

    if (!is_face_history_deleted || is_face_history_deleted.deletedCount <= 0) {
      throw new ApiError(
        'Failed to delete Face history items',
        StatusCodes?.BAD_REQUEST
      );
    }

    const is_core_history_deleted = await core_history_model.deleteMany(
      {
        issued_for_plywood_production_id: plywood_production_done_data?._id,
      },
      { session }
    );

    if (!is_core_history_deleted || is_core_history_deleted.deletedCount <= 0) {
      throw new ApiError(
        'Failed to delete Core history items',
        StatusCodes?.BAD_REQUEST
      );
    }

    // const is_new=await plywood_production_consumed_items_model.insertMany()

    const new_face_details = face_details_array?.map((item) => {
      item.face_inventory_item_id = item?._id;
      item.no_of_sheets = item?.issued_sheets;
      item.sqm = item?.issued_sqm;
      item.amount = item?.issued_amount;
      item.plywood_production_id = plywood_production_done_data?._id;
      return item;
    });

    const new_core_details = core_details_array?.map((item) => {
      item.core_inventory_item_id = item?._id;
      item.no_of_sheets = item?.issued_sheets;
      item.sqm = item?.issued_sqm;
      item.amount = item?.issued_amount;
      item.plywood_production_id = plywood_production_done_data?._id;
      return item;
    });

    const insert_plywood_production_consumed_items =
      await plywood_production_consumed_items_model.insertMany(
        [...new_face_details, ...new_core_details],
        { session }
      );

    if (
      !insert_plywood_production_consumed_items ||
      insert_plywood_production_consumed_items.length === 0
    ) {
      throw new ApiError(
        'Failed to insert plywood production consumed items',
        StatusCodes.BAD_REQUEST
      );
    }

    const is_face_details_updated = await Promise.all(
      face_details_array.map((item) =>
        face_inventory_items_details.updateOne(
          { _id: item?._id },
          {
            $inc: {
              available_sheets: -item.issued_sheets,
              available_amount: -item.issued_amount,
              available_sqm: -item.issued_sqm,
            },
            $set: {
              // issue_status: issues_for_status?.plywood_resizing,
              updated_by: userDetails?._id,
            },
          },
          { session }
        )
      )
    );

    if (!is_face_details_updated || is_face_details_updated.length === 0) {
      throw new ApiError('Failed to update face inventory details');
    }

    const face_details_array_for_history = face_details_array.map((item) => {
      // item.issued_for_order_id= issue_for_order_id,
      (item.face_item_id=item?._id),
      (item.issued_for_plywood_production_id =
        plywood_production_done_data?._id),
        (item.issue_status = issues_for_status?.plywood_production),
        (item.face_item_id = item?._id),
        (item.issued_sheets = item.issued_sheets),
        (item.issued_sqm = item?.issued_sqm),
        (item.issued_amount = item?.issued_amount),
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

    const is_core_details_updated = await Promise.all(
      core_details_array.map((item) =>
        core_inventory_items_details.updateOne(
          { _id: item?._id },
          {
            $inc: {
              available_sheets: -item.issued_sheets,
              available_amount: -item.issued_amount,
              available_sqm: -item.issued_sqm,
            },
            $set: {
              // issue_status: issues_for_status?.plywood_resizing,
              updated_by: userDetails?._id,
            },
          },
          { session }
        )
      )
    );

    if (!is_core_details_updated || is_core_details_updated.length === 0) {
      throw new ApiError('Failed to update core inventory details');
    }

    const core_details_array_for_history = core_details_array.map((item) => {
      // item.issued_for_order_id= issue_for_order_id,
      (item.core_item_id=item?._id),
      (item.issued_for_plywood_production_id =
        plywood_production_done_data?._id),
        (item.issue_status = issues_for_status?.plywood_production),
        (item.core_item_id = item?._id),
        (item.issued_sheets = item.issued_sheets),
        (item.issued_sqm = item?.issued_sqm),
        (item.issued_amount = item?.issued_amount),
        (item.created_by = userDetails?._id),
        (item.updated_by = userDetails?._id);
        delete item?._id
      return item;
    });

    const is_core_history_updated = await core_history_model.insertMany(
      core_details_array_for_history,
      { session }
    );

    if (!is_core_history_updated || is_core_history_updated.length === 0) {
      throw new ApiError('Failed to update core history');
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Plywood Production done Updated Successfully',
      {
        plywood_production_details: updated_plywood_production_data,
        plywood_production_consumed_items:
          insert_plywood_production_consumed_items,
      }
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

export const add_to_damage_from_plywood_production_done = catchAsync(
  async (req, res) => {
    const userDetails = req.userDetails;
    const { id } = req.params;
    const { damage_sheets } = req.body;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      if (!id) {
        throw new ApiError('ID is missing.', StatusCodes.BAD_REQUEST);
      }

      if (!isValidObjectId(id)) {
        throw new ApiError('Invalid ID.', StatusCodes.BAD_REQUEST);
      }

      if (!damage_sheets) {
        throw new ApiError(
          'Damage sheets are missing.',
          StatusCodes.BAD_REQUEST
        );
      }

      const plywood_production_data = await plywood_production_model
        .findById(id)
        .lean();

      const maxNumber = await plywood_production_damage_model.aggregate([
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

      const added_plywood_production_damage_sheets =
        await plywood_production_damage_model.insertMany(
          {
            sr_no: newMax,
            item_name: plywood_production_data?.item_name,
            sub_category: plywood_production_data?.sub_category,
            length: plywood_production_data?.length,
            width: plywood_production_data?.width,
            thickness: plywood_production_data?.thickness,
            no_of_sheets: plywood_production_data?.no_of_sheets,
            total_sqm: plywood_production_data?.total_sqm,
            plywood_production_id: plywood_production_data?._id,
            damage_sheets: damage_sheets,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
          { session }
        );

      if (
        !added_plywood_production_damage_sheets ||
        added_plywood_production_damage_sheets.lenght === 0
      ) {
        throw new ApiError(
          'Failed to insert plywood production damage data',
          StatusCodes.BAD_REQUEST
        );
      }

      const update_plywood_production_after_added_to_damage =
        await plywood_production_model.updateOne(
          { _id: plywood_production_data?._id },
          {
            $inc: {
              available_no_of_sheets: -Number(damage_sheets),
            },
            $set: {
              is_added_to_damage: true,
            },
          },
          { session }
        );

      if (
        !update_plywood_production_after_added_to_damage ||
        update_plywood_production_after_added_to_damage?.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Failed update plywood production after added to damage',
          StatusCodes.BAD_REQUEST
        );
      }

      const response = new ApiResponse(
        StatusCodes.OK,
        'Damage sheets added Successfully',
        added_plywood_production_damage_sheets
      );

      await session.commitTransaction();
      return res.status(StatusCodes.OK).json(response);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
);
