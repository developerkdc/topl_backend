import {
  log_inventory_invoice_model,
  log_inventory_items_model,
  log_inventory_items_view_model,
} from '../../../database/schema/inventory/log/log.schema.js';
import ApiError from '../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../utils/constants.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';
import mongoose from 'mongoose';
import issue_for_peeling_model from '../../../database/schema/factory/peeling/issues_for_peeling.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';

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
        return next(new ApiError('Log inventory item must be a array field'));
      }

      const logInventoryItemData = await log_inventory_items_view_model
        .find({
          _id: { $in: log_inventory_item_ids },
          issue_status: issues_for_status.log,
        })
        .lean();

      if (logInventoryItemData?.length <= 0) {
        return next(
          new ApiError(
            'Log Inventory Item Data Not Found',
            StatusCodes.NOT_FOUND
          )
        );
      }

      const issue_for_peeling_data = logInventoryItemData?.map(
        (logInventoryItem) => {
          return {
            log_inventory_item_id: logInventoryItem?._id,
            crosscut_done_id: null,
            inward_sr_no: logInventoryItem?.log_invoice_details?.inward_sr_no,
            inward_date: logInventoryItem?.log_invoice_details?.inward_date,
            invoice_date:
              logInventoryItem?.log_invoice_details?.invoice_Details
                ?.invoice_date,
            invoice_no:
              logInventoryItem?.log_invoice_details?.invoice_Details
                ?.invoice_no,
            item_sr_no: logInventoryItem?.item_sr_no,
            item_id: logInventoryItem?.item_id,
            item_name: logInventoryItem?.item_name,
            color: logInventoryItem?.color,
            item_sub_category_id: logInventoryItem?.item_sub_category_id,
            item_sub_category_name: logInventoryItem?.item_sub_category_name,
            log_no: logInventoryItem?.log_no,
            code: logInventoryItem?.log_no,
            log_no_code: logInventoryItem?.log_no,
            log_formula: logInventoryItem?.log_formula,
            length: logInventoryItem?.physical_length,
            diameter: logInventoryItem?.physical_diameter,
            cmt: logInventoryItem?.physical_cmt,
            amount: logInventoryItem?.amount,
            amount_factor: 1,
            expense_amount: logInventoryItem?.expense_amount,
            issued_from: issues_for_status?.log,
            invoice_id: logInventoryItem?.invoice_id,
            remark: logInventoryItem?.remark,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          };
        }
      );

      const add_issue_for_peeling = await issue_for_peeling_model.insertMany(
        issue_for_peeling_data,
        { session }
      );

      if (add_issue_for_peeling?.length <= 0) {
        return next(new ApiError('Failed to data for issue for peeling', 400));
      }
      const log_item_ids = add_issue_for_peeling?.map(
        (ele) => ele?.log_inventory_item_id
      );
      const log_invoice_ids = [
        ...new Set(add_issue_for_peeling.map((issue) => issue.invoice_id)),
      ];

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
        return next(new ApiError('Not found log inventory item'));
      }

      if (
        !update_log_inventory_item_status.acknowledged ||
        update_log_inventory_item_status?.modifiedCount <= 0
      ) {
        return next(
          new ApiError('Unable to change status of log inventory item')
        );
      }

      //updating log inventory invoice: if any one of log item send for peeling then invoice should not editable
      const update_log_inventory_invoice_editable =
        await log_inventory_invoice_model.updateMany(
          { _id: { $in: log_invoice_ids } },
          {
            $set: {
              isEditable: false,
            },
          },
          { session }
        );

      if (update_log_inventory_invoice_editable?.modifiedCount <= 0) {
        return next(new ApiError('Not found log inventory invoice'));
      }

      if (
        !update_log_inventory_invoice_editable.acknowledged ||
        update_log_inventory_invoice_editable?.modifiedCount <= 0
      ) {
        return next(
          new ApiError('Unable to change status of log inventory invoice')
        );
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
