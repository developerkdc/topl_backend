import { isValidObjectId } from 'mongoose';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import mongoose from 'mongoose';
import issue_for_order_model from '../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import {
  log_inventory_invoice_model,
  log_inventory_items_model,
} from '../../../database/schema/inventory/log/log.schema.js';
import { item_issued_from } from '../../../database/Utils/constants/constants.js';
import {
  flitch_inventory_invoice_model,
  flitch_inventory_items_model,
} from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import {
  plywood_inventory_invoice_details,
  plywood_inventory_items_details,
} from '../../../database/schema/inventory/Plywood/plywood.schema.js';
import plywood_history_model from '../../../database/schema/inventory/Plywood/plywood.history.schema.js';
import {
  veneer_inventory_invoice_model,
  veneer_inventory_items_model,
} from '../../../database/schema/inventory/venner/venner.schema.js';
import {
  face_inventory_invoice_details,
  face_inventory_items_details,
} from '../../../database/schema/inventory/face/face.schema.js';
import face_history_model from '../../../database/schema/inventory/face/face.history.schema.js';
import {
  mdf_inventory_invoice_details,
  mdf_inventory_items_details,
} from '../../../database/schema/inventory/mdf/mdf.schema.js';
import mdf_history_model from '../../../database/schema/inventory/mdf/mdf.history.schema.js';
import {
  core_inventory_invoice_details,
  core_inventory_items_details,
} from '../../../database/schema/inventory/core/core.schema.js';
import core_history_model from '../../../database/schema/inventory/core/core.history.schema.js';
import {
  othergoods_inventory_invoice_details,
  othergoods_inventory_items_details,
} from '../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js';
import other_goods_history_model from '../../../database/schema/inventory/otherGoods/otherGoods.history.schema.js';
import {
  fleece_inventory_invoice_modal,
  fleece_inventory_items_modal,
} from '../../../database/schema/inventory/fleece/fleece.schema.js';
import fleece_history_model from '../../../database/schema/inventory/fleece/fleece.history.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import {
  dressing_done_items_model,
  dressing_done_other_details_model,
} from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import dressing_done_history_model from '../../../database/schema/factory/dressing/dressing_done/dressing.done.history.schema.js';

class RevertOrderItem {
  constructor(id, userDetails, session) {
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid Order ID', StatusCodes.BAD_REQUEST);
    }
    this.issued_order_data = null;
    this.id = id;
    this.userDetails = userDetails;
    this.session = session;
  }

  async fetch_order_data() {
    const issued_order_data = await issue_for_order_model.findById(this.id);
    if (!issued_order_data) {
      throw new ApiError('Issue for data not found', StatusCodes.BAD_REQUEST);
    }
    this.issued_order_data = issued_order_data;
    return issued_order_data;
  }

  async update_inventory_item_status() {
    try {
      await this.fetch_order_data();

      const issued_from = this.issued_order_data?.issued_from;

      if (!this[issued_from]) {
        throw new ApiError(
          `Invalid issued from type : ${issued_from}`,
          StatusCodes.BAD_REQUEST
        );
      }

      await this[issued_from]();
    } catch (error) {
      throw error;
    }
  }

  //INVENTORY ORDERS
  async LOG() {
    const update_log_item = await log_inventory_items_model?.findOneAndUpdate(
      { _id: this.issued_order_data?.item_details?._id },
      {
        $set: {
          issue_status: null,
          updated_by: this?.userDetails?._id,
        },
      },
      { new: true, session: this.session }
    );

    if (!update_log_item) {
      throw new ApiError('Log item not found', StatusCodes.BAD_REQUEST);
    }

    const is_dressing_item_editable = await log_inventory_items_model?.find({
      _id: { $ne: update_log_item?._id },
      invoice_id: update_log_item?.invoice_id,
      issue_status: { $ne: null },
    });
    console.log(is_invoice_editable);
    if (is_invoice_editable && is_invoice_editable?.length === 0) {
      const update_log_item_invoice_editable_status =
        await log_inventory_invoice_model?.updateOne(
          { _id: update_log_item?.invoice_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );

      if (
        !update_log_item_invoice_editable_status?.acknowledged ||
        update_log_item_invoice_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to Update Log Item Invoice status',
          StatusCodes.BAD_REQUEST
        );
      }
    }
  }
  async FLITCH() {
    const update_flitch_item =
      await flitch_inventory_items_model?.findOneAndUpdate(
        { _id: this.issued_order_data?.item_details?._id },
        {
          $set: {
            issue_status: null,
            updated_by: this?.userDetails?._id,
          },
        },
        { session: this.session, new: true }
      );

    if (!update_flitch_item) {
      throw new ApiError('Flitch item not found', StatusCodes.BAD_REQUEST);
    }

    const is_invoice_editable = await flitch_inventory_items_model?.find({
      _id: { $ne: update_flitch_item?._id },
      invoice_id: update_flitch_item?.invoice_id,
      issue_status: { $ne: null },
    });

    if (is_invoice_editable && is_invoice_editable?.length === 0) {
      const update_flitch_item_invoice_editable_status =
        await flitch_inventory_invoice_model?.updateOne(
          { _id: update_flitch_item?.invoice_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_flitch_item_invoice_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Flitch item Invoice not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_flitch_item_invoice_editable_status?.acknowledged ||
        update_flitch_item_invoice_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update Flitch Item Invoice Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }
  }

  async PLYWOOD() {
    //update plywood item available sheets
    const update_plywood_item =
      await plywood_inventory_items_details.findOneAndUpdate(
        { _id: this.issued_order_data?.item_details?._id },
        {
          $inc: {
            available_sheets:
              this.issued_order_data?.item_details?.issued_sheets || 0,
            available_amount:
              this.issued_order_data?.item_details?.issued_amount || 0,
            available_sqm:
              this.issued_order_data?.item_details?.issued_sqm || 0,
          },
        },
        { session: this.session }
      );

    if (!update_plywood_item) {
      throw new ApiError('Plywood item not found', StatusCodes.BAD_REQUEST);
    }

    //check if invoice is editable
    const is_invoice_editable = await plywood_inventory_items_details?.find({
      _id: { $ne: update_plywood_item?._id },
      invoice_id: update_plywood_item?.invoice_id,
      // issue_status: { $ne: null },
      $expr: { $ne: ['$available_sheets', '$sheets'] },
    });

    //if invoice is editable then update then update the editable status
    if (is_invoice_editable && is_invoice_editable?.length === 0) {
      const update_plywood_item_invoice_editable_status =
        await plywood_inventory_invoice_details?.updateOne(
          { _id: update_plywood_item?.invoice_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_plywood_item_invoice_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Plywood item Invoice not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_plywood_item_invoice_editable_status?.acknowledged ||
        update_plywood_item_invoice_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update Plywood Item Invoice Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    //delete the plywood history document
    const delete_plywood_history_document_result =
      await plywood_history_model.deleteOne(
        { issued_for_order_id: this.issued_order_data?._id },
        { session: this.session }
      );

    if (
      !delete_plywood_history_document_result?.acknowledged ||
      delete_plywood_history_document_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete plywood history',
        StatusCodes.BAD_REQUEST
      );
    }
  }

  async VENEER() {
    const update_venner_item =
      await veneer_inventory_items_model.findOneAndUpdate(
        { _id: this.issued_order_data?.item_details?._id },
        {
          $set: {
            issue_status: null,
            updated_by: this.userDetails?._id,
          },
        },
        {
          session: this.session,
          new: true,
        }
      );

    if (!update_venner_item) {
      throw new ApiError('Venner Item not found.', StatusCodes.BAD_REQUEST);
    }

    const is_invoice_editable = await veneer_inventory_items_model?.find({
      _id: { $ne: update_venner_item?._id },
      invoice_id: update_venner_item?.invoice_id,
      issue_status: { $ne: null },
    });

    if (is_invoice_editable && is_invoice_editable?.length === 0) {
      const update_venner_item_invoice_editable_status =
        await veneer_inventory_invoice_model?.updateOne(
          { _id: update_venner_item?.invoice_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_venner_item_invoice_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Venner item Invoice not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_venner_item_invoice_editable_status?.acknowledged ||
        update_venner_item_invoice_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update Venner Item Invoice Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }
  }
  async FACE() {
    //update face item available sheets
    const update_face_item =
      await face_inventory_items_details.findOneAndUpdate(
        { _id: this.issued_order_data?.item_details?._id },
        {
          $inc: {
            available_sheets:
              this.issued_order_data?.item_details?.issued_sheets || 0,
            available_amount:
              this.issued_order_data?.item_details?.issued_amount || 0,
            available_sqm:
              this.issued_order_data?.item_details?.issued_sqm || 0,
          },
        },
        { session: this.session, new: true }
      );

    if (!update_face_item) {
      throw new ApiError('Face item not found', StatusCodes.BAD_REQUEST);
    }

    //check if invoice is editable
    const is_invoice_editable = await face_inventory_items_details?.find({
      _id: { $ne: update_face_item?._id },
      invoice_id: update_face_item?.invoice_id,
      // issue_status: { $ne: null },
      $expr: { $ne: ['$available_sheets', '$number_of_sheets'] },
    });

    //if invoice is editable then update then update the editable status
    if (is_invoice_editable && is_invoice_editable?.length === 0) {
      const update_face_item_invoice_editable_status =
        await face_inventory_invoice_details?.updateOne(
          { _id: update_face_item?.invoice_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_face_item_invoice_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Face item Invoice not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_face_item_invoice_editable_status?.acknowledged ||
        update_face_item_invoice_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update Face Item Invoice Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    //delete the face history document
    const delete_face_history_document_result =
      await face_history_model.deleteOne(
        { issued_for_order_id: this.issued_order_data?._id },
        { session: this.session }
      );

    if (
      !delete_face_history_document_result?.acknowledged ||
      delete_face_history_document_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete face history',
        StatusCodes.BAD_REQUEST
      );
    }
  }

  async MDF() {
    //update mdf item available sheets
    const update_mdf_item = await mdf_inventory_items_details.findOneAndUpdate(
      { _id: this.issued_order_data?.item_details?._id },
      {
        $inc: {
          available_sheets:
            this.issued_order_data?.item_details?.issued_sheets || 0,
          available_amount:
            this.issued_order_data?.item_details?.issued_amount || 0,
          available_sqm: this.issued_order_data?.item_details?.issued_sqm || 0,
        },
      },
      { session: this.session, new: true }
    );

    if (!update_mdf_item) {
      throw new ApiError('MDF item not found', StatusCodes.BAD_REQUEST);
    }

    //check if invoice is editable
    const is_invoice_editable = await mdf_inventory_items_details?.find({
      _id: { $ne: update_mdf_item?._id },
      invoice_id: update_mdf_item?.invoice_id,
      // issue_status: { $ne: null },
      $expr: { $ne: ['$available_sheets', '$no_of_sheet'] },
    });

    //if invoice is editable then update then update the editable status
    if (is_invoice_editable && is_invoice_editable?.length === 0) {
      const update_mdf_item_invoice_editable_status =
        await mdf_inventory_invoice_details?.updateOne(
          { _id: update_mdf_item?.invoice_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_mdf_item_invoice_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'MDF item Invoice not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_mdf_item_invoice_editable_status?.acknowledged ||
        update_mdf_item_invoice_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update MDF Item Invoice Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    //delete the mdf history document
    const delete_mdf_history_document_result =
      await mdf_history_model.deleteOne(
        { issued_for_order_id: this.issued_order_data?._id },
        { session: this.session }
      );

    if (
      !delete_mdf_history_document_result?.acknowledged ||
      delete_mdf_history_document_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete mdf history',
        StatusCodes.BAD_REQUEST
      );
    }
  }

  async CORE() {
    //update core item available sheets
    const update_core_item =
      await core_inventory_items_details.findOneAndUpdate(
        { _id: this.issued_order_data?.item_details?._id },
        {
          $inc: {
            available_sheets:
              this.issued_order_data?.item_details?.issued_sheets || 0,
            available_amount:
              this.issued_order_data?.item_details?.issued_amount || 0,
            available_sqm:
              this.issued_order_data?.item_details?.issued_sqm || 0,
          },
        },
        { session: this.session, new: true }
      );

    if (!update_core_item) {
      throw new ApiError('Core item not found', StatusCodes.BAD_REQUEST);
    }

    //check if invoice is editable
    const is_invoice_editable = await core_inventory_items_details?.find({
      _id: { $ne: update_core_item?._id },
      invoice_id: update_core_item?.invoice_id,
      // issue_status: { $ne: null },
      $expr: { $ne: ['$available_sheets', '$number_of_sheets'] },
    });

    //if invoice is editable then update then update the editable status
    if (is_invoice_editable && is_invoice_editable?.length === 0) {
      const update_core_item_invoice_editable_status =
        await core_inventory_invoice_details?.updateOne(
          { _id: update_core_item?.invoice_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_core_item_invoice_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Core item Invoice not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_core_item_invoice_editable_status?.acknowledged ||
        update_core_item_invoice_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update Core Item Invoice Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    //delete the core history document
    const delete_core_history_document_result =
      await core_history_model.deleteOne(
        { issued_for_order_id: this.issued_order_data?._id },
        { session: this.session }
      );

    if (
      !delete_core_history_document_result?.acknowledged ||
      delete_core_history_document_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete core history',
        StatusCodes.BAD_REQUEST
      );
    }
  }

  async FLEECE_PAPER() {
    //update fleece item available sheets
    const update_fleece_item =
      await fleece_inventory_items_modal.findOneAndUpdate(
        { _id: this.issued_order_data?.item_details?._id },
        {
          $inc: {
            available_number_of_roll:
              this.issued_order_data?.item_details?.issued_number_of_roll || 0,
            available_amount:
              this.issued_order_data?.item_details?.issued_amount || 0,
            available_sqm:
              this.issued_order_data?.item_details?.issued_sqm || 0,
          },
        },
        { session: this.session, new: true }
      );

    if (!update_fleece_item) {
      throw new ApiError('Fleece item not found', StatusCodes.BAD_REQUEST);
    }

    //check if invoice is editable
    const is_invoice_editable = await fleece_inventory_items_modal?.find({
      _id: { $ne: update_fleece_item?._id },
      invoice_id: update_fleece_item?.invoice_id,
      // issue_status: { $ne: null },
      $expr: { $ne: ['$available_number_of_roll', '$number_of_roll'] },
    });

    //if invoice is editable then update then update the editable status
    if (is_invoice_editable && is_invoice_editable?.length === 0) {
      const update_fleece_item_invoice_editable_status =
        await fleece_inventory_invoice_modal?.updateOne(
          { _id: update_fleece_item?.invoice_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_fleece_item_invoice_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Fleece item Invoice not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_fleece_item_invoice_editable_status?.acknowledged ||
        update_fleece_item_invoice_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update Fleece Item Invoice Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    //delete the fleece history document
    const delete_fleece_history_document_result =
      await fleece_history_model.deleteOne(
        { issued_for_order_id: this.issued_order_data?._id },
        { session: this.session }
      );

    if (
      !delete_fleece_history_document_result?.acknowledged ||
      delete_fleece_history_document_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete fleece history',
        StatusCodes.BAD_REQUEST
      );
    }
  }

  async OTHER_GOODS() {
    //update other goods item available quantity
    const update_other_goods_item =
      await othergoods_inventory_items_details.findOneAndUpdate(
        { _id: this.issued_order_data?.item_details?._id },
        {
          $inc: {
            available_quantity:
              this.issued_order_data?.item_details?.issued_quantity || 0,
            available_amount:
              this.issued_order_data?.item_details?.issued_amount || 0,
          },
        },
        { session: this.session, new: true }
      );

    if (!update_other_goods_item) {
      throw new ApiError('Other Goods item not found', StatusCodes.BAD_REQUEST);
    }

    //check if invoice is editable
    const is_invoice_editable = await othergoods_inventory_items_details?.find({
      _id: { $ne: update_other_goods_item?._id },
      invoice_id: update_other_goods_item?.invoice_id,
      $expr: { $ne: ['$available_quantity', '$total_quantity'] },
    });

    //if invoice is editable then update then update the editable status
    if (is_invoice_editable && is_invoice_editable?.length === 0) {
      const update_other_goods_item_invoice_editable_status =
        await othergoods_inventory_invoice_details?.updateOne(
          { _id: update_other_goods_item?.invoice_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_other_goods_item_invoice_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Other Goods item Invoice not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_other_goods_item_invoice_editable_status?.acknowledged ||
        update_other_goods_item_invoice_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update Other Goods Item Invoice Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    //delete the other goods history document
    const delete_other_goods_history_document_result =
      await other_goods_history_model.deleteOne(
        { issued_for_order_id: this.issued_order_data?._id },
        { session: this.session }
      );

    if (
      !delete_other_goods_history_document_result?.acknowledged ||
      delete_other_goods_history_document_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete other goods history',
        StatusCodes.BAD_REQUEST
      );
    }
  }

  //FACTORY ORDERS
  async FLITCHING_FACTORY() {
    const update_flitching_item = await flitching_done_model?.findOneAndUpdate(
      { _id: this.issued_order_data?.item_details?._id },
      {
        $set: {
          issue_status: null,
          updated_by: this?.userDetails?._id,
        },
      },
      { session: this.session, new: true }
    );

    if (!update_flitching_item) {
      throw new ApiError('Flitching item not found', StatusCodes.BAD_REQUEST);
    }

    const is_flitching_item_editable = await flitching_done_model?.find({
      _id: { $ne: update_flitching_item?._id },
      issue_for_flitching_id: update_flitching_item?.issue_for_flitching_id,
      issue_status: { $ne: null },
    });

    if (
      is_flitching_item_editable &&
      is_flitching_item_editable?.length === 0
    ) {
      const update_flitching_item_editable_status =
        await flitching_done_model.updateMany(
          {
            issue_for_flitching_id:
              update_flitching_item?.issue_for_flitching_id,
          },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_flitching_item_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Flitching item  not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_flitching_item_editable_status?.acknowledged ||
        update_flitching_item_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update Flitch Item Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }
  }

  async CROSSCUTTING() {
    const update_crosscutting_item =
      await crosscutting_done_model?.findOneAndUpdate(
        { _id: this.issued_order_data?.item_details?._id },
        {
          $set: {
            issue_status: null,
            updated_by: this?.userDetails?._id,
          },
        },
        { session: this.session, new: true }
      );

    if (!update_crosscutting_item) {
      throw new ApiError(
        'Crosscutting item not found',
        StatusCodes.BAD_REQUEST
      );
    }

    const is_crosscutting_item_editable = await crosscutting_done_model?.find({
      _id: { $ne: update_crosscutting_item?._id },
      issue_for_crosscutting_id:
        update_crosscutting_item.issue_for_crosscutting_id,
      issue_status: { $ne: null },
    });

    if (
      is_crosscutting_item_editable &&
      is_crosscutting_item_editable?.length === 0
    ) {
      const update_crosscutting_item_editable_status =
        await crosscutting_done_model.updateMany(
          {
            issue_for_crosscutting_id:
              update_crosscutting_item?.issue_for_crosscutting_id,
          },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_crosscutting_item_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Crosscutting item  not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_crosscutting_item_editable_status?.acknowledged ||
        update_crosscutting_item_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update Flitch Item Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }
  }

  async DRESSING_FACTORY() {
    const update_dressing_item =
      await dressing_done_items_model.findOneAndUpdate(
        { _id: this.issued_order_data?.item_details?._id },
        {
          $set: {
            issue_status: null,
            updated_by: this.userDetails?._id,
          },
        },
        {
          session: this.session,
          new: true,
        }
      );

    if (!update_dressing_item) {
      throw new ApiError('Dressing Item not found.', StatusCodes.BAD_REQUEST);
    }

    const is_dressing_item_editable = await dressing_done_items_model?.find({
      _id: { $ne: update_dressing_item?._id },
      dressing_done_other_details_id:
        update_dressing_item?.dressing_done_other_details_id,
      issue_status: { $ne: null },
    });

    if (is_dressing_item_editable && is_dressing_item_editable?.length === 0) {
      const update_dressing_item_editable_status =
        await dressing_done_other_details_model?.updateOne(
          { _id: update_dressing_item?.dressing_done_other_details_id },
          {
            $set: {
              isEditable: true,
              updated_by: this.userDetails?._id,
            },
          },
          { session: this.session }
        );
      if (update_dressing_item_editable_status?.matchedCount === 0) {
        throw new ApiError(
          'Dressing item details not found',
          StatusCodes.BAD_REQUEST
        );
      }
      if (
        !update_dressing_item_editable_status?.acknowledged ||
        update_dressing_item_editable_status?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update dressing item editable Status',
          StatusCodes.BAD_REQUEST
        );
      }
    }
    const delete_doc_from_dressing_history_result =
      await dressing_done_history_model.deleteOne(
        {
          dressing_done_other_details_id:
            update_dressing_item?.dressing_done_other_details_id,
          bundles: update_dressing_item?._id,
        },
        { session: this.session }
      );

    if (
      !delete_doc_from_dressing_history_result?.acknowledged ||
      delete_doc_from_dressing_history_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete document from dressing history',
        StatusCodes.BAD_REQUEST
      );
    }
  }
}

export default RevertOrderItem;
