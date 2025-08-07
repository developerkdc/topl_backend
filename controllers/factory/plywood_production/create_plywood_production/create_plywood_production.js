import mongoose from 'mongoose';
import {
  plywood_production_consumed_items_model,
  plywood_production_model,
} from '../../../../database/schema/factory/plywood_production/plywood_production.schema.js';
import { core_inventory_items_details } from '../../../../database/schema/inventory/core/core.schema.js';
import { face_inventory_items_details } from '../../../../database/schema/inventory/face/face.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import face_history_model from '../../../../database/schema/inventory/face/face.history.schema.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';
import core_history_model from '../../../../database/schema/inventory/core/core.history.schema.js';

export const create_plywood_production = catchAsync(
  async function (req, res, next) {
    const userDetails = req.userDetails;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        plywood_production_details,
        face_details_array,
        core_details_array,
      } = req.body;

      if (!plywood_production_details) {
        throw new ApiError(
          'Plywood production details not found.',
          StatusCodes.BAD_REQUEST
        );
      }

      if (!face_details_array) {
        throw new ApiError('Face details not found.', StatusCodes.BAD_REQUEST);
      }

      if (!core_details_array) {
        throw new ApiError('Core details not found.', StatusCodes.BAD_REQUEST);
      }

      if (core_details_array?.length === 0) {
        throw new ApiError(
          'Atleast One Core required.',
          StatusCodes.BAD_REQUEST
        );
      }

      if (face_details_array?.length === 0) {
        throw new ApiError(
          'Atleast One Face required.',
          StatusCodes.BAD_REQUEST
        );
      }
      const maxNumber = await plywood_production_model.aggregate([
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

      const insert_plywood_production_details =
        await plywood_production_model.create(
          [
            {
              sr_no: newMax,
              ...plywood_production_details,
              created_by: userDetails?._id,
              updated_by: userDetails?._id,
            },
          ],
          { session }
        );

      if (
        !insert_plywood_production_details ||
        insert_plywood_production_details.length === 0
      ) {
        throw new ApiError(
          'Failed to insert data into plywood production',
          StatusCodes.BAD_REQUEST
        );
      }

      const is_face_available_greater_than_consumed = await Promise.all(
        face_details_array.map(async (item) => {
          const res = await face_inventory_items_details
            .findOne({
              _id: item?._id,
              available_sheets: { $gte: item?.issued_sheets },
              available_sqm: { $gte: item?.issued_sqm },
              available_amount: { $gte: item?.issued_amount },
            })
            .session(session)
            .lean();
          return res || null; // Explicitly return `null` if no matching record is found
        })
      );

      const missingItems = face_details_array.filter(
        (_, index) => is_face_available_greater_than_consumed[index] === null
      );

      const is_core_available_greater_than_consumed = await Promise.all(
        core_details_array.map(async (item) => {
          const res = await core_inventory_items_details
            .findOne({
              _id: item?._id,
              available_sheets: { $gte: item?.issued_sheets },
              available_sqm: { $gte: item?.issued_sqm },
              available_amount: { $gte: item?.issued_amount },
            })
            .session(session)
            .lean();
          return res || null;
        })
      );

      const missingCoreItems = core_details_array.filter(
        (_, index) => is_core_available_greater_than_consumed[index] === null
      );

      if (missingItems.length > 0 && missingCoreItems.length > 0) {
        const newMSGDetails = missingItems.map((item) => {
          return `Inward No : ${item.inward_sr_no} and Sr No :${item.face_sr_no}`;
        });

        const newCoreMSGDetails = missingCoreItems.map((item) => {
          return `Inward No: ${item.inward_sr_no} and Sr No: ${item.core_sr_no}`;
        });

        throw new ApiError(
          `Available face sheets are issued by someone for ${newMSGDetails.join()} and Available core sheets are issued by someone for ${newCoreMSGDetails.join()}`
        );
      }

      if (missingItems.length > 0) {
        const newMSGDetails = missingItems.map((item) => {
          return `Inward No : ${item.inward_sr_no} and Sr No :${item.face_sr_no}`;
        });

        throw new ApiError(
          `Available face sheets are issued by someone for ${newMSGDetails.join()}`
        );
      }

      if (missingCoreItems.length > 0) {
        const newCoreMSGDetails = missingCoreItems.map((item) => {
          return `Inward No: ${item.inward_sr_no} and Sr No: ${item.core_sr_no}`;
        });

        throw new ApiError(
          `Available core sheets are issued by someone for ${newCoreMSGDetails.join()}`
        );
      }

      const new_face_details = face_details_array?.map((item) => {
        item.face_inventory_item_id = item?._id;
        item.number_of_sheets = item?.issued_sheets;
        item.total_sq_meter = item?.issued_sqm;
        item.amount = item?.issued_amount;
        item.plywood_production_id = insert_plywood_production_details[0]?._id;
        delete item._id;
        return item;
      });

      const new_core_details = core_details_array?.map((item) => {
        item.core_inventory_item_id = item?._id;
        item.number_of_sheets = item?.issued_sheets;
        item.total_sq_meter = item?.issued_sqm;
        item.amount = item?.issued_amount;
        item.plywood_production_id = insert_plywood_production_details[0]?._id;
        delete item._id;
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
            { _id: item?.face_inventory_item_id },
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
        (item.face_item_id = item?.face_inventory_item_id),
          (item.issued_for_plywood_production_id =
            insert_plywood_production_details[0]?._id),
          (item.issue_status = issues_for_status?.plywood_production),
          (item.issued_sheets = item.issued_sheets),
          (item.issued_sqm = item?.issued_sqm),
          (item.issued_amount = item?.issued_amount),
          (item.created_by = userDetails?._id),
          (item.updated_by = userDetails?._id);
        delete item?._id;
        return item;
      });

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
            { _id: item?.core_inventory_item_id },
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
        (item.core_item_id = item?.core_inventory_item_id),
          (item.issued_for_plywood_production_id =
            insert_plywood_production_details[0]?._id),
          (item.issue_status = issues_for_status?.plywood_production),
          (item.issued_sheets = item.issued_sheets),
          (item.issued_sqm = item?.issued_sqm),
          (item.issued_amount = item?.issued_amount),
          (item.created_by = userDetails?._id),
          (item.updated_by = userDetails?._id);
        delete item?._id;
        return item;
      });

      const is_core_history_updated = await core_history_model.insertMany(
        core_details_array_for_history,
        { session }
      );

      if (!is_core_history_updated || is_core_history_updated.length === 0) {
        throw new ApiError('Failed to update core history');
      }
      await session.commitTransaction();

      const response = new ApiResponse(
        StatusCodes.CREATED,
        `plywood production created successfully`,
        {
          plywood_production_details: insert_plywood_production_details,
          plywood_production_consumed_items:
            insert_plywood_production_consumed_items,
        }
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
