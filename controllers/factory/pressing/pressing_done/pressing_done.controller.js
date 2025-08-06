import mongoose, { isValidObjectId } from 'mongoose';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import { StatusCodes } from '../../../../utils/constants.js';
import {
  pressing_done_consumed_items_details_model,
  pressing_done_details_model,
} from '../../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { issues_for_pressing_model } from '../../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import {
  base_type_constants,
  consumed_from_constants,
  issues_for_status,
} from '../../../../database/Utils/constants/constants.js';
import {
  plywood_inventory_invoice_details,
  plywood_inventory_items_details,
} from '../../../../database/schema/inventory/Plywood/plywood.schema.js';
import plywood_history_model from '../../../../database/schema/inventory/Plywood/plywood.history.schema.js';
import { plywood_resizing_done_details_model } from '../../../../database/schema/factory/plywood_resizing_factory/resizing_done/resizing.done.schema.js';
import plywood_resizing_history_model from '../../../../database/schema/factory/plywood_resizing_factory/resizing_history/resizing_history.schema.js';
import { plywood_production_model } from '../../../../database/schema/factory/plywood_production/plywood_production.schema.js';
import {
  mdf_inventory_invoice_details,
  mdf_inventory_items_details,
} from '../../../../database/schema/inventory/mdf/mdf.schema.js';
import mdf_history_model from '../../../../database/schema/inventory/mdf/mdf.history.schema.js';
import {
  fleece_inventory_invoice_modal,
  fleece_inventory_items_modal,
} from '../../../../database/schema/inventory/fleece/fleece.schema.js';
import fleece_history_model from '../../../../database/schema/inventory/fleece/fleece.history.schema.js';
import {
  face_inventory_invoice_details,
  face_inventory_items_details,
} from '../../../../database/schema/inventory/face/face.schema.js';
import face_history_model from '../../../../database/schema/inventory/face/face.history.schema.js';
import plywood_production_history_model from '../../../../database/schema/factory/plywood_production/plywood_production_history.schema.js';
import { pressing_damage_model } from '../../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
import { pressing_done_history_model } from '../../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';

// Add pressing Api
export const add_pressing_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { pressing_details, consume_items_details } = req.body;

    for (let i of ['pressing_details', 'consume_items_details']) {
      if (!req.body?.[i]) {
        throw new ApiError(
          `Please provide ${i} details`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    //validating the group details, base details.
    const { group_details, base_details, face_details } = consume_items_details;

    for (let i of ['group_details', 'base_details']) {
      if (!consume_items_details?.[i]) {
        throw new ApiError(
          `Please provide ${i} details`,
          StatusCodes.BAD_REQUEST
        );
      }

      if (!Array.isArray(consume_items_details?.[i])) {
        throw new ApiError(`${i} must be array`, StatusCodes.BAD_REQUEST);
      }

      if (consume_items_details?.[i]?.length < 0) {
        throw new ApiError(
          `Atleast one items is required in ${i}.`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    //checking weather base details only contain one type of base_type
    const baseTypeValues = new Set(base_details.map((item) => item.base_type));
    if (baseTypeValues.size > 1) {
      throw new ApiError(
        `Base details must contain only one type of base_type.`,
        StatusCodes.BAD_REQUEST
      );
    }

    // validation the face details if pressing instruction is FACE WITH LAYER
    if (
      pressing_details?.pressing_instructions &&
      pressing_details?.pressing_instructions === 'FACE WITH LAYER'
    ) {
      if (!face_details) {
        throw new ApiError(
          `Please provide face details`,
          StatusCodes.BAD_REQUEST
        );
      }
      if (!Array.isArray(face_details)) {
        throw new ApiError(
          `face_details must be array`,
          StatusCodes.BAD_REQUEST
        );
      }
      if (face_details?.length < 0) {
        throw new ApiError(
          `Atleast one items is required in face_details.`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    // Adding pressing details in db with session
    const pressing_details_data = {
      ...pressing_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    const add_pressing_details_data = await pressing_done_details_model.create(
      [pressing_details_data],
      { session }
    );

    const added_pressing_details = add_pressing_details_data?.[0];

    console.log('added_pressing_details_data', added_pressing_details);

    if (!added_pressing_details) {
      throw new ApiError(
        'Pressing details not added.',
        StatusCodes.BAD_REQUEST
      );
    }

    // ==========================Handling pressing Done consumed item details=======================
    //initializing the object to be inserted in pressing_done_consumed_item_details collection
    var pressingDoneConsumedItemsDetailsObject = {
      pressing_done_details_id: added_pressing_details?._id,
      group_details: [],
      base_details: [],
      face_details: null,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    // ================ grouping details handling ========================

    for (const group of group_details) {
      const { issue_for_pressing_id, no_of_sheets, sqm, amount, group_no } =
        group;

      // Validate issue_for_pressing_id
      const issueForPressing = await issues_for_pressing_model
        .findById(issue_for_pressing_id)
        .session(session);
      if (!issueForPressing) {
        throw new ApiError(
          `Invalid issue_for_pressing_id: ${issue_for_pressing_id}`,
          StatusCodes.BAD_REQUEST
        );
      }

      // Validate and update no_of_sheets
      if (issueForPressing.available_details?.no_of_sheets < no_of_sheets) {
        throw new ApiError(
          `Not enough sheets available for group ${group_no}. Requested: ${no_of_sheets}, Available: ${issueForPressing.available_details.no_of_sheets}`,
          StatusCodes.BAD_REQUEST
        );
      }

      await issues_for_pressing_model.updateOne(
        { _id: issue_for_pressing_id },
        {
          $inc: {
            'available_details.no_of_sheets': -no_of_sheets,
            'available_details.sqm': -sqm,
            'available_details.amount': -amount,
          },
        },
        { session }
      );

      pressingDoneConsumedItemsDetailsObject.group_details.push({ ...group });
    }

    // ================ Base details handling ========================

    for (const base of base_details) {
      const { base_type, consumed_from, consumed_from_item_id } = base;

      for (let i of ['base_type', 'consumed_from', 'consumed_from_item_id']) {
        if (!base?.[i]) {
          throw new ApiError(
            `Please provide ${i} in base details`,
            StatusCodes.BAD_REQUEST
          );
        }
      }

      // ====================== If base is Plywood =======================

      if (base_type === base_type_constants.plywood) {
        // ======================If consumed_from is INVENTORY, validate consumed_from_item_id ===================
        if (consumed_from === consumed_from_constants.inventory) {
          for (let i of ['pallet_no', 'no_of_sheets', 'sqm', 'amount']) {
            if (!base?.[i]) {
              throw new ApiError(
                `Please provide ${i} in base details`,
                StatusCodes.BAD_REQUEST
              );
            }
          }

          const { pallet_no, no_of_sheets, sqm, amount } = base;

          const inventoryItem = await plywood_inventory_items_details
            .findById(consumed_from_item_id)
            .session(session);

          if (!inventoryItem) {
            throw new ApiError(
              `Invalid Plywood Inventory consumed_from_item_id: ${consumed_from_item_id}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // Validate and update no_of_sheets
          const { available_sheets, available_sqm, available_amount } =
            inventoryItem;

          if (
            available_sheets < no_of_sheets ||
            available_sqm < sqm ||
            available_amount < amount
          ) {
            throw new ApiError(
              `Not enough sheets available for Pallet No ${pallet_no} Inventory. Requested: ${no_of_sheets}, Available: ${inventoryItem.available_sheets}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // update the consumed quantity in inventory
          const plywoodInventoryUpdateData =
            await plywood_inventory_items_details.updateOne(
              { _id: consumed_from_item_id },
              {
                $inc: {
                  available_sheets: -no_of_sheets,
                  available_sqm: -sqm,
                  available_amount: -amount,
                },
              },
              { session }
            );
          if (
            !plywoodInventoryUpdateData.acknowledged ||
            plywoodInventoryUpdateData.modifiedCount === 0
          ) {
            throw new ApiError(
              `Plywood Inventory details not updated.`,
              StatusCodes.BAD_REQUEST
            );
          }

          // updated same in plywood inventory history
          const plywood_history_data = {
            plywood_item_id: consumed_from_item_id,
            pressing_done_id: added_pressing_details?._id,
            issued_sheets: no_of_sheets,
            issued_sqm: sqm,
            issued_amount: amount,
            issue_status: issues_for_status?.pressing,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          };
          const [plywoodHistoryAddedData] = await plywood_history_model.create(
            [plywood_history_data],
            { session }
          );

          if (!plywoodHistoryAddedData) {
            throw new ApiError(
              'Plywood Inventory history details not added.',
              StatusCodes.BAD_REQUEST
            );
          }

          // update the plywood inventory invoice details
          const plyInventoryInvoiceDetails =
            await plywood_inventory_invoice_details.updateOne(
              {
                _id: inventoryItem?.invoice_id,
              },
              {
                $set: {
                  isEditable: false,
                },
              },
              { session }
            );

          if (
            !plyInventoryInvoiceDetails.acknowledged ||
            plyInventoryInvoiceDetails.modifiedCount === 0
          ) {
            throw new ApiError(
              `Plywood Inventory Invoice details not updated.`,
              StatusCodes.BAD_REQUEST
            );
          }

          pressingDoneConsumedItemsDetailsObject.base_details.push({
            ...base,
          });
        }

        // ===================== If consumed_from is RESIZING, validate consumed_from_item_id ===================
        else if (consumed_from === consumed_from_constants?.resizing) {
          for (let i of ['no_of_sheets', 'sqm', 'amount']) {
            if (!base?.[i]) {
              throw new ApiError(
                `Please provide ${i} in base details`,
                StatusCodes.BAD_REQUEST
              );
            }
          }

          const { no_of_sheets, sqm, amount } = base;

          const resizingItem = await plywood_resizing_done_details_model
            .findById(consumed_from_item_id)
            .session(session);

          if (!resizingItem) {
            throw new ApiError(
              `Invalid Plywood Resizing consumed_from_item_id: ${consumed_from_item_id}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // Validate and update no_of_sheets
          const { available_details, sr_no } = resizingItem;

          if (
            available_details?.no_of_sheets < no_of_sheets ||
            available_details?.sqm < sqm ||
            available_details?.amount < amount
          ) {
            throw new ApiError(
              `Not enough sheets available for Sr.No ${sr_no} resizing. Requested: ${no_of_sheets}, Available: ${available_sheets}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // update the consumed quantity in plywood resizing
          const plywoodResizingUpdateData =
            await plywood_resizing_done_details_model.updateOne(
              { _id: consumed_from_item_id },
              {
                $inc: {
                  'available_details.no_of_sheets': -no_of_sheets,
                  'available_details.sqm': -sqm,
                  'available_details.amount': -amount,
                },
                $set: {
                  isEditable: false,
                },
              },
              { session }
            );
          if (
            !plywoodResizingUpdateData.acknowledged ||
            plywoodResizingUpdateData.modifiedCount === 0
          ) {
            throw new ApiError(
              `Plywood Resizing details not updated.`,
              StatusCodes.BAD_REQUEST
            );
          }

          // updated same in plywood resizing history
          const plywood_resizing_history_data = {
            plywood_resizing_done_id: consumed_from_item_id,
            issued_for_id: added_pressing_details?._id, //it is issued for pressing, so we are storing the Pressing Done id
            issue_status: issues_for_status?.pressing,
            issued_sheets: no_of_sheets,
            issued_sqm: sqm,
            issued_amount: amount,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          };
          const [plywoodResizingHistoryAddedData] =
            await plywood_resizing_history_model.create(
              [plywood_resizing_history_data],
              { session }
            );

          if (!plywoodResizingHistoryAddedData) {
            throw new ApiError(
              'Plywood Resizing history details not added.',
              StatusCodes.BAD_REQUEST
            );
          }

          pressingDoneConsumedItemsDetailsObject.base_details.push({
            ...base,
          });
        }

        // ===================== If consumed_from is Plywood Production, validate consumed_from_item_id ===================
        else if (consumed_from === consumed_from_constants?.production) {
          for (let i of ['no_of_sheets', 'sqm', 'amount']) {
            if (!base?.[i]) {
              throw new ApiError(
                `Please provide ${i} in base details`,
                StatusCodes.BAD_REQUEST
              );
            }
          }

          const { no_of_sheets, sqm, amount } = base;

          const plywoodProductionItem = await plywood_production_model
            .findById(consumed_from_item_id)
            .session(session);

          if (!plywoodProductionItem) {
            throw new ApiError(
              `Invalid Plywood Production consumed_from_item_id: ${consumed_from_item_id}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // Validate and update no_of_sheets
          const {
            available_no_of_sheets,
            available_total_sqm,
            available_amount,
            sr_no,
          } = plywoodProductionItem;

          if (
            available_no_of_sheets < no_of_sheets ||
            available_total_sqm < sqm ||
            available_amount < amount
          ) {
            throw new ApiError(
              `Not enough sheets available for Sr.No ${sr_no} Production. Requested: ${no_of_sheets}, Available: ${available_no_of_sheets}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // update the consumed quantity in inventory
          const plywoodProductionUpdateData =
            await plywood_production_model.updateOne(
              { _id: consumed_from_item_id },
              {
                $inc: {
                  available_no_of_sheets: -no_of_sheets,
                  available_total_sqm: -sqm,
                  available_amount: -amount,
                },
              },
              { session }
            );
          if (
            !plywoodProductionUpdateData.acknowledged ||
            plywoodProductionUpdateData.modifiedCount === 0
          ) {
            throw new ApiError(
              `Plywood Production details not updated.`,
              StatusCodes.BAD_REQUEST
            );
          }

          // updated same in plywood production history
          const plywood_production_history_data = {
            plywood_production_done_id: consumed_from_item_id,
            issued_for_id: added_pressing_details?._id,
            issue_status: issues_for_status?.pressing,
            issued_sheets: no_of_sheets,
            issued_sqm: sqm,
            issued_amount: amount,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          };
          const [plywoodProductionHistoryAddedData] =
            await plywood_production_history_model.create(
              [plywood_production_history_data],
              { session }
            );

          if (!plywoodProductionHistoryAddedData) {
            throw new ApiError(
              'Plywood production history details not added.',
              StatusCodes.BAD_REQUEST
            );
          }

          pressingDoneConsumedItemsDetailsObject.base_details.push({
            ...base,
          });
        }
      }

      // ====================== If base is MDF =======================
      else if (base_type === base_type_constants.mdf) {
        for (let i of ['pallet_no', 'no_of_sheets', 'sqm', 'amount']) {
          if (!base?.[i]) {
            throw new ApiError(
              `Please provide ${i} in base details`,
              StatusCodes.BAD_REQUEST
            );
          }
        }

        const { pallet_no, no_of_sheets, sqm, amount } = base;

        if (consumed_from === consumed_from_constants?.inventory) {
          const inventoryItem = await mdf_inventory_items_details
            .findById(consumed_from_item_id)
            .session(session);

          if (!inventoryItem) {
            throw new ApiError(
              `Invalid MDF Inventory consumed_from_item_id: ${consumed_from_item_id}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // Validate and update no_of_sheets
          const { available_sheets, available_sqm, available_amount } =
            inventoryItem;
          if (
            available_sheets < no_of_sheets ||
            available_sqm < sqm ||
            available_amount < amount
          ) {
            throw new ApiError(
              `Not enough sheets available for Pallet No ${pallet_no} Inventory. Requested: ${no_of_sheets}, Available: ${available_sheets}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // update the consumed quantity in inventory
          const mdfInventoryUpdateData =
            await mdf_inventory_items_details.updateOne(
              { _id: consumed_from_item_id },
              {
                $inc: {
                  available_sheets: -no_of_sheets,
                  available_sqm: -sqm,
                  available_amount: -amount,
                },
              },
              { session }
            );
          if (
            !mdfInventoryUpdateData.acknowledged ||
            mdfInventoryUpdateData.modifiedCount === 0
          ) {
            throw new ApiError(
              `MDF Inventory details not updated.`,
              StatusCodes.BAD_REQUEST
            );
          }

          // updated same in MDF inventory history
          const mdf_history_data = {
            mdf_item_id: consumed_from_item_id,
            pressing_done_id: added_pressing_details?._id,
            issued_sheets: no_of_sheets,
            issued_sqm: sqm,
            issued_amount: amount,
            issue_status: issues_for_status?.pressing,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          };
          const [mdfHistoryAddedData] = await mdf_history_model.create(
            [mdf_history_data],
            { session }
          );
          if (!mdfHistoryAddedData) {
            throw new ApiError(
              'MDF Inventory history details not added.',
              StatusCodes.BAD_REQUEST
            );
          }

          // update the MDF inventory invoice details
          const mdfInventoryInvoiceDetails =
            await mdf_inventory_invoice_details.updateOne(
              {
                _id: inventoryItem?.invoice_id,
              },
              {
                $set: {
                  isEditable: false,
                },
              },
              { session }
            );
          if (
            !mdfInventoryInvoiceDetails.acknowledged ||
            mdfInventoryInvoiceDetails.modifiedCount === 0
          ) {
            throw new ApiError(
              `MDF Inventory Invoice details not updated.`,
              StatusCodes.BAD_REQUEST
            );
          }

          pressingDoneConsumedItemsDetailsObject.base_details.push({
            ...base,
          });
        }
      }

      // ====================== If base is Fleece Paper Production =======================
      else if (base_type === base_type_constants.fleece_paper) {
        for (let i of [
          'inward_sr_no',
          'item_sr_no',
          'number_of_roll',
          'sqm',
          'amount',
        ]) {
          if (!base?.[i]) {
            throw new ApiError(
              `Please provide ${i} in base details`,
              StatusCodes.BAD_REQUEST
            );
          }
        }

        const { inward_sr_no, item_sr_no, number_of_roll, sqm, amount } = base;

        const fleecePaperInventoryItem = await fleece_inventory_items_modal
          .findById(consumed_from_item_id)
          .session(session);

        if (!fleecePaperInventoryItem) {
          throw new ApiError(
            `Invalid Fleece Paper Inventory consumed_from_item_id: ${consumed_from_item_id}`,
            StatusCodes.BAD_REQUEST
          );
        }

        // Validate and update no_of_sheets
        const { available_number_of_roll, available_sqm, available_amount } =
          fleecePaperInventoryItem;

        if (
          available_number_of_roll < number_of_roll ||
          available_sqm < sqm ||
          available_amount < amount
        ) {
          throw new ApiError(
            `Not enough Rolls available for Inward Sr.No ${inward_sr_no} and Item SR.No ${item_sr_no} in Fleece Paper Inventory. Requested: ${number_of_roll}, Available: ${available_number_of_roll}`,
            StatusCodes.BAD_REQUEST
          );
        }

        // update the consumed quantity in inventory
        const fleecePaperInventoryUpdateData =
          await fleece_inventory_items_modal.updateOne(
            { _id: consumed_from_item_id },
            {
              $inc: {
                available_number_of_roll: -number_of_roll,
                available_sqm: -sqm,
                available_amount: -amount,
              },
            },
            { session }
          );
        if (
          !fleecePaperInventoryUpdateData.acknowledged ||
          fleecePaperInventoryUpdateData.modifiedCount === 0
        ) {
          throw new ApiError(
            `Fleece Paper Inventory details not updated.`,
            StatusCodes.BAD_REQUEST
          );
        }

        // updated same in Fleece Paper inventory history
        const fleecePaper_history_data = {
          fleece_item_id: consumed_from_item_id,
          pressing_done_id: added_pressing_details?._id,
          issue_status: issues_for_status?.pressing,
          issued_number_of_roll: number_of_roll,
          issued_sqm: sqm,
          issued_amount: amount,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        };
        const [fleecePaperHistoryAddedData] = await fleece_history_model.create(
          [fleecePaper_history_data],
          { session }
        );

        if (!fleecePaperHistoryAddedData) {
          throw new ApiError(
            'Fleece Paper history details not added.',
            StatusCodes.BAD_REQUEST
          );
        }

        // update the Fleece Paper inventory invoice details
        const fleecePaperInventoryInvoiceDetails =
          await fleece_inventory_invoice_modal.updateOne(
            {
              _id: fleecePaperInventoryItem?.invoice_id,
            },
            {
              $set: {
                isEditable: false,
              },
            },
            { session }
          );

        if (
          !fleecePaperInventoryInvoiceDetails.acknowledged ||
          fleecePaperInventoryInvoiceDetails.modifiedCount === 0
        ) {
          throw new ApiError(
            `Fleece Paper Inventory Invoice details not updated.`,
            StatusCodes.BAD_REQUEST
          );
        }

        pressingDoneConsumedItemsDetailsObject.base_details.push({
          ...base,
        });
      }

      // Handle error if base type is not recognized
      else {
        throw new ApiError(
          `Invalid base_type: ${base_type}. Supported types are: ${Object.values(base_type_constants).join(', ')}`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    // ================ Face details handling ========================
    if (face_details && Array.isArray(face_details)) {
      for (const face of face_details) {
        for (let i of [
          'inward_sr_no',
          'item_sr_no',
          'consumed_from',
          'consumed_from_item_id',
          'no_of_sheets',
          'sqm',
          'amount',
        ]) {
          if (!face?.[i]) {
            throw new ApiError(
              `Please provide ${i} in Face Details.`,
              StatusCodes.BAD_REQUEST
            );
          }
        }

        const {
          no_of_sheets,
          sqm,
          amount,
          inward_sr_no,
          item_sr_no,
          consumed_from,
          consumed_from_item_id,
        } = face;

        if (consumed_from === consumed_from_constants?.inventory) {
          const faceInventoryItem = await face_inventory_items_details
            .findById(consumed_from_item_id)
            .session(session);

          if (!faceInventoryItem) {
            throw new ApiError(
              `Invalid Face Inventory consumed_from_item_id: ${consumed_from_item_id}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // Validate and update no_of_sheets
          const { available_sheets, available_sqm, available_amount } =
            faceInventoryItem;
          if (
            available_sheets < no_of_sheets ||
            available_sqm < sqm ||
            available_amount < amount
          ) {
            throw new ApiError(
              `Not enough sheets available for Inward Sr.No ${inward_sr_no} and Item SR.No ${item_sr_no} Inventory. Requested: ${no_of_sheets}, Available: ${available_sheets}`,
              StatusCodes.BAD_REQUEST
            );
          }

          // update the consumed quantity in inventory
          const faceInventoryUpdateData =
            await face_inventory_items_details.updateOne(
              { _id: consumed_from_item_id },
              {
                $inc: {
                  available_sheets: -no_of_sheets,
                  available_sqm: -sqm,
                  available_amount: -amount,
                },
              },
              { session }
            );
          if (
            !faceInventoryUpdateData.acknowledged ||
            faceInventoryUpdateData.modifiedCount === 0
          ) {
            throw new ApiError(
              `Face Inventory details not updated.`,
              StatusCodes.BAD_REQUEST
            );
          }

          // updated same in Face inventory history
          const face_history_data = {
            face_item_id: consumed_from_item_id,
            pressing_done_id: added_pressing_details?._id,
            issued_sheets: no_of_sheets,
            issued_sqm: sqm,
            issued_amount: amount,
            issue_status: issues_for_status?.pressing,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          };
          const [faceHistoryAddedData] = await face_history_model.create(
            [face_history_data],
            { session }
          );
          if (!faceHistoryAddedData) {
            throw new ApiError(
              'Face Inventory history details not added.',
              StatusCodes.BAD_REQUEST
            );
          }

          // update the Face inventory invoice details
          const faceInventoryInvoiceDetails =
            await face_inventory_invoice_details.updateOne(
              {
                _id: faceInventoryItem?.invoice_id,
              },
              {
                $set: {
                  isEditable: false,
                },
              },
              { session }
            );
          if (
            !faceInventoryInvoiceDetails.acknowledged ||
            faceInventoryInvoiceDetails.modifiedCount === 0
          ) {
            throw new ApiError(
              `Face Inventory Invoice details not updated.`,
              StatusCodes.BAD_REQUEST
            );
          }

          if (pressingDoneConsumedItemsDetailsObject.face_details === null) {
            pressingDoneConsumedItemsDetailsObject.face_details = [
              {
                ...face,
              },
            ];
          } else if (
            Array.isArray(
              pressingDoneConsumedItemsDetailsObject.face_details
            ) &&
            pressingDoneConsumedItemsDetailsObject.face_details.length > 0
          ) {
            pressingDoneConsumedItemsDetailsObject.face_details.push({
              ...face,
            });
          }
        }
      }
    }

    // ==========================Handling pressing_done_consumed_items_details_model=======================
    const pressingDoneConsumedItemsDetails =
      await pressing_done_consumed_items_details_model.create(
        [pressingDoneConsumedItemsDetailsObject],
        { session }
      );
    if (!pressingDoneConsumedItemsDetails) {
      throw new ApiError(
        'Pressing Done consumed items details not added.',
        StatusCodes.BAD_REQUEST
      );
    }

    await session.commitTransaction();

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Pressing created successfully.'
    );

    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const fetch_all_pressing_done_items = catchAsync(
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

    const aggCommonMatch = {
      $match: {
        'available_details.no_of_sheets': { $gt: 0 },
      },
    };
    const aggGroupNoLookup = {
      $lookup: {
        from: 'grouping_done_items_details',
        localField: 'group_no',
        foreignField: 'group_no',
        pipeline: [
          {
            $project: {
              group_no: 1,
              photo_no: 1,
              photo_id: 1,
            },
          },
        ],
        as: 'grouping_done_items_details',
      },
    };
    const aggGroupNoUnwind = {
      $unwind: {
        path: '$grouping_done_items_details',
        preserveNullAndEmptyArrays: true,
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
    const aggOrderRelatedData = [
      {
        $lookup: {
          from: 'orders',
          localField: 'order_id',
          pipeline: [
            {
              $project: {
                order_no: 1,
                owner_name: 1,
                orderDate: 1,
                order_category: 1,
                series_product: 1,
              },
            },
          ],
          foreignField: '_id',
          as: 'order_details',
        },
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'series_product_order_item_details',
          localField: 'order_item_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                item_no: 1,
                order_id: 1,
                item_name: 1,
                item_sub_category_name: 1,
                group_no: 1,
                photo_number: 1,
              },
            },
          ],
          as: 'series_product_order_item_details',
        },
      },
      {
        $unwind: {
          path: '$series_product_order_item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'decorative_order_item_details',
          localField: 'order_item_id',
          pipeline: [
            {
              $project: {
                item_no: 1,
                order_id: 1,
                item_name: 1,
                item_sub_category_name: 1,
                group_no: 1,
                photo_number: 1,
              },
            },
          ],
          foreignField: '_id',
          as: 'decorative_order_item_details',
        },
      },
      {
        $unwind: {
          path: '$decorative_order_item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          order_item_details: {
            $cond: {
              if: {
                $ne: [{ $type: '$decorative_order_item_details' }, 'missing'],
              },
              then: '$decorative_order_item_details',
              else: '$series_product_order_item_details',
            },
          },
        },
      },
    ];
    const aggMatch = {
      $match: {
        ...match_query,
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
      aggCommonMatch,
      aggGroupNoLookup,
      aggGroupNoUnwind,
      ...aggOrderRelatedData,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggSort,
      aggSkip,
      aggLimit,
    ];

    const result = await pressing_done_details_model.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      aggCommonMatch,
      aggGroupNoLookup,
      aggGroupNoUnwind,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggCount,
    ];

    const total_docs =
      await pressing_done_details_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Data Fetched Successfully',
      {
        data: result,
        totalPages: totalPages,
      }
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_pressing_done_consumed_item_details = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;

    if (!id && !mongoose.isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
    }

    const result = await pressing_done_consumed_items_details_model.aggregate([
      {
        $match: {
          pressing_done_details_id:
            mongoose.Types.ObjectId.createFromHexString(id),
        },
      },
      {
        $lookup: {
          from: 'pressing_done_details',
          localField: 'pressing_done_details_id',
          foreignField: '_id',
          as: 'pressing_done_details',
        },
      },
      {
        $unwind: {
          path: '$pressing_done_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$group_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'grouping_done_items_details', // 🔁 Collection with photo_no
          localField: 'group_details.group_no',
          foreignField: 'group_no',
          as: 'group_details_lookup',
        },
      },
      {
        $unwind: {
          path: '$group_details_lookup',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          'group_details.photo_no': '$group_details_lookup.photo_no',
        },
      },
      {
        $group: {
          _id: '$_id',
          pressing_done_details_id: { $first: '$pressing_done_details_id' },
          base_details: { $first: '$base_details' },
          face_details: { $first: '$face_details' },
          created_by: { $first: '$created_by' },
          updated_by: { $first: '$updated_by' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          __v: { $first: '$__v' },
          pressing_done_details: { $first: '$pressing_done_details' },
          group_details: { $push: '$group_details' },
        },
      },
    ]);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Details Fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const revert_pressing_done_details = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      const { id } = req.params;
      if (!id && !mongoose.isValidObjectId(id)) {
        throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
      }

      const fetch_pressing_done__details = await pressing_done_details_model
        .findOne({ _id: id })
        .lean();
      if (!fetch_pressing_done__details) {
        throw new ApiError(
          'Pressing Done Details Not Found.',
          StatusCodes.NOT_FOUND
        );
      }
      if (!fetch_pressing_done__details?.isEditable) {
        throw new ApiError(
          "Pressing Done can't be revert.",
          StatusCodes.BAD_REQUEST
        );
      }
      console.log(fetch_pressing_done__details, 'fetch_pressing_done__details');

      //finding the pressing done consumed items details
      const pressing_done_consumed_items_details =
        await pressing_done_consumed_items_details_model
          .findOne({ pressing_done_details_id: id })
          .session(session);
      if (!pressing_done_consumed_items_details) {
        throw new ApiError(
          'Pressing Done Consumed Items Details Not Found.',
          StatusCodes.NOT_FOUND
        );
      }
      console.log(
        pressing_done_consumed_items_details,
        'pressing_done_consumed_items_details'
      );

      // ==================== Revert the pressing done consumed item details ====================

      const { group_details, base_details, face_details } =
        pressing_done_consumed_items_details;

      // revert group details to issue_for_pressing from pressing_done_consumed_items_details
      if (group_details && Array.isArray(group_details)) {
        for (const group of group_details) {
          const { issue_for_pressing_id, group_no, no_of_sheets, sqm, amount } =
            group;

          const isIssueForPressingUpdated =
            await issues_for_pressing_model.updateOne(
              { _id: issue_for_pressing_id },
              {
                $inc: {
                  'available_details.no_of_sheets': no_of_sheets,
                  'available_details.sqm': sqm,
                  'available_details.amount': amount,
                },
              },
              { session }
            );

          if (
            !isIssueForPressingUpdated.acknowledged ||
            isIssueForPressingUpdated.modifiedCount === 0
          ) {
            throw new ApiError(
              `Issue For Pressing details not reverted for group No. ${group_no} .`,
              StatusCodes.BAD_REQUEST
            );
          }
        }
      }

      // revert base details to consumed_from_item_id from pressing_done_consumed_items_details

      if (base_details && Array.isArray(base_details)) {
        for (const base of base_details) {
          const { consumed_from, consumed_from_item_id, base_type } = base;

          // ===================== reverting plywood consumed details ===================

          if (base_type === base_type_constants.plywood) {
            // ===================== If consumed_from is Plywood Inventory ===================
            if (consumed_from === consumed_from_constants?.inventory) {
              const plywoodInventoryItem = await plywood_inventory_items_details
                .findById(consumed_from_item_id)
                .session(session);

              if (!plywoodInventoryItem) {
                throw new ApiError(
                  `Invalid Plywood Inventory consumed_from_item_id: ${consumed_from_item_id}`,
                  StatusCodes.BAD_REQUEST
                );
              }

              // revert the consumed details to plywood inventory
              const { pallet_no, no_of_sheets, sqm, amount } = base;
              const plywoodInventoryUpdateData =
                await plywood_inventory_items_details.updateOne(
                  { _id: consumed_from_item_id, pallet_number: pallet_no },
                  {
                    $inc: {
                      available_sheets: no_of_sheets,
                      available_sqm: sqm,
                      available_amount: amount,
                    },
                  },
                  { session }
                );

              if (
                !plywoodInventoryUpdateData.acknowledged ||
                plywoodInventoryUpdateData.modifiedCount === 0
              ) {
                throw new ApiError(
                  `Plywood Inventory details not reverted for Pallet No ${pallet_no}.`,
                  StatusCodes.BAD_REQUEST
                );
              }

              // if available_sheets are equal to sheets, then update the invoice details
              if (
                plywoodInventoryItem?.available_sheets ===
                plywoodInventoryItem?.available_sheets + no_of_sheets
              ) {
                const plywoodInventoryInvoiceDetails =
                  await plywood_inventory_invoice_details.updateOne(
                    {
                      _id: plywoodInventoryItem?.invoice_id,
                    },
                    {
                      $set: {
                        isEditable: true,
                      },
                    },
                    { session }
                  );
                if (
                  !plywoodInventoryInvoiceDetails.acknowledged ||
                  plywoodInventoryInvoiceDetails.modifiedCount === 0
                ) {
                  throw new ApiError(
                    `Plywood Inventory Invoice details not updated.`,
                    StatusCodes.BAD_REQUEST
                  );
                }
              }

              // delete the plywood inventory history details
              const plywoodInventoryHistoryDeleteData =
                await plywood_history_model.deleteOne(
                  {
                    $and: [
                      { plywood_item_id: consumed_from_item_id },
                      { pressing_done_id: id },
                    ],
                  },
                  { session }
                );
              if (
                !plywoodInventoryHistoryDeleteData.acknowledged ||
                plywoodInventoryHistoryDeleteData.deletedCount === 0
              ) {
                throw new ApiError(
                  `Plywood Inventory history details not deleted for Pallet No ${pallet_no}.`,
                  StatusCodes.BAD_REQUEST
                );
              }
            }

            // ===================== If consumed_from is Plywood Resizing ===================
            else if (consumed_from === consumed_from_constants?.resizing) {
              const plywoodResizingItem =
                await plywood_resizing_done_details_model
                  .findById(consumed_from_item_id)
                  .session(session);

              if (!plywoodResizingItem) {
                throw new ApiError(
                  `Invalid Plywood Resizing consumed_from_item_id: ${consumed_from_item_id}`,
                  StatusCodes.BAD_REQUEST
                );
              }

              // revert the consumed details to plywood resizing
              const { no_of_sheets, sqm, amount } = base;

              const plywoodResizingUpdateData =
                await plywood_resizing_done_details_model.updateOne(
                  { _id: consumed_from_item_id },
                  {
                    $inc: {
                      'available_details.no_of_sheets': no_of_sheets,
                      'available_details.sqm': sqm,
                      'available_details.amount': amount,
                    },
                  },
                  { session }
                );

              if (
                !plywoodResizingUpdateData.acknowledged ||
                plywoodResizingUpdateData.modifiedCount === 0
              ) {
                throw new ApiError(
                  `Plywood Resizing details not reverted.`,
                  StatusCodes.BAD_REQUEST
                );
              }

              // if available_sheets are equal to sheets, then update the invoice details
              if (
                plywoodResizingItem?.available_details?.no_of_sheets ===
                plywoodResizingItem?.available_details?.no_of_sheets +
                  no_of_sheets
              ) {
                const plywoodResizingInvoiceDetails =
                  await plywood_resizing_done_details_model.updateOne(
                    {
                      _id: plywoodResizingItem?._id,
                    },
                    {
                      $set: {
                        isEditable: true,
                      },
                    },
                    { session }
                  );
                if (
                  !plywoodResizingInvoiceDetails.acknowledged ||
                  plywoodResizingInvoiceDetails.modifiedCount === 0
                ) {
                  throw new ApiError(
                    `Plywood Resizing Invoice details not updated.`,
                    StatusCodes.BAD_REQUEST
                  );
                }
              }

              // delete the plywood resizing history details
              const plywoodResizingHistoryDeleteData =
                await plywood_resizing_history_model.deleteOne(
                  {
                    $and: [
                      { plywood_resizing_done_id: plywoodResizingItem?._id },
                      { issued_for_id: id },
                    ],
                  },
                  { session }
                );
              if (
                !plywoodResizingHistoryDeleteData.acknowledged ||
                plywoodResizingHistoryDeleteData.deletedCount === 0
              ) {
                throw new ApiError(
                  `Plywood Resizing history details not deleted.`,
                  StatusCodes.BAD_REQUEST
                );
              }
            }

            // ===================== If consumed_from is Plywood Production ===================
            else if (consumed_from === consumed_from_constants?.production) {
              const plywoodProductionItem = await plywood_production_model
                .findById(consumed_from_item_id)
                .session(session);

              if (!plywoodProductionItem) {
                throw new ApiError(
                  `Invalid Plywood Production consumed_from_item_id: ${consumed_from_item_id}`,
                  StatusCodes.BAD_REQUEST
                );
              }

              // revert the consumed details to plywood production
              const { no_of_sheets, sqm, amount } = base;

              const plywoodProductionUpdateData =
                await plywood_production_model.updateOne(
                  { _id: consumed_from_item_id },
                  {
                    $inc: {
                      available_no_of_sheets: no_of_sheets,
                      available_total_sqm: sqm,
                      available_amount: amount,
                    },
                  },
                  { session }
                );

              if (
                !plywoodProductionUpdateData.acknowledged ||
                plywoodProductionUpdateData.modifiedCount === 0
              ) {
                throw new ApiError(
                  `Plywood Production details not reverted.`,
                  StatusCodes.BAD_REQUEST
                );
              }

              // if available_sheets are equal to sheets, then update the invoice details
              if (
                plywoodProductionItem?.available_no_of_sheets ===
                plywoodProductionItem?.available_no_of_sheets + no_of_sheets
              ) {
                const plywoodProductionInvoiceDetails =
                  await plywood_production_model.updateOne(
                    {
                      _id: plywoodProductionItem?._id,
                    },
                    {
                      $set: {
                        isEditable: true,
                      },
                    },
                    { session }
                  );
                if (
                  !plywoodProductionInvoiceDetails.acknowledged ||
                  plywoodProductionInvoiceDetails.modifiedCount === 0
                ) {
                  throw new ApiError(
                    `Plywood Production Invoice details not updated.`,
                    StatusCodes.BAD_REQUEST
                  );
                }
              }

              // delete the plywood production history details
              const plywoodProductionHistoryDeleteData =
                await plywood_production_history_model.deleteOne(
                  {
                    $and: [
                      {
                        plywood_production_done_id: plywoodProductionItem?._id,
                        issued_for_id: id,
                      },
                    ],
                  },
                  { session }
                );
              if (
                !plywoodProductionHistoryDeleteData.acknowledged ||
                plywoodProductionHistoryDeleteData.deletedCount === 0
              ) {
                throw new ApiError(
                  `Plywood Production history details not deleted.`,
                  StatusCodes.BAD_REQUEST
                );
              }
            }
          }

          // ===================== If consumed_from is MDF Inventory ===================
          else if (base_type === base_type_constants.mdf) {
            const mdfInventoryItem = await mdf_inventory_items_details
              .findById(consumed_from_item_id)
              .session(session);

            if (!mdfInventoryItem) {
              throw new ApiError(
                `Invalid MDF Inventory consumed_from_item_id: ${consumed_from_item_id}`,
                StatusCodes.BAD_REQUEST
              );
            }

            // revert the consumed details to MDF inventory
            const { no_of_sheets, sqm, amount } = base;

            const mdfInventoryUpdateData =
              await mdf_inventory_items_details.updateOne(
                { _id: consumed_from_item_id },
                {
                  $inc: {
                    available_sheets: no_of_sheets,
                    available_sqm: sqm,
                    available_amount: amount,
                  },
                },
                { session }
              );
            if (
              !mdfInventoryUpdateData.acknowledged ||
              mdfInventoryUpdateData.modifiedCount === 0
            ) {
              throw new ApiError(
                `MDF Inventory details not reverted.`,
                StatusCodes.BAD_REQUEST
              );
            }

            // if available_sheets are equal to sheets, then update the invoice details
            if (
              mdfInventoryItem?.available_sheets ===
              mdfInventoryItem?.available_sheets + no_of_sheets
            ) {
              const mdfInventoryInvoiceDetails =
                await mdf_inventory_invoice_details.updateOne(
                  {
                    _id: mdfInventoryItem?.invoice_id,
                  },
                  {
                    $set: {
                      isEditable: true,
                    },
                  },
                  { session }
                );
              if (
                !mdfInventoryInvoiceDetails.acknowledged ||
                mdfInventoryInvoiceDetails.modifiedCount === 0
              ) {
                throw new ApiError(
                  `MDF Inventory Invoice details not updated.`,
                  StatusCodes.BAD_REQUEST
                );
              }
            }

            // delete the MDF inventory history details
            const delete_mdf_history_details =
              await mdf_history_model.deleteOne(
                {
                  $and: [
                    { mdf_item_id: consumed_from_item_id },
                    { pressing_done_id: id },
                  ],
                },
                { session }
              );
            if (
              !delete_mdf_history_details.acknowledged ||
              delete_mdf_history_details.deletedCount === 0
            ) {
              throw new ApiError(
                `MDF Inventory history details not deleted.`,
                StatusCodes.BAD_REQUEST
              );
            }
          }

          // ===================== If consumed_from Fleece Paper ===================
          else if (base_type === base_type_constants.fleece_paper) {
            const fleecePaperInventoryItem = await fleece_inventory_items_modal
              .findById(consumed_from_item_id)
              .session(session);

            if (!fleecePaperInventoryItem) {
              throw new ApiError(
                `Invalid Fleece Paper Inventory consumed_from_item_id: ${consumed_from_item_id}`,
                StatusCodes.BAD_REQUEST
              );
            }

            // revert the consumed details to Fleece paper inventory
            const { number_of_roll, sqm, amount } = base;

            const fleecePaperInventoryUpdateData =
              await fleece_inventory_items_modal.updateOne(
                { _id: consumed_from_item_id },
                {
                  $inc: {
                    available_number_of_roll: number_of_roll,
                    available_sqm: sqm,
                    available_amount: amount,
                  },
                },
                { session }
              );
            if (
              !fleecePaperInventoryUpdateData.acknowledged ||
              fleecePaperInventoryUpdateData.modifiedCount === 0
            ) {
              throw new ApiError(
                `Fleece Paper Inventory details not reverted.`,
                StatusCodes.BAD_REQUEST
              );
            }

            // if available_number_of_roll are equal to number_of_roll, then update the invoice details
            if (
              fleecePaperInventoryItem?.available_number_of_roll ===
              fleecePaperInventoryItem?.available_number_of_roll +
                number_of_roll
            ) {
              const fleecePaperInventoryInvoiceDetails =
                await fleece_inventory_invoice_modal.updateOne(
                  {
                    _id: fleecePaperInventoryItem?.invoice_id,
                  },
                  {
                    $set: {
                      isEditable: true,
                    },
                  },
                  { session }
                );
              if (
                !fleecePaperInventoryInvoiceDetails.acknowledged ||
                fleecePaperInventoryInvoiceDetails.modifiedCount === 0
              ) {
                throw new ApiError(
                  `Fleece Paper Inventory Invoice details not updated.`,
                  StatusCodes.BAD_REQUEST
                );
              }
            }

            // delete the Fleece paper inventory history details
            const fleecePaperInventoryHistoryDeleteData =
              await fleece_history_model.deleteOne(
                {
                  $and: [
                    { fleece_item_id: consumed_from_item_id },
                    { pressing_done_id: id },
                  ],
                },
                { session }
              );
            if (
              !fleecePaperInventoryHistoryDeleteData.acknowledged ||
              fleecePaperInventoryHistoryDeleteData.deletedCount === 0
            ) {
              throw new ApiError(
                `Fleece Paper Inventory history details not deleted.`,
                StatusCodes.BAD_REQUEST
              );
            }
          }
        }
      }

      // revert face details to consumed_from_item_id from pressing_done_consumed_items_details
      if (face_details && Array.isArray(face_details)) {
        for (const face of face_details) {
          const { consumed_from, consumed_from_item_id } = face;

          // ===================== reverting face consumed details ===================

          if (consumed_from === consumed_from_constants?.inventory) {
            const faceInventoryItem = await face_inventory_items_details
              .findById(consumed_from_item_id)
              .session(session);

            if (!faceInventoryItem) {
              throw new ApiError(
                `Invalid Face Inventory consumed_from_item_id: ${consumed_from_item_id}`,
                StatusCodes.BAD_REQUEST
              );
            }

            // revert the consumed details to face inventory
            const { no_of_sheets, sqm, amount } = face;

            const faceInventoryUpdateData =
              await face_inventory_items_details.updateOne(
                { _id: consumed_from_item_id },
                {
                  $inc: {
                    available_sheets: no_of_sheets,
                    available_sqm: sqm,
                    available_amount: amount,
                  },
                },
                { session }
              );
            if (
              !faceInventoryUpdateData.acknowledged ||
              faceInventoryUpdateData.modifiedCount === 0
            ) {
              throw new ApiError(
                `Face Inventory details not reverted.`,
                StatusCodes.BAD_REQUEST
              );
            }

            // if available_sheets are equal to sheets, then update the invoice details
            if (
              faceInventoryItem?.available_sheets ===
              faceInventoryItem?.available_sheets + no_of_sheets
            ) {
              const faceInventoryInvoiceDetails =
                await face_inventory_invoice_details.updateOne(
                  {
                    _id: faceInventoryItem?.invoice_id,
                  },
                  {
                    $set: {
                      isEditable: true,
                    },
                  },
                  { session }
                );
              if (
                !faceInventoryInvoiceDetails.acknowledged ||
                faceInventoryInvoiceDetails.modifiedCount === 0
              ) {
                throw new ApiError(
                  `Face Inventory Invoice details not updated.`,
                  StatusCodes.BAD_REQUEST
                );
              }
            }

            // delete the face inventory history details
            const delete_face_history_details =
              await face_history_model.deleteOne(
                {
                  $and: [
                    { face_item_id: consumed_from_item_id },
                    { pressing_done_id: id },
                  ],
                },
                { session }
              );
            if (
              !delete_face_history_details.acknowledged ||
              delete_face_history_details.deletedCount === 0
            ) {
              throw new ApiError(
                `Face Inventory history details not deleted.`,
                StatusCodes.BAD_REQUEST
              );
            }
          }
        }
      }

      // ==================== Deleting pressing done consumed item details ====================
      const delete_pressing_done_consumed_items_details =
        await pressing_done_consumed_items_details_model.deleteOne(
          {
            pressing_done_details_id: id,
          },
          { session }
        );
      if (
        !delete_pressing_done_consumed_items_details.acknowledged ||
        delete_pressing_done_consumed_items_details.deletedCount === 0
      ) {
        throw new ApiError(
          'Pressing Done consumed items details not deleted.',
          StatusCodes.BAD_REQUEST
        );
      }

      // ==================== Deleting pressing done details ====================
      const delete_pressing_done_details =
        await pressing_done_details_model.deleteOne(
          {
            _id: id,
          },
          { session }
        );
      if (
        !delete_pressing_done_details.acknowledged ||
        delete_pressing_done_details.deletedCount === 0
      ) {
        throw new ApiError(
          'Pressing Done details not deleted.',
          StatusCodes.BAD_REQUEST
        );
      }

      // if all done, then commit the transaction
      await session.commitTransaction();

      const response = new ApiResponse(
        StatusCodes.CREATED,
        'Revert pressing details successfully'
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

export const add_to_damage_from_pressing_done = catchAsync(async (req, res) => {
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
      throw new ApiError('Damage sheets are missing.', StatusCodes.BAD_REQUEST);
    }

    const pressing_done_details = await pressing_done_details_model
      .findById(id)
      // .lean()
      .session();

    if (!pressing_done_details) {
      throw new ApiError(
        "Pressing Done can't be revert.",
        StatusCodes.BAD_REQUEST
      );
    }

    if (pressing_done_details?.available_details?.no_of_sheets === 0) {
      throw new ApiError('No available sheets found.', StatusCodes.NOT_FOUND);
    }

    const maxNumber = await pressing_damage_model.aggregate([
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

    const factor =
      damage_sheets / pressing_done_details?.available_details?.no_of_sheets;
    const damage_sqm = Number(
      pressing_done_details?.available_details?.sqm * factor
    )?.toFixed(3);

    const added_pressing_damage_sheets = await pressing_damage_model.create(
      [
        {
          sr_no: newMax,
          pressing_done_details_id: pressing_done_details?._id,
          no_of_sheets: damage_sheets,
          sqm: damage_sqm,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        },
      ],
      { session }
    );

    if (
      !added_pressing_damage_sheets ||
      added_pressing_damage_sheets.length === 0
    ) {
      throw new ApiError(
        'Failed to insert pressing damage data',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_pressing_done_after_added_to_damage =
      await pressing_done_details_model.updateOne(
        { _id: pressing_done_details?._id },
        {
          $inc: {
            'available_details.no_of_sheets': -Number(damage_sheets),
            'available_details.sqm': -Number(damage_sqm),
          },
          $set: {
            isEditable: false,
          },
        },
        { session }
      );
    console.log(
      'update_pressing_done_after_added_to_damage',
      update_pressing_done_after_added_to_damage
    );
    if (
      !update_pressing_done_after_added_to_damage ||
      update_pressing_done_after_added_to_damage?.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed update pressing done details after added to damage',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Damage sheets added Successfully',
      added_pressing_damage_sheets
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

export const fetch_all_pressing_done_items_history = catchAsync(
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

    // stage for getting pressing done details
    const aggLookupPressingDoneDetails = {
      $lookup: {
        from: 'pressing_done_details',
        localField: 'issued_item_id',
        foreignField: '_id',
        as: 'pressing_done_details',
      },
    };
    const aggUnwindPressingDoneDetails = {
      $unwind: {
        path: '$pressing_done_details',
        preserveNullAndEmptyArrays: true,
      },
    };

    const aggGroupNoLookup = {
      $lookup: {
        from: 'grouping_done_items_details',
        localField: 'pressing_done_details.group_no',
        foreignField: 'group_no',
        pipeline: [
          {
            $project: {
              group_no: 1,
              photo_no: 1,
              photo_id: 1,
            },
          },
        ],
        as: 'grouping_done_items_details',
      },
    };
    const aggGroupNoUnwind = {
      $unwind: {
        path: '$grouping_done_items_details',
        preserveNullAndEmptyArrays: true,
      },
    };

    // stage for getting created user details
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
    const aggUnwindCreatedUser = {
      $unwind: {
        path: '$created_user_details',
        preserveNullAndEmptyArrays: true,
      },
    };

    // stage for getting updated user details
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
    const aggUnwindUpdatedUser = {
      $unwind: {
        path: '$updated_user_details',
        preserveNullAndEmptyArrays: true,
      },
    };

    // stage for getting order details
    const aggOrderRelatedData = [
      {
        $lookup: {
          from: 'orders',
          localField: 'order_id',
          pipeline: [
            {
              $project: {
                order_no: 1,
                owner_name: 1,
                orderDate: 1,
                order_category: 1,
                series_product: 1,
              },
            },
          ],
          foreignField: '_id',
          as: 'order_details',
        },
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'series_product_order_item_details',
          localField: 'order_item_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                item_no: 1,
                order_id: 1,
                item_name: 1,
                item_sub_category_name: 1,
                group_no: 1,
                photo_number: 1,
              },
            },
          ],
          as: 'series_product_order_item_details',
        },
      },
      {
        $unwind: {
          path: '$series_product_order_item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'decorative_order_item_details',
          localField: 'order_item_id',
          pipeline: [
            {
              $project: {
                item_no: 1,
                order_id: 1,
                item_name: 1,
                item_sub_category_name: 1,
                group_no: 1,
                photo_number: 1,
              },
            },
          ],
          foreignField: '_id',
          as: 'decorative_order_item_details',
        },
      },
      {
        $unwind: {
          path: '$decorative_order_item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          order_item_details: {
            $cond: {
              if: {
                $ne: [{ $type: '$decorative_order_item_details' }, 'missing'],
              },
              then: '$decorative_order_item_details',
              else: '$series_product_order_item_details',
            },
          },
        },
      },
    ];
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

    const list_aggregate = [
      aggLookupPressingDoneDetails,
      aggUnwindPressingDoneDetails,
      aggGroupNoLookup,
      aggGroupNoUnwind,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      ...aggOrderRelatedData,
      aggMatch,
      aggSort,
      aggSkip,
      aggLimit,
    ];

    const result = await pressing_done_history_model.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      aggLookupPressingDoneDetails,
      aggUnwindPressingDoneDetails,
      // aggGroupNoLookup,
      // aggGroupNoUnwind,
      // aggCreatedUserDetails,
      // aggUpdatedUserDetails,
      // aggUnwindCreatedUser,
      // aggUnwindUpdatedUser,
      // ...aggOrderRelatedData,
      aggMatch,
      aggCount,
    ];

    const total_docs =
      await pressing_done_history_model.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Data Fetched Successfully',
      {
        data: result,
        totalPages: totalPages,
      }
    );
    return res.status(StatusCodes.OK).json(response);
  }
);
