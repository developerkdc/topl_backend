import ApiResponse from "../../../../utils/ApiResponse.js";
import { StatusCodes } from "../../../../utils/constants.js";
import ApiError from "../../../../utils/errors/apiError.js";
import catchAsync from "../../../../utils/errors/catchAsync.js";

export const addIssueForPlywoodProductionFromFace = catchAsync(
    async function (req, res, next) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const userDetails = req.userDetails;
        const { flitch_inventory_item_ids, is_peeling_done } = req.body;
  
        if (
          !flitch_inventory_item_ids ||
          (Array.isArray(flitch_inventory_item_ids) &&
            flitch_inventory_item_ids?.length <= 0)
        ) {
          throw new ApiError(
            'flitch_inventory_item_ids is required',
            StatusCodes.BAD_REQUEST
          );
        }
        if (!Array.isArray(flitch_inventory_item_ids)) {
          throw new ApiError(
            'flitch_inventory_item_ids must be array',
            StatusCodes.BAD_REQUEST
          );
        }
  
        const flitchInventoryItemData = await flitch_inventory_items_model
          .find({
            _id: { $in: flitch_inventory_item_ids },
            issue_status: null,
          })
          .lean();
  
        if (flitchInventoryItemData?.length <= 0) {
          throw new ApiError(
            'Flitch Inventory Item Data Not Found',
            StatusCodes.NOT_FOUND
          );
        }
  
        const flitch_items_invoice_set = new Set();
        const issue_for_slicing_data = flitchInventoryItemData?.map(
          (item, index) => {
            flitch_items_invoice_set?.add(item?.invoice_id);
            return {
              flitch_inventory_item_id: item?._id,
              item_sr_no: item?.item_sr_no,
              item_id: item?.item_id,
              item_name: item?.item_name,
              color: item?.color,
              item_sub_category_id: item?.item_sub_category_id,
              item_sub_category_name: item?.item_sub_category_name,
              log_no: item?.log_no,
              flitch_code: item?.flitch_code,
              log_no_code: is_peeling_done
                ? `${item?.log_no + item?.flitch_code}PD`
                : item?.log_no + item?.flitch_code,
              flitch_formula: item?.flitch_formula,
              length: item?.length,
              width1: item?.width1,
              width2: item?.width2,
              width3: item?.width3,
              height: item?.height,
              cmt: item?.flitch_cmt,
              amount: item?.amount,
              amount_factor: 1,
              expense_amount: item?.expense_amount,
              issued_from: issues_for_status?.flitching,
              invoice_id: item?.invoice_id,
              is_peeling_done: is_peeling_done ? true : false,
              remark: item?.remark,
              created_by: userDetails?._id,
              updated_by: userDetails?._id,
            };
          }
        );
  
        const add_issue_for_slicing = await issued_for_slicing_model.insertMany(
          issue_for_slicing_data,
          { session }
        );
  
        if (add_issue_for_slicing?.length <= 0) {
          throw new ApiError(
            'Failed to data for issue for slicing',
            StatusCodes.BAD_REQUEST
          );
        }
        const flitch_item_ids = add_issue_for_slicing?.map(
          (ele) => ele?.flitch_inventory_item_id
        );
        //updating flitch inventory item status to slicing
        const update_flitch_inventory_item_status =
          await flitch_inventory_items_model.updateMany(
            { _id: { $in: flitch_item_ids } },
            {
              $set: {
                issue_status: is_peeling_done
                  ? issues_for_status?.slicing_peeling
                  : issues_for_status?.slicing,
              },
            },
            { session }
          );
  
        if (update_flitch_inventory_item_status?.matchedCount <= 0) {
          throw new ApiError(
            'Not Found Flitch Iventory Item',
            StatusCodes.NOT_FOUND
          );
        }
  
        if (
          !update_flitch_inventory_item_status.acknowledged ||
          update_flitch_inventory_item_status?.modifiedCount <= 0
        ) {
          throw new ApiError(
            'Unable to Change Status of Flitch Inventory Item',
            StatusCodes.BAD_REQUEST
          );
        }
  
        //updating flitch inventory invoice: if any one of flitch item send for slicing then invoice should not editable
        const update_flitch_inventory_invoice_editable =
          await flitch_inventory_invoice_model.updateMany(
            { _id: { $in: [...flitch_items_invoice_set] } },
            {
              $set: {
                isEditable: false,
              },
            },
            { session }
          );
  
        if (update_flitch_inventory_invoice_editable?.modifiedCount <= 0) {
          throw new ApiError(
            'Not found Flitch inventory invoice',
            StatusCodes.NOT_FOUND
          );
        }
  
        if (
          !update_flitch_inventory_invoice_editable.acknowledged ||
          update_flitch_inventory_invoice_editable?.modifiedCount <= 0
        ) {
          throw new ApiError(
            'Unable to change status of Flitch inventory invoice',
            StatusCodes.BAD_REQUEST
          );
        }
  
        await session.commitTransaction();
  
        const response = new ApiResponse(
          StatusCodes.CREATED,
          `Issue for ${is_peeling_done ? 'Slicing/Peeling' : 'Slicing'} added successfully`,
          add_issue_for_slicing
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

export const addIssueForPlywoodProductionFromCore = catchAsync(
    async function (req, res, next) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const userDetails = req.userDetails;
        const { flitch_inventory_item_ids, is_peeling_done } = req.body;
  
        if (
          !flitch_inventory_item_ids ||
          (Array.isArray(flitch_inventory_item_ids) &&
            flitch_inventory_item_ids?.length <= 0)
        ) {
          throw new ApiError(
            'flitch_inventory_item_ids is required',
            StatusCodes.BAD_REQUEST
          );
        }
        if (!Array.isArray(flitch_inventory_item_ids)) {
          throw new ApiError(
            'flitch_inventory_item_ids must be array',
            StatusCodes.BAD_REQUEST
          );
        }
  
        const flitchInventoryItemData = await flitch_inventory_items_model
          .find({
            _id: { $in: flitch_inventory_item_ids },
            issue_status: null,
          })
          .lean();
  
        if (flitchInventoryItemData?.length <= 0) {
          throw new ApiError(
            'Flitch Inventory Item Data Not Found',
            StatusCodes.NOT_FOUND
          );
        }
  
        const flitch_items_invoice_set = new Set();
        const issue_for_slicing_data = flitchInventoryItemData?.map(
          (item, index) => {
            flitch_items_invoice_set?.add(item?.invoice_id);
            return {
              flitch_inventory_item_id: item?._id,
              item_sr_no: item?.item_sr_no,
              item_id: item?.item_id,
              item_name: item?.item_name,
              color: item?.color,
              item_sub_category_id: item?.item_sub_category_id,
              item_sub_category_name: item?.item_sub_category_name,
              log_no: item?.log_no,
              flitch_code: item?.flitch_code,
              log_no_code: is_peeling_done
                ? `${item?.log_no + item?.flitch_code}PD`
                : item?.log_no + item?.flitch_code,
              flitch_formula: item?.flitch_formula,
              length: item?.length,
              width1: item?.width1,
              width2: item?.width2,
              width3: item?.width3,
              height: item?.height,
              cmt: item?.flitch_cmt,
              amount: item?.amount,
              amount_factor: 1,
              expense_amount: item?.expense_amount,
              issued_from: issues_for_status?.flitching,
              invoice_id: item?.invoice_id,
              is_peeling_done: is_peeling_done ? true : false,
              remark: item?.remark,
              created_by: userDetails?._id,
              updated_by: userDetails?._id,
            };
          }
        );
  
        const add_issue_for_slicing = await issued_for_slicing_model.insertMany(
          issue_for_slicing_data,
          { session }
        );
  
        if (add_issue_for_slicing?.length <= 0) {
          throw new ApiError(
            'Failed to data for issue for slicing',
            StatusCodes.BAD_REQUEST
          );
        }
        const flitch_item_ids = add_issue_for_slicing?.map(
          (ele) => ele?.flitch_inventory_item_id
        );
        //updating flitch inventory item status to slicing
        const update_flitch_inventory_item_status =
          await flitch_inventory_items_model.updateMany(
            { _id: { $in: flitch_item_ids } },
            {
              $set: {
                issue_status: is_peeling_done
                  ? issues_for_status?.slicing_peeling
                  : issues_for_status?.slicing,
              },
            },
            { session }
          );
  
        if (update_flitch_inventory_item_status?.matchedCount <= 0) {
          throw new ApiError(
            'Not Found Flitch Iventory Item',
            StatusCodes.NOT_FOUND
          );
        }
  
        if (
          !update_flitch_inventory_item_status.acknowledged ||
          update_flitch_inventory_item_status?.modifiedCount <= 0
        ) {
          throw new ApiError(
            'Unable to Change Status of Flitch Inventory Item',
            StatusCodes.BAD_REQUEST
          );
        }
  
        //updating flitch inventory invoice: if any one of flitch item send for slicing then invoice should not editable
        const update_flitch_inventory_invoice_editable =
          await flitch_inventory_invoice_model.updateMany(
            { _id: { $in: [...flitch_items_invoice_set] } },
            {
              $set: {
                isEditable: false,
              },
            },
            { session }
          );
  
        if (update_flitch_inventory_invoice_editable?.modifiedCount <= 0) {
          throw new ApiError(
            'Not found Flitch inventory invoice',
            StatusCodes.NOT_FOUND
          );
        }
  
        if (
          !update_flitch_inventory_invoice_editable.acknowledged ||
          update_flitch_inventory_invoice_editable?.modifiedCount <= 0
        ) {
          throw new ApiError(
            'Unable to change status of Flitch inventory invoice',
            StatusCodes.BAD_REQUEST
          );
        }
  
        await session.commitTransaction();
  
        const response = new ApiResponse(
          StatusCodes.CREATED,
          `Issue for ${is_peeling_done ? 'Slicing/Peeling' : 'Slicing'} added successfully`,
          add_issue_for_slicing
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