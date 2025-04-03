import mongoose from 'mongoose';
import dressing_done_history_model from '../../../database/schema/factory/dressing/dressing_done/dressing.done.history.schema.js';
import {
  dressing_done_items_model,
  dressing_done_other_details_model,
} from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import {
  issues_for_grouping_model,
  issues_for_grouping_view_model,
} from '../../../database/schema/factory/grouping/issues_for_grouping.schema.js';
import process_done_history_model from '../../../database/schema/factory/smoking_dying/smoking_dying_done.history.schema.js';
import {
  process_done_details_model,
  process_done_items_details_model,
} from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { veneer_inventory_invoice_model, veneer_inventory_items_model } from '../../../database/schema/inventory/venner/venner.schema.js';


export const issue_for_grouping_from_veneer_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { veneer_inventory_item_ids } = req.body;
    if (
      !veneer_inventory_item_ids ||
      (Array.isArray(veneer_inventory_item_ids) &&
        veneer_inventory_item_ids?.length <= 0)
    ) {
      throw new ApiError(
        'veneer_inventory_item_ids is required',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!Array.isArray(veneer_inventory_item_ids)) {
      throw new ApiError(
        'veneer_inventory_item_ids must be array',
        StatusCodes.BAD_REQUEST
      );
    }

    const fetch_veneer_inventory_item_details = await veneer_inventory_items_model.find({
      _id: { $in: veneer_inventory_item_ids },
      issue_status: null
    });
    if (!fetch_veneer_inventory_item_details || fetch_veneer_inventory_item_details?.length <= 0) {
      throw new ApiError("veneer inventory item not found", StatusCodes.NOT_FOUND);
    }

    const unique_identifier = new mongoose.Types.ObjectId();
    const issue_for_grouping_details = fetch_veneer_inventory_item_details?.map((e) => {
      return {
        unique_identifier: unique_identifier,
        veneer_inventory_invoice_id: e.invoice_id,
        veneer_inventory_item_id: e._id,
        item_name: e?.item_name,
        item_name_id: e?.item_id,
        item_sub_category_id: e?.item_sub_category_id,
        item_sub_category_name: e?.item_sub_category_name,
        log_no_code: e?.log_code,
        length: e?.length,
        width: e?.width,
        thickness: e?.thickness,
        no_of_leaves: e?.number_of_leaves,
        sqm: e?.total_sq_meter,
        bundle_number: e?.bundle_number,
        pallet_number: e?.pallet_number,
        color_id: e?.color?.color_id,
        color_name: e?.color?.color_name,
        character_id: e?.character_id,
        character_name: e?.character_name,
        pattern_id: e?.pattern_id,
        pattern_name: e?.pattern_name,
        series_id: e?.series_id,
        series_name: e?.series_name,
        grade_id: e?.grades_id,
        grade_name: e?.grades_name,
        amount: e?.amount,
        issued_from: issues_for_status?.veneer,
        remark: e?.remark,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      }
    });


    const add_issues_for_grouping = await issues_for_grouping_model.insertMany(
      issue_for_grouping_details,
      { session }
    );

    if (add_issues_for_grouping?.length <= 0) {
      throw new ApiError(
        'Failed to add data,issue for grouping',
        StatusCodes.NOT_FOUND
      );
    }

    const veneer_invoice_ids = add_issues_for_grouping?.map((e) => e.veneer_inventory_invoice_id);
    const veneer_items_ids = add_issues_for_grouping?.map((e) => e.veneer_inventory_item_id);


    // update venner items issue status to grouping
    const update_veneer_items = await veneer_inventory_items_model.updateMany(
      {
        _id: { $in: veneer_items_ids },
      },
      {
        $set: {
          issue_status: issues_for_status.grouping,
          updated_by: userDetails?._id,
        },
      },
      { session }
    );

    if (update_veneer_items.matchedCount <= 0) {
      throw new ApiError(
        'Failed to update veneer items issue status',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_veneer_items.acknowledged ||
      update_veneer_items.matchedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update veneer items issue status',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }


    // update veneer invoice editable status
    const update_veneer_invoice_editable = await veneer_inventory_invoice_model.updateMany(
      {
        _id: { $in: veneer_invoice_ids },
      },
      {
        $set: {
          isEditable: false,
          updated_by: userDetails?._id,
        },
      },
      { session }
    );

    if (update_veneer_invoice_editable.matchedCount <= 0) {
      throw new ApiError(
        'Failed to update veneer invoice editable',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_veneer_invoice_editable.acknowledged ||
      update_veneer_invoice_editable.matchedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update veneer invoice editable',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }


    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Issue for grouping added successfully',
      add_issues_for_grouping
    );
    await session.commitTransaction();
    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
})

export const issue_for_grouping_from_smoking_dying_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { process_done_id } = req.params;
    const { process_done_items_ids } = req.body;
    if (!process_done_id) {
      throw new ApiError(
        'process_done_id is required',
        StatusCodes.BAD_REQUEST
      );
    }
    if (
      !process_done_items_ids ||
      (Array.isArray(process_done_items_ids) &&
        process_done_items_ids?.length <= 0)
    ) {
      throw new ApiError(
        'process_done_items_ids is required',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!Array.isArray(process_done_items_ids)) {
      throw new ApiError(
        'process_done_items_ids must be array',
        StatusCodes.BAD_REQUEST
      );
    }

    const process_done_items_details =
      await process_done_items_details_model.find({
        process_done_id: process_done_id,
        _id: { $in: process_done_items_ids },
        issue_status: null,
      });

    if (
      !process_done_items_details ||
      process_done_items_details?.length <= 0
    ) {
      throw new ApiError(
        'process_done_items_details not found',
        StatusCodes.NOT_FOUND
      );
    }
    const unique_identifier = new mongoose.Types.ObjectId();
    const issue_for_grouping_details = process_done_items_details?.map((e) => {
      return {
        unique_identifier: unique_identifier,
        process_done_id: e.process_done_id,
        process_done_item_id: e._id,
        item_name: e?.item_name,
        item_name_id: e?.item_name_id,
        item_sub_category_id: e?.item_sub_category_id,
        item_sub_category_name: e?.item_sub_category_name,
        log_no_code: e?.log_no_code,
        length: e?.length,
        width: e?.width,
        thickness: e?.thickness,
        no_of_leaves: e?.no_of_leaves,
        sqm: e?.sqm,
        bundle_number: e?.bundle_number,
        pallet_number: e?.pallet_number,
        color_id: e?.color_id,
        color_name: e?.color_name,
        character_id: e?.character_id,
        character_name: e?.character_name,
        pattern_id: e?.pattern_id,
        pattern_name: e?.pattern_name,
        series_id: e?.series_id,
        series_name: e?.series_name,
        grade_id: e?.grade_id,
        grade_name: e?.grade_name,
        amount: e?.amount,
        issued_from: issues_for_status?.smoking_dying,
        remark: e?.remark,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      }
    });


    const add_issues_for_grouping = await issues_for_grouping_model.insertMany(
      issue_for_grouping_details,
      { session }
    );

    if (add_issues_for_grouping?.length <= 0) {
      throw new ApiError(
        'Failed to add data,issue for grouping',
        StatusCodes.NOT_FOUND
      );
    }

    // update process done editable status
    const update_process_done_editable =
      await process_done_details_model.updateOne(
        {
          _id: process_done_id,
        },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_process_done_editable.matchedCount <= 0) {
      throw new ApiError(
        'Failed to update process done editable',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_process_done_editable.acknowledged ||
      update_process_done_editable.matchedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update process done editable',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // update process done item issue status to grouping
    const process_done_items_id_from_issue_for_grouping = add_issues_for_grouping?.map((e) => e.process_done_item_id);
    const update_process_done_items =
      await process_done_items_details_model.updateMany(
        {
          process_done_id: process_done_id,
          _id: { $in: process_done_items_id_from_issue_for_grouping },
        },
        {
          $set: {
            issue_status: issues_for_status.grouping,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_process_done_items.matchedCount <= 0) {
      throw new ApiError(
        'Failed to update process done items issue status',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_process_done_items.acknowledged ||
      update_process_done_items.matchedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update process done items issue status',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // add to process done history
    const add_process_done_history = await process_done_history_model.create(
      [
        {
          process_done_id: process_done_id,
          bundles: process_done_items_id_from_issue_for_grouping,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        },
      ],
      { session }
    );

    if (!add_process_done_history?.[0]) {
      throw new ApiError(
        'Failed to add process done history',
        StatusCodes.NOT_FOUND
      );
    }

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Issue for grouping added successfully',
      add_issues_for_grouping
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

export const issue_for_grouping_from_dressing_done = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { dressing_done_id } = req.params;
    const { dressing_done_items_ids } = req.body;
    if (!dressing_done_id) {
      throw new ApiError(
        'dressing_done_id is required',
        StatusCodes.BAD_REQUEST
      );
    }
    if (
      !dressing_done_items_ids ||
      (Array.isArray(dressing_done_items_ids) &&
        dressing_done_items_ids?.length <= 0)
    ) {
      throw new ApiError(
        'dressing_done_items_ids is required',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!Array.isArray(dressing_done_items_ids)) {
      throw new ApiError(
        'dressing_done_items_ids must be array',
        StatusCodes.BAD_REQUEST
      );
    }

    const dressing_done_items_details = await dressing_done_items_model.find({
      dressing_done_other_details_id: dressing_done_id,
      _id: { $in: dressing_done_items_ids },
      issue_status: null,
    });

    if (
      !dressing_done_items_details ||
      dressing_done_items_details?.length <= 0
    ) {
      throw new ApiError(
        'dressing_done_items_details not found',
        StatusCodes.NOT_FOUND
      );
    }

    const unique_identifier = new mongoose.Types.ObjectId();
    const issue_for_grouping_details = dressing_done_items_details?.map((e) => {
      return {
        unique_identifier: unique_identifier,
        dressing_done_id: e.dressing_done_other_details_id,
        dressing_done_item_id: e._id,
        item_name: e?.item_name,
        item_name_id: e?.item_name_id,
        item_sub_category_id: e?.item_sub_category_id,
        item_sub_category_name: e?.item_sub_category_name,
        log_no_code: e?.log_no_code,
        length: e?.length,
        width: e?.width,
        thickness: e?.thickness,
        no_of_leaves: e?.no_of_leaves,
        sqm: e?.sqm,
        bundle_number: e?.bundle_number,
        pallet_number: e?.pallet_number,
        color_id: e?.color_id,
        color_name: e?.color_name,
        character_id: e?.character_id,
        character_name: e?.character_name,
        pattern_id: e?.pattern_id,
        pattern_name: e?.pattern_name,
        series_id: e?.series_id,
        series_name: e?.series_name,
        grade_id: e?.grade_id,
        grade_name: e?.grade_name,
        amount: e?.amount,
        issued_from: issues_for_status?.dressing,
        remark: e?.remark,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      }
    });

    const add_issues_for_grouping = await issues_for_grouping_model.insertMany(
      issue_for_grouping_details,
      { session }
    );

    if (add_issues_for_grouping?.length <= 0) {
      throw new ApiError(
        'Failed to add data,issue for grouping',
        StatusCodes.NOT_FOUND
      );
    }

    // update dressing done editable status
    const update_dressing_done_editable =
      await dressing_done_other_details_model.updateOne(
        {
          _id: dressing_done_id,
        },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_dressing_done_editable.matchedCount <= 0) {
      throw new ApiError(
        'Failed to update dressing done editable',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_dressing_done_editable.acknowledged ||
      update_dressing_done_editable.matchedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update dressing done editable',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // update dressing done item issue status to grouping
    const dressing_done_items_id_from_issue_for_grouping = add_issues_for_grouping?.map((e) => e.dressing_done_item_id);
    const update_dressing_done_items =
      await dressing_done_items_model.updateMany(
        {
          _id: { $in: dressing_done_items_id_from_issue_for_grouping },
          dressing_done_other_details_id: dressing_done_id,
        },
        {
          $set: {
            issue_status: issues_for_status.grouping,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_dressing_done_items.matchedCount <= 0) {
      throw new ApiError(
        'Failed to update dressing done items issue status',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_dressing_done_items.acknowledged ||
      update_dressing_done_items.matchedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update dressing done items issue status',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // add to dressing done history
    const dressing_done_history = await dressing_done_history_model.create(
      [
        {
          dressing_done_other_details_id: dressing_done_id,
          bundles: dressing_done_items_id_from_issue_for_grouping,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        },
      ],
      { session }
    );

    if (!dressing_done_history?.[0]) {
      throw new ApiError(
        'Failed to add dressing done history',
        StatusCodes.NOT_FOUND
      );
    }

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Issue for grouping added successfully',
      add_issues_for_grouping
    );
    // console.log(add_issues_for_grouping);
    // throw new Error("pppp")
    await session.commitTransaction();
    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const revert_issue_for_grouping = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { unique_identifier, pallet_number } = req.params;
    if (!unique_identifier || !pallet_number) {
      throw new ApiError(`Please provide unique_identifier or pallet_number`, StatusCodes.BAD_REQUEST);
    }

    const fetch_issue_for_grouping_details = await issues_for_grouping_view_model.aggregate([
      {
        $match: {
          _id: {
            unique_identifier: mongoose.Types.ObjectId.createFromHexString(unique_identifier),
            pallet_number: pallet_number,
          }
        }
      }
    ]);

    const issue_for_grouping = fetch_issue_for_grouping_details?.[0]
    if (!issue_for_grouping) {
      throw new ApiError('issue for grouping not found', StatusCodes.NOT_FOUND);
    }

    const revert_to_process_done = async function () {
      const process_done_id = issue_for_grouping?.bundles_details?.map((e) => e.process_done_id);
      const process_done_items_ids = issue_for_grouping?.bundles_details?.map((e) => e.process_done_item_id);

      // update process done item issue status to null
      const update_process_done_items =
        await process_done_items_details_model.updateMany(
          {
            process_done_id: { $in: process_done_id },
            _id: { $in: process_done_items_ids },
            issue_status: issues_for_status.grouping,
          },
          {
            $set: {
              issue_status: null,
              updated_by: userDetails?._id,
            },
          },
          { session }
        );

      if (update_process_done_items.matchedCount <= 0) {
        throw new ApiError(
          'Failed to update process done items issue status',
          StatusCodes.NOT_FOUND
        );
      }
      if (
        !update_process_done_items.acknowledged ||
        update_process_done_items.matchedCount <= 0
      ) {
        throw new ApiError(
          'Failed to update process done items issue status',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // delete from process done history
      const delete_process_done_history =
        await process_done_history_model.deleteMany(
          {
            process_done_id: { $in: process_done_id },
            bundles: { $all: process_done_items_ids },
          },
          { session }
        );

      if (
        !delete_process_done_history?.acknowledged ||
        delete_process_done_history?.deletedCount <= 0
      ) {
        throw new ApiError(
          'Failed to delete process done history',
          StatusCodes.NOT_FOUND
        );
      }

      // Check is process done is editable
      const is_process_done_editable =
        await process_done_items_details_model.find({
          _id: { $nin: process_done_items_ids },
          process_done_id: { $in: process_done_id },
          issue_status: { $ne: null },
        }).session(session);

      if (is_process_done_editable && is_process_done_editable?.length <= 0) {
        const update_process_done_editable =
          await process_done_details_model.updateOne(
            { _id: { $in: process_done_id } },
            {
              $set: {
                isEditable: true,
                updated_by: userDetails?._id,
              },
            },
            { session }
          );

        if (update_process_done_editable.matchedCount <= 0) {
          throw new ApiError(
            'Failed to find process done',
            StatusCodes.NOT_FOUND
          );
        }
        if (
          !update_process_done_editable.acknowledged ||
          update_process_done_editable.matchedCount <= 0
        ) {
          throw new ApiError(
            'Failed to update process done editable',
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
      }
    };

    const revert_to_dressing_done = async function () {
      const dressing_done_id = issue_for_grouping?.bundles_details?.map((e) => e.dressing_done_id);
      const dressing_done_items_ids = issue_for_grouping?.bundles_details?.map((e) => e.dressing_done_item_id);

      // update dressing done item issue status to null
      const update_dressing_done_items =
        await dressing_done_items_model.updateMany(
          {
            dressing_done_other_details_id: { $in: dressing_done_id },
            _id: { $in: dressing_done_items_ids },
            issue_status: issues_for_status.grouping,
          },
          {
            $set: {
              issue_status: null,
              updated_by: userDetails?._id,
            },
          },
          { session }
        );

      if (update_dressing_done_items.matchedCount <= 0) {
        throw new ApiError(
          'Failed to update dressing done items issue status',
          StatusCodes.NOT_FOUND
        );
      }
      if (
        !update_dressing_done_items.acknowledged ||
        update_dressing_done_items.matchedCount <= 0
      ) {
        throw new ApiError(
          'Failed to update dressing done items issue status',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // delete from dressing done history
      const delete_dressing_done_history =
        await dressing_done_history_model.deleteMany(
          {
            dressing_done_other_details_id: { $in: dressing_done_id },
            bundles: { $all: dressing_done_items_ids },
          },
          { session }
        );

      if (
        !delete_dressing_done_history?.acknowledged ||
        delete_dressing_done_history?.deletedCount <= 0
      ) {
        throw new ApiError(
          'Failed to delete dressing done history',
          StatusCodes.NOT_FOUND
        );
      }

      // Check is dressing done is editable
      const is_dressing_done_editable = await dressing_done_items_model.find({
        _id: { $nin: dressing_done_items_ids },
        dressing_done_other_details_id: { $in: dressing_done_id },
        issue_status: { $ne: null },
      }).session(session);

      if (is_dressing_done_editable && is_dressing_done_editable?.length <= 0) {
        const update_dressing_done_editable =
          await dressing_done_other_details_model.updateOne(
            { _id: { $in: dressing_done_id } },
            {
              $set: {
                isEditable: true,
                updated_by: userDetails?._id,
              },
            },
            { session }
          );

        if (update_dressing_done_editable.matchedCount <= 0) {
          throw new ApiError(
            'Failed to find dressing done',
            StatusCodes.NOT_FOUND
          );
        }
        if (
          !update_dressing_done_editable.acknowledged ||
          update_dressing_done_editable.matchedCount <= 0
        ) {
          throw new ApiError(
            'Failed to update dressing done editable',
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
      }
    };

    const revert_to_veneer_inventory = async function () {
      const veneer_inventory_invoice_ids = issue_for_grouping?.bundles_details?.map((e) => e.veneer_inventory_invoice_id);
      const veneer_inventory_item_ids = issue_for_grouping?.bundles_details?.map((e) => e.veneer_inventory_item_id);

      // update veneer items issue status to null
      const update_veneer_items = await veneer_inventory_items_model.updateMany(
        {
          _id: { $in: veneer_inventory_item_ids },
        },
        {
          $set: {
            issue_status: null,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

      if (update_veneer_items.matchedCount <= 0) {
        throw new ApiError(
          'Failed to update veneer items issue status',
          StatusCodes.NOT_FOUND
        );
      }
      if (
        !update_veneer_items.acknowledged ||
        update_veneer_items.matchedCount <= 0
      ) {
        throw new ApiError(
          'Failed to update veneer items issue status',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      //check is veneer invoice is editable
      const veneer_invoice_editable = await veneer_inventory_items_model.find({
        _id: { $nin: veneer_inventory_item_ids },
        invoice_id: { $in: veneer_inventory_invoice_ids },
        issue_status: { $ne: null }
      });

      if (veneer_invoice_editable && veneer_invoice_editable?.length <= 0) {
        const update_veneer_invoice = await veneer_inventory_invoice_model.updateMany(
          { _id: { $in: veneer_inventory_invoice_ids } },
          {
            $set: {
              isEditable: true,
            },
          },
          { session }
        );
        if (update_veneer_invoice.matchedCount <= 0) {
          throw new ApiError(
            'failed to find veneer invoice',
            StatusCodes.NOT_FOUND
          );
        }
        if (
          !update_veneer_invoice.acknowledged ||
          update_veneer_invoice.matchedCount <= 0
        ) {
          throw new ApiError(
            'Failed to update veneer invoive isEditable status',
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
      }
    }

    if (
      issue_for_grouping.issued_from === issues_for_status.smoking_dying
    ) {
      await revert_to_process_done();
    } else if (
      issue_for_grouping.issued_from === issues_for_status.dressing
    ) {
      await revert_to_dressing_done();
    } else if (
      issue_for_grouping.issued_from === issues_for_status.veneer
    ) {
      await revert_to_veneer_inventory();
    } else {
      throw new ApiError('No data found to revert', StatusCodes.BAD_REQUEST);
    }

    const delete_issue_for_grouping = await issues_for_grouping_model.deleteMany(
      {
        unique_identifier: issue_for_grouping?._id?.unique_identifier,
        pallet_number: issue_for_grouping?._id?.pallet_number,
      },
      { session }
    );
    console.log(issue_for_grouping?._id, "ppppppppppppppppppppppppppp")

    if (
      !delete_issue_for_grouping?.acknowledged ||
      delete_issue_for_grouping?.deletedCount <= 0
    ) {
      throw new ApiError(
        'Failed to delete issue for grouping',
        StatusCodes.NOT_FOUND
      );
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Issue for grouping reverted successfully',
      delete_issue_for_grouping
    );
    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const fetch_single_issue_for_grouping_details = catchAsync(async (req, res, next) => {
  const { unique_identifier, pallet_number } = req.params;
  if (!unique_identifier || !pallet_number) {
    throw new ApiError(`Please provide unique_identifier or pallet_number`, StatusCodes.BAD_REQUEST);
  }

  const agg_match = {
    $match: {
      _id: {
        unique_identifier: mongoose.Types.ObjectId.createFromHexString(unique_identifier),
        pallet_number: pallet_number,
      }
    },
  };

  const aggregation_pipeline = [agg_match];
  const issue_for_grouping_details =
    await issues_for_grouping_view_model.aggregate(aggregation_pipeline);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Fetch data successfully',
    issue_for_grouping_details
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetch_all_issue_for_grouping_details = catchAsync(async (req, res, next) => {
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
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...search_query,
    ...filterData,
    is_grouping_done: false,
  };

  const agg_match = {
    $match: {
      ...match_query,
    },
  };
  const agg_sort = {
    $sort: {
      [sortBy]: sort === 'desc' ? -1 : 1,
    },
  };
  const agg_skip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };
  const agg_limit = {
    $limit: parseInt(limit),
  };

  const aggregation_pipeline = [agg_match, agg_sort, agg_skip, agg_limit];

  const result =
    await issues_for_grouping_view_model.aggregate(aggregation_pipeline);

  const agg_count = {
    $count: 'totalCount',
  };

  const total_count_aggregation_pipeline = [agg_match, agg_count];

  const total_docs = await issues_for_grouping_view_model.aggregate(
    total_count_aggregation_pipeline
  );

  const totalPages = Math.ceil((total_docs?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(200, 'Data Fetched Successfully', {
    data: result,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
});