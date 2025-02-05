import {
  log_inventory_invoice_model,
  log_inventory_items_model,
  log_inventory_items_view_model,
} from '../../../../database/schema/inventory/log/log.schema.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../../utils/constants.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';
import mongoose from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import {
  crosscutting_done_model,
  crossCuttingsDone_view_modal,
} from '../../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { issues_for_peeling_model } from '../../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling.schema.js';

export const addIssueForPeelingFromLogInventory = catchAsync(
  async function (req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      const { log_inventory_item_ids } = req.body;

      if (
        !Array.isArray(log_inventory_item_ids) ||
        log_inventory_item_ids.length === 0
      ) {
        throw new ApiError('log_inventory_item_ids must be a array field');
      }

      const logInventoryItemData = await log_inventory_items_view_model
        .find({
          _id: { $in: log_inventory_item_ids },
          issue_status: null,
        })
        .lean();

      if (logInventoryItemData?.length <= 0) {
        throw new ApiError(
          'Log Inventory Item Data Not Found',
          StatusCodes.NOT_FOUND
        );
      }

      const log_invoice_ids = new Set();

      const issue_for_peeling_data = logInventoryItemData?.map(
        (item, index) => {
          log_invoice_ids.add(item.invoice_id);
          return {
            log_inventory_item_id: item?._id,
            crosscut_done_id: null,
            item_id: item?.item_id,
            item_name: item?.item_name,
            color: item?.color,
            item_sub_category_id: item?.item_sub_category_id,
            item_sub_category_name: item?.item_sub_category_name,
            log_no: item?.log_no,
            code: item?.log_no,
            log_no_code: item?.log_no,
            log_formula: item?.log_formula,
            length: item?.physical_length,
            diameter: item?.physical_diameter,
            cmt: item?.physical_cmt,
            amount: item?.amount,
            amount_factor: 1,
            expense_amount: item?.expense_amount,
            issued_from: issues_for_status?.log,
            remark: item?.remark,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          };
        }
      );

      const add_issue_for_peeling = await issues_for_peeling_model.insertMany(
        issue_for_peeling_data,
        { session }
      );

      if (add_issue_for_peeling?.length <= 0) {
        throw new ApiError('Failed to data for issue for peeling', 400);
      }
      const log_item_ids = add_issue_for_peeling?.map(
        (ele) => ele?.log_inventory_item_id
      );

      //updating log inventory item status to peeling
      const update_log_inventory_item_status =
        await log_inventory_items_model.updateMany(
          { _id: { $in: log_item_ids } },
          {
            $set: {
              issue_status: issues_for_status.peeling,
            },
          },
          { session }
        );

      if (update_log_inventory_item_status?.matchedCount <= 0) {
        throw new ApiError('Not found log inventory item');
      }

      if (
        !update_log_inventory_item_status.acknowledged ||
        update_log_inventory_item_status?.modifiedCount <= 0
      ) {
        throw new ApiError('Unable to change status of log inventory item');
      }

      //updating log inventory invoice: if any one of log item send for peeling then invoice should not editable
      const update_log_inventory_invoice_editable =
        await log_inventory_invoice_model.updateMany(
          { _id: { $in: [...log_invoice_ids] } },
          {
            $set: {
              isEditable: false,
            },
          },
          { session }
        );

      if (update_log_inventory_invoice_editable?.modifiedCount <= 0) {
        throw new ApiError('Not found log inventory invoice');
      }

      if (
        !update_log_inventory_invoice_editable.acknowledged ||
        update_log_inventory_invoice_editable?.modifiedCount <= 0
      ) {
        throw new ApiError('Unable to change status of log inventory invoice');
      }

      await session.commitTransaction();

      const response = new ApiResponse(
        StatusCodes.CREATED,
        'Issue for peeling added successfully',
        add_issue_for_peeling
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

export const addIssueForPeelingFromCrosscutDone = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      const { crosscut_done_ids } = req.body;

      if (!Array.isArray(crosscut_done_ids) || crosscut_done_ids.length === 0) {
        throw new ApiError('crosscut_done_ids must be a array field');
      }

      const aggMatch = {
        $match: {
          _id: {
            $in: crosscut_done_ids?.map((ele) =>
              mongoose.Types.ObjectId.createFromHexString(ele)
            ),
          },
          issue_status: null,
        },
      };
      const aggProject = {
        $project: {
          issue_for_crosscutting_id: 1,
          log_inventory_item_id: 1,
          log_no: 1,
          code: 1,
          log_no_code: 1,
          length: 1,
          girth: 1,
          crosscut_cmt: 1,
          cost_amount: 1,
          per_cmt_cost: 1,
          expense_amount: 1,
          issuedCrossCuttingDetails: {
            item_sr_no: 1,
            supplier_item_name: 1,
            supplier_log_no: 1,
            item_id: 1,
            item_name: 1,
            color: {
              color_id: 1,
              color_name: 1,
            },
            item_sub_category_id: 1,
            item_sub_category_name: 1,
            log_formula: 1,
          },
          log_inventory_invoice_details: 1,
        },
      };
      const crosscut_done_data = await crossCuttingsDone_view_modal.aggregate([
        aggMatch,
        aggProject,
      ]);

      if (crosscut_done_data?.length <= 0) {
        throw new ApiError('No Crosscut done data found', 400);
      }

      const issue_for_crosscutting_ids = new Set();
      const issue_for_peeling_data = crosscut_done_data?.map((item, index) => {
        issue_for_crosscutting_ids.add(item?.issue_for_crosscutting_id);
        return {
          log_inventory_item_id: null,
          crosscut_done_id: item?._id,
          item_id: item?.issuedCrossCuttingDetails?.item_id,
          item_name: item?.issuedCrossCuttingDetails?.item_name,
          color: item?.issuedCrossCuttingDetails?.color,
          item_sub_category_id:
            item?.issuedCrossCuttingDetails?.item_sub_category_id,
          item_sub_category_name:
            item?.issuedCrossCuttingDetails?.item_sub_category_name,
          log_no: item?.log_no,
          code: item?.code,
          log_no_code: item?.log_no_code,
          log_formula: item?.issuedCrossCuttingDetails?.log_formula,
          length: item?.length,
          diameter: item?.girth,
          cmt: item?.crosscut_cmt,
          amount: item?.cost_amount,
          amount_factor: 1,
          expense_amount: item?.expense_amount,
          issued_from: issues_for_status?.crosscut_done,
          remark: item?.remarks,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        };
      });

      const add_issue_for_peeling = await issues_for_peeling_model.insertMany(
        issue_for_peeling_data,
        { session }
      );

      if (add_issue_for_peeling?.length <= 0) {
        throw new ApiError('Failed to data for issue for peeling', 400);
      }

      const crosscut_done_issue_ids = add_issue_for_peeling.map(
        (ele) => ele?.crosscut_done_id
      );

      //updating crosscut done status to peeling
      const update_crosscut_done_status =
        await crosscutting_done_model.updateMany(
          { _id: { $in: crosscut_done_issue_ids } },
          {
            $set: {
              issue_status: issues_for_status.peeling,
            },
          },
          { session }
        );

      if (update_crosscut_done_status?.matchedCount <= 0) {
        throw new ApiError('Not found crosscut done');
      }

      if (
        !update_crosscut_done_status.acknowledged ||
        update_crosscut_done_status?.modifiedCount <= 0
      ) {
        throw new ApiError('Unable to change status of crosscut done');
      }

      //updating crosscut done: if any one of item send for peeling then whole with same issue_for_crosscutting_id should not editable
      const update_crosscut_done_editable =
        await crosscutting_done_model.updateMany(
          {
            issue_for_crosscutting_id: { $in: [...issue_for_crosscutting_ids] },
          },
          {
            $set: {
              isEditable: false,
            },
          },
          { session }
        );

      if (update_crosscut_done_editable?.modifiedCount <= 0) {
        throw new ApiError('Not found issue for crosscutting,crosscut done');
      }

      if (
        !update_crosscut_done_editable.acknowledged ||
        update_crosscut_done_editable?.modifiedCount <= 0
      ) {
        throw new ApiError('Unable to change status of editable,crosscut done');
      }

      await session.commitTransaction();

      const response = new ApiResponse(
        StatusCodes.CREATED,
        'Issue for peeling added successfully',
        add_issue_for_peeling
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

export const revert_issue_for_peeling = catchAsync(async (req, res, next) => {
  const { issue_for_peeling_id } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (
      !issue_for_peeling_id ||
      !mongoose.isValidObjectId(issue_for_peeling_id)
    ) {
      throw new ApiError('Invaild Id', StatusCodes.NOT_FOUND);
    }
    const issuedForPeelingData = await issues_for_peeling_model
      .findById(issue_for_peeling_id)
      .lean();

    if (!issuedForPeelingData) {
      throw new ApiError('No Data found...', StatusCodes.BAD_REQUEST);
    }

    const add_revert_to_log_inventory = async function () {
      const updated_document_log_inventory =
        await log_inventory_items_model.findOneAndUpdate(
          { _id: issuedForPeelingData?.log_inventory_item_id },
          {
            $set: {
              issue_status: null,
            },
          },
          { new: true, runValidators: true, session: session }
        );

      if (!updated_document_log_inventory) {
        throw new ApiError(
          'Log inventory item not found or failed to update status',
          StatusCodes.BAD_REQUEST
        );
      }

      const log_inventory_invoice_id =
        updated_document_log_inventory?.invoice_id;

      const is_invoice_editable = await log_inventory_items_model
        ?.find({
          _id: { $ne: issuedForPeelingData?.log_inventory_item_id },
          invoice_id: log_inventory_invoice_id,
          issue_status: { $ne: null },
        })
        .session(session);

      if (is_invoice_editable && is_invoice_editable?.length <= 0) {
        await log_inventory_invoice_model?.updateOne(
          { _id: log_inventory_invoice_id },
          {
            $set: {
              isEditable: true,
            },
          },
          { session }
        );
      }
    };

    const add_revert_to_crosscut_done = async function () {
      const updated_document_crosscut_done =
        await crosscutting_done_model.findOneAndUpdate(
          { _id: issuedForPeelingData?.crosscut_done_id },
          {
            $set: {
              issue_status: null,
            },
          },
          { new: true, runValidators: true, session: session }
        );

      if (!updated_document_crosscut_done) {
        throw new ApiError(
          'Crosscut done item not found or failed to update item status',
          StatusCodes.BAD_REQUEST
        );
      }

      const issue_for_crosscutting_id =
        updated_document_crosscut_done?.issue_for_crosscutting_id;

      const is_crosscut_done_editable = await crosscutting_done_model
        ?.find({
          _id: { $ne: issuedForPeelingData?.crosscut_done_id },
          issue_for_crosscutting_id: issue_for_crosscutting_id,
          issue_status: { $ne: null },
        })
        .lean();

      if (is_crosscut_done_editable && is_crosscut_done_editable?.length <= 0) {
        await crosscutting_done_model.updateMany(
          { issue_for_crosscutting_id: issue_for_crosscutting_id },
          {
            $set: {
              isEditable: true,
            },
          },
          { session }
        );
      }
    };

    if (
      // log-inventory
      issuedForPeelingData?.issued_from === issues_for_status?.log &&
      issuedForPeelingData?.crosscut_done_id === null
    ) {
      await add_revert_to_log_inventory();
    } else if (
      // crosscut done
      issuedForPeelingData?.issued_from === issues_for_status?.crosscut_done &&
      issuedForPeelingData?.crosscut_done_id !== null
    ) {
      await add_revert_to_crosscut_done();
    } else {
      throw new ApiError('No Data found to revert', StatusCodes.BAD_REQUEST);
    }

    const delete_response = await issues_for_peeling_model.deleteOne(
      { _id: issuedForPeelingData?._id },
      { session }
    );

    if (!delete_response?.acknowledged || delete_response?.deletedCount === 0) {
      throw new ApiError(
        'Failed to Revert Items',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Items Reverted Successfully',
      delete_response
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

export const listing_issued_for_peeling = catchAsync(async (req, res, next) => {
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

  const issue_for_peeling =
    await issues_for_peeling_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggCount,
  ]; // total aggregation pipiline

  const totalDocument =
    await issues_for_peeling_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    200,
    'Issue For Peeling Data Fetched Successfully',
    {
      data: issue_for_peeling,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

export const fetch_single_issued_for_peeling_item = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) {
      return next(new ApiError('Invaild Id', StatusCodes.NOT_FOUND));
    }

    // Aggregation stage
    const aggMatch = {
      $match: { _id: mongoose.Types.ObjectId.createFromHexString(id) },
    };
    // const aggCreatedByLookup = {
    //   $lookup: {
    //     from: 'users',
    //     localField: 'created_by',
    //     foreignField: '_id',
    //     pipeline: [
    //       {
    //         $project: {
    //           user_name: 1,
    //           user_type: 1,
    //           dept_name: 1,
    //           first_name: 1,
    //           last_name: 1,
    //           email_id: 1,
    //           mobile_no: 1,
    //         },
    //       },
    //     ],
    //     as: 'created_by',
    //   },
    // };
    // const aggUpdatedByLookup = {
    //   $lookup: {
    //     from: 'users',
    //     localField: 'updated_by',
    //     foreignField: '_id',
    //     pipeline: [
    //       {
    //         $project: {
    //           user_name: 1,
    //           user_type: 1,
    //           dept_name: 1,
    //           first_name: 1,
    //           last_name: 1,
    //           email_id: 1,
    //           mobile_no: 1,
    //         },
    //       },
    //     ],
    //     as: 'updated_by',
    //   },
    // };
    // const aggCreatedByUnwind = {
    //   $unwind: {
    //     path: '$created_by',
    //     preserveNullAndEmptyArrays: true,
    //   },
    // };
    // const aggUpdatedByUnwind = {
    //   $unwind: {
    //     path: '$updated_by',
    //     preserveNullAndEmptyArrays: true,
    //   },
    // };

    const listAggregate = [
      aggMatch,
      // aggCreatedByLookup,
      // aggCreatedByUnwind,
      // aggUpdatedByLookup,
      // aggUpdatedByUnwind,
    ]; // aggregation pipiline

    const issue_for_peeling =
      await issues_for_peeling_model.aggregate(listAggregate);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Issued for peeling Item Fetched Sucessfully',
      issue_for_peeling?.[0]
    );
    return res.status(StatusCodes.OK).json(response);
  }
);
