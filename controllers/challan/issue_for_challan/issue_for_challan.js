import { isValidObjectId } from 'mongoose';
import ApiError from '../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../utils/constants.js';
import {
  issues_for_status,
  item_issued_from,
} from '../../../database/Utils/constants/constants.js';
import {
  log_inventory_invoice_model,
  log_inventory_items_model,
} from '../../../database/schema/inventory/log/log.schema.js';
import {
  flitch_inventory_invoice_model,
  flitch_inventory_items_model,
} from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import {
  plywood_inventory_invoice_details,
  plywood_inventory_items_details,
} from '../../../database/schema/inventory/Plywood/plywood.schema.js';
import issue_for_challan_model from '../../../database/schema/challan/issue_for_challan/issue_for_challan.schema.js';
import plywood_history_model from '../../../database/schema/inventory/Plywood/plywood.history.schema.js';
import {
  veneer_inventory_invoice_model,
  veneer_inventory_items_model,
} from '../../../database/schema/inventory/venner/venner.schema.js';
import {
  mdf_inventory_invoice_details,
  mdf_inventory_items_details,
} from '../../../database/schema/inventory/mdf/mdf.schema.js';
import mdf_history_model from '../../../database/schema/inventory/mdf/mdf.history.schema.js';
import {
  face_inventory_invoice_details,
  face_inventory_items_details,
} from '../../../database/schema/inventory/face/face.schema.js';
import face_history_model from '../../../database/schema/inventory/face/face.history.schema.js';
import {
  core_inventory_invoice_details,
  core_inventory_items_details,
} from '../../../database/schema/inventory/core/core.schema.js';
import core_history_model from '../../../database/schema/inventory/core/core.history.schema.js';
import {
  fleece_inventory_invoice_modal,
  fleece_inventory_items_modal,
} from '../../../database/schema/inventory/fleece/fleece.schema.js';
import fleece_history_model from '../../../database/schema/inventory/fleece/fleece.history.schema.js';
import {
  othergoods_inventory_invoice_details,
  othergoods_inventory_items_details,
} from '../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js';
import other_goods_history_model from '../../../database/schema/inventory/otherGoods/otherGoods.history.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import {
  grouping_done_details_model,
  grouping_done_items_details_model,
} from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import grouping_done_history_model from '../../../database/schema/factory/grouping/grouping_done_history.schema.js';
import {
  dressing_done_items_model,
  dressing_done_other_details_model,
} from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import dressing_done_history_model from '../../../database/schema/factory/dressing/dressing_done/dressing.done.history.schema.js';

//add for each inventory and factory item
const issued_from_map = {
  [item_issued_from?.log]: log_inventory_items_model,
  [item_issued_from?.flitch]: flitch_inventory_items_model,
  [item_issued_from?.plywood]: plywood_inventory_items_details,
  [item_issued_from?.veneer]: veneer_inventory_items_model,
  [item_issued_from?.mdf]: mdf_inventory_items_details,
  [item_issued_from?.face]: face_inventory_items_details,
  [item_issued_from?.core]: core_inventory_items_details,
  [item_issued_from?.fleece_paper]: fleece_inventory_items_modal,
  [item_issued_from?.other_goods]: othergoods_inventory_items_details,
  [item_issued_from?.flitching_factory]: flitching_done_model,
  [item_issued_from?.crosscutting]: crosscutting_done_model,
  [item_issued_from?.grouping_factory]: grouping_done_items_details_model,
  [item_issued_from?.dressing_factory]: dressing_done_items_model,
};
class IssueForChallan {
  constructor(session, userDetails, issued_from, issued_item_id, issued_data) {
    // if (!isValidObjectId(issued_item_id)) {
    //   throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    // }
    this.session = session;
    this.userDetails = userDetails;
    this.issued_from = issued_from;
    this.issued_item_id = issued_item_id;
    this.issued_item_details = null;
    this.issued_data = issued_data || null;
  }

  //method to fetch issued item details based on issued item id
  async fetch_issued_item_details() {
    let issued_item_details;
    const issued_from_array = [
      'LOG',
      'FLITCH',
      'VENEER',
      'FLITCHING_FACTORY',
      'CROSSCUTTING',
      // 'DRESSING_FACTORY',
      // 'GROUPING_FACTORY',
    ];
    if (issued_from_array?.includes(this.issued_from)) {
      issued_item_details = await issued_from_map[this.issued_from]
        ?.find({ _id: { $in: this.issued_item_id } })
        .session(this.session);
    } else {
      issued_item_details = await issued_from_map[this.issued_from]
        ?.findOne({ _id: { $in: this.issued_item_id } })
        .lean()
        .session(this.session);
    }
    if (issued_item_details?.length === 0) {
      throw new ApiError(
        'Issued item details not found.',
        StatusCodes.NOT_FOUND
      );
    }
    this.issued_item_details = issued_item_details;
    return issued_item_details;
  }

  async add_issue_data_to_challan() {
    try {
      await this.fetch_issued_item_details();

      const issued_from = this.issued_from;
      if (!this[issued_from]) {
        throw new ApiError(
          `Invalid Issued from type : ${issued_from}`,
          StatusCodes.NOT_FOUND
        );
      }
      await this[issued_from]();
    } catch (error) {
      throw error;
    }
  }

  //add data from log inventory
  async LOG() {
    const common_fields = {
      issued_from: this.issued_from,
      created_by: this.userDetails?._id,
      updated_by: this.userDetails?._id,
    };
    const updated_item_details = this.issued_item_details?.map((item) => ({
      ...common_fields,
      issued_item_details: item,
    }));
    const issued_items_invoice_ids = this.issued_item_details?.map(
      (i) => i?.invoice_id
    );
    const add_data_to_challan_result = await issue_for_challan_model.insertMany(
      updated_item_details,
      { session: this.session }
    );

    if (add_data_to_challan_result?.length === 0) {
      throw new ApiError(
        'Failed to issue data for challan.',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_log_item_details_issue_status =
      await log_inventory_items_model.updateMany(
        { _id: { $in: this.issued_item_id } },
        {
          $set: {
            issue_status: issues_for_status?.challan,
          },
        },
        { session: this.session }
      );

    if (update_log_item_details_issue_status?.matchedCount === 0) {
      throw new ApiError('Log Items not found.', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_log_item_details_issue_status?.acknowledged ||
      update_log_item_details_issue_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update inventory items status',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_inventory_invoice_editable_status_result =
      await log_inventory_invoice_model.updateMany(
        { _id: { $in: issued_items_invoice_ids } },
        {
          $set: {
            isEditable: false,
          },
        },
        { session: this.session }
      );

    if (update_inventory_invoice_editable_status_result?.matchedCount === 0) {
      throw new ApiError('Log items invoice not found.', StatusCodes.NOT_FOUND);
    }
    if (
      !update_inventory_invoice_editable_status_result?.acknowledged ||
      update_inventory_invoice_editable_status_result.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update invoice status',
        StatusCodes.BAD_REQUEST
      );
    }
  }
  //add data from flitch inventory
  async FLITCH() {
    const common_fields = {
      issued_from: this.issued_from,
      created_by: this.userDetails?._id,
      updated_by: this.userDetails?._id,
    };
    const updated_item_details = this.issued_item_details?.map((item) => ({
      ...common_fields,
      issued_item_details: item,
    }));
    const issued_items_invoice_ids = this.issued_item_details?.map(
      (i) => i?.invoice_id
    );
    const add_data_to_challan_result = await issue_for_challan_model.insertMany(
      updated_item_details,
      { session: this.session }
    );

    if (add_data_to_challan_result?.length === 0) {
      throw new ApiError(
        'Failed to issue data for challan.',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_flitch_item_details_issue_status =
      await flitch_inventory_items_model.updateMany(
        { _id: { $in: this.issued_item_id } },
        {
          $set: {
            issue_status: issues_for_status?.challan,
          },
        },
        { session: this.session }
      );

    if (update_flitch_item_details_issue_status?.matchedCount === 0) {
      throw new ApiError('Flitch Items not found.', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_flitch_item_details_issue_status?.acknowledged ||
      update_flitch_item_details_issue_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update inventory items status',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_inventory_invoice_editable_status_result =
      await flitch_inventory_invoice_model.updateMany(
        { _id: { $in: issued_items_invoice_ids } },
        {
          $set: {
            isEditable: false,
          },
        },
        { session: this.session }
      );

    if (update_inventory_invoice_editable_status_result?.matchedCount === 0) {
      throw new ApiError(
        'Flitch items invoice not found.',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_inventory_invoice_editable_status_result?.acknowledged ||
      update_inventory_invoice_editable_status_result.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update invoice status',
        StatusCodes.BAD_REQUEST
      );
    }
  }
  //add data from Plywood inventory
  async PLYWOOD() {
    // const maxNumber = await issue_for_challan_model.aggregate([
    //         {
    //           $group: {
    //             _id: null,
    //             max: {
    //               $max: '$sr_no',
    //             },
    //           },
    //         },
    //       ]);

    // const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
    if (this.issued_item_details?.available_sheets < this.issued_data) {
      throw new ApiError('Available sheets are less than issued sheets');
    }

    const factor =
      this.issued_data / this.issued_item_details?.available_sheets;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sheets: this.issued_data,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const [result] = await issue_for_challan_model.create(
      [
        {
          // sr_no: newMax,
          issued_from: this.issued_from,
          issued_item_details: updated_issued_item_details,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_plywood_inventory =
      await plywood_inventory_items_details.updateOne(
        { _id: this.issued_item_details?._id },
        {
          $inc: {
            available_sheets: -this.issued_data,
            available_sqm: -issued_sqm,
            available_amount: -issued_amount,
          },
          $set: {
            issue_status: issues_for_status?.challan,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );

    if (update_plywood_inventory?.matchedCount === 0) {
      throw new ApiError('Plywood item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_plywood_inventory?.acknowledged ||
      update_plywood_inventory?.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update plywood inventory',
        StatusCodes?.BAD_REQUEST
      );
    }

    //update plywood inventory invoice ediatble status
    const update_plywood_inventory_invoice_editable_status =
      await plywood_inventory_invoice_details?.updateOne(
        { _id: this.issued_item_details?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );

    if (update_plywood_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'Plywood item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_plywood_inventory_invoice_editable_status?.acknowledged ||
      update_plywood_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update plywood item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to plywood history model
    const add_issued_data_to_plywood_history =
      await plywood_history_model.create(
        [
          {
            issued_for_challan_id: result?._id,
            issue_status: issues_for_status?.challan,
            plywood_item_id: this.issued_item_details?._id,
            issued_sheets: this.issued_data,
            issued_sqm: issued_sqm,
            issued_amount: issued_amount,
            created_by: this.userDetails?._id,
            updated_by: this.userDetails?._id,
          },
        ],
        { session: this.session }
      );

    if (add_issued_data_to_plywood_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to plywood history',
        StatusCodes.BAD_REQUEST
      );
    }
  }
  //add data from VENEER inventory
  async VENEER() {
    const common_fields = {
      issued_from: this.issued_from,
      created_by: this.userDetails?._id,
      updated_by: this.userDetails?._id,
    };
    const updated_item_details = this.issued_item_details?.map((item) => ({
      ...common_fields,
      issued_item_details: item,
    }));
    const issued_items_invoice_ids = this.issued_item_details?.map(
      (i) => i?.invoice_id
    );
    const add_data_to_challan_result = await issue_for_challan_model.insertMany(
      updated_item_details,
      { session: this.session }
    );

    if (add_data_to_challan_result?.length === 0) {
      throw new ApiError(
        'Failed to issue data for challan.',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_veneer_item_details_issue_status =
      await veneer_inventory_items_model.updateMany(
        { _id: { $in: this.issued_item_id } },
        {
          $set: {
            issue_status: issues_for_status?.challan,
          },
        },
        { session: this.session }
      );

    if (update_veneer_item_details_issue_status?.matchedCount === 0) {
      throw new ApiError('Flitch Items not found.', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_veneer_item_details_issue_status?.acknowledged ||
      update_veneer_item_details_issue_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update inventory items status',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_inventory_invoice_editable_status_result =
      await veneer_inventory_invoice_model.updateMany(
        { _id: { $in: issued_items_invoice_ids } },
        {
          $set: {
            isEditable: false,
          },
        },
        { session: this.session }
      );

    if (update_inventory_invoice_editable_status_result?.matchedCount === 0) {
      throw new ApiError(
        'Venner items invoice not found.',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_inventory_invoice_editable_status_result?.acknowledged ||
      update_inventory_invoice_editable_status_result.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update invoice status',
        StatusCodes.BAD_REQUEST
      );
    }
  }
  //add data from MDF inventory
  async MDF() {
    // const maxNumber = await issue_for_challan_model.aggregate([
    //         {
    //           $group: {
    //             _id: null,
    //             max: {
    //               $max: '$sr_no',
    //             },
    //           },
    //         },
    //       ]);

    // const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
    if (this.issued_item_details?.available_sheets < this.issued_data) {
      throw new ApiError('Available sheets are less than issued sheets');
    }
    const factor =
      this.issued_data / this.issued_item_details?.available_sheets;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sheets: this.issued_data,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const [result] = await issue_for_challan_model.create(
      [
        {
          // sr_no: newMax,
          issued_from: this.issued_from,
          issued_item_details: updated_issued_item_details,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }
    const update_mdf_inventory = await mdf_inventory_items_details.updateOne(
      { _id: this.issued_item_details._id },
      {
        $inc: {
          available_sheets: -this.issued_data,
          available_sqm: -issued_sqm,
          available_amount: -issued_amount,
        },
        $set: {
          issue_status: issues_for_status?.challan,
          updated_by: this.userDetails?._id,
        },
      },
      { session: this.session }
    );

    if (update_mdf_inventory?.matchedCount === 0) {
      throw new ApiError('MDF item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_mdf_inventory?.acknowledged ||
      update_mdf_inventory?.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update MDF inventory',
        StatusCodes?.BAD_REQUEST
      );
    }

    //update MDF inventory invoice ediatble status
    const update_mdf_inventory_invoice_editable_status =
      await mdf_inventory_invoice_details?.updateOne(
        { _id: this.issued_item_details?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );

    if (update_mdf_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError('MDF item invoice not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_mdf_inventory_invoice_editable_status?.acknowledged ||
      update_mdf_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update MDF item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to plywood history model
    const add_issued_data_to_mdf_history = await mdf_history_model.create(
      [
        {
          issued_for_challan_id: result?._id,
          issue_status: issues_for_status?.challan,
          mdf_item_id: this.issued_item_details?._id,
          issued_sheets: this.issued_data,
          issued_sqm: issued_sqm,
          issued_amount: issued_amount,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (add_issued_data_to_mdf_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to MDF history',
        StatusCodes.BAD_REQUEST
      );
    }
  }
  //add data from Face inventory
  async FACE() {
    // const maxNumber = await issue_for_challan_model.aggregate([
    //         {
    //           $group: {
    //             _id: null,
    //             max: {
    //               $max: '$sr_no',
    //             },
    //           },
    //         },
    //       ]);

    // const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
    if (this.issued_item_details?.available_sheets < this.issued_data) {
      throw new ApiError('Available sheets are less than issued sheets');
    }
    const factor =
      this.issued_data / this.issued_item_details?.available_sheets;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sheets: this.issued_data,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const [result] = await issue_for_challan_model.create(
      [
        {
          // sr_no: newMax,
          issued_from: this.issued_from,
          issued_item_details: updated_issued_item_details,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_face_inventory = await face_inventory_items_details.updateOne(
      { _id: this.issued_item_details._id },
      {
        $inc: {
          available_sheets: -this.issued_data,
          available_sqm: -issued_sqm,
          available_amount: -issued_amount,
        },
        $set: {
          issue_status: issues_for_status?.challan,
          updated_by: this.userDetails?._id,
        },
      },
      { session: this.session }
    );

    if (update_face_inventory?.matchedCount === 0) {
      throw new ApiError('Face item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_face_inventory?.acknowledged ||
      update_face_inventory?.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update Face inventory',
        StatusCodes?.BAD_REQUEST
      );
    }

    //update Face inventory invoice ediatble status
    const update_face_inventory_invoice_editable_status =
      await face_inventory_invoice_details?.updateOne(
        { _id: this.issued_item_details?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );
    if (update_face_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'Face item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_face_inventory_invoice_editable_status?.acknowledged ||
      update_face_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Face item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to plywood history model
    const add_issued_data_to_face_history = await face_history_model.create(
      [
        {
          issued_for_challan_id: result?._id,
          issue_status: issues_for_status?.challan,
          face_item_id: this.issued_item_details?._id,
          issued_sheets: this.issued_data,
          issued_sqm: issued_sqm,
          issued_amount: issued_amount,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (add_issued_data_to_face_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to Face history',
        StatusCodes.BAD_REQUEST
      );
    }

    return result;
  }
  //add data from CORE inventory
  async CORE() {
    // const maxNumber = await issue_for_challan_model.aggregate([
    //         {
    //           $group: {
    //             _id: null,
    //             max: {
    //               $max: '$sr_no',
    //             },
    //           },
    //         },
    //       ]);

    // const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
    if (this.issued_item_details?.available_sheets < this.issued_data) {
      throw new ApiError('Available sheets are less than issued sheets');
    }
    const factor =
      this.issued_data / this.issued_item_details?.available_sheets;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sheets: this.issued_data,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const [result] = await issue_for_challan_model.create(
      [
        {
          // sr_no: newMax,
          issued_from: this.issued_from,
          issued_item_details: updated_issued_item_details,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_core_inventory = await core_inventory_items_details.updateOne(
      { _id: this.issued_item_details._id },
      {
        $inc: {
          available_sheets: -this.issued_data,
          available_sqm: -issued_sqm,
          available_amount: -issued_amount,
        },
        $set: {
          issue_status: issues_for_status?.challan,
          updated_by: this.userDetails?._id,
        },
      },
      { session: this.session }
    );

    if (update_core_inventory?.matchedCount === 0) {
      throw new ApiError('Core item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_core_inventory?.acknowledged ||
      update_core_inventory?.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update Core inventory',
        StatusCodes?.BAD_REQUEST
      );
    }

    //update Face inventory invoice ediatble status
    const update_core_inventory_invoice_editable_status =
      await core_inventory_invoice_details?.updateOne(
        { _id: this.issued_item_details?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );
    if (update_core_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'Core item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_core_inventory_invoice_editable_status?.acknowledged ||
      update_core_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Core item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to plywood history model
    const add_issued_data_to_core_history = await core_history_model.create(
      [
        {
          issued_for_challan_id: result?._id,
          issue_status: issues_for_status?.challan,
          core_item_id: this.issued_item_details?._id,
          issued_sheets: this.issued_data,
          issued_sqm: issued_sqm,
          issued_amount: issued_amount,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (add_issued_data_to_core_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to Core history',
        StatusCodes.BAD_REQUEST
      );
    }
  }
  //add data from FLEECE PAPER inventory
  async FLEECE_PAPER() {
    // const maxNumber = await issue_for_challan_model.aggregate([
    //         {
    //           $group: {
    //             _id: null,
    //             max: {
    //               $max: '$sr_no',
    //             },
    //           },
    //         },
    //       ]);

    // const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
    if (this.issued_item_details?.available_number_of_roll < this.issued_data) {
      throw new ApiError(
        'Available NO. of Rolls are less than issued NO. of Rolls'
      );
    }
    const factor =
      this.issued_data / this.issued_item_details?.available_number_of_roll;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_number_of_roll: this.issued_data,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const [result] = await issue_for_challan_model.create(
      [
        {
          // sr_no: newMax,
          issued_from: this.issued_from,
          issued_item_details: updated_issued_item_details,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_fleece_paper_inventory =
      await fleece_inventory_items_modal.updateOne(
        { _id: this.issued_item_details._id },
        {
          $inc: {
            available_number_of_roll: -this.issued_data,
            available_sqm: -issued_sqm,
            available_amount: -issued_amount,
          },
          $set: {
            issue_status: issues_for_status?.challan,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );

    if (update_fleece_paper_inventory?.matchedCount === 0) {
      throw new ApiError(
        'Fleece paper item not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_fleece_paper_inventory?.acknowledged ||
      update_fleece_paper_inventory?.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update Fleece paper inventory',
        StatusCodes?.BAD_REQUEST
      );
    }

    //update Face inventory invoice ediatble status
    const update_fleece_paper_inventory_invoice_editable_status =
      await fleece_inventory_invoice_modal?.updateOne(
        { _id: this.issued_item_details?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );
    if (
      update_fleece_paper_inventory_invoice_editable_status?.matchedCount === 0
    ) {
      throw new ApiError(
        'Fleece paper item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_fleece_paper_inventory_invoice_editable_status?.acknowledged ||
      update_fleece_paper_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Fleece paper item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to plywood history model
    const add_issued_data_to_fleece_paper_history =
      await fleece_history_model.create(
        [
          {
            issued_for_challan_id: result?._id,
            issue_status: issues_for_status?.challan,
            fleece_item_id: this.issued_item_details?._id,
            issued_number_of_roll: this.issued_data,
            issued_sqm: issued_sqm,
            issued_amount: issued_amount,
            created_by: this.userDetails?._id,
            updated_by: this.userDetails?._id,
          },
        ],
        { session: this.session }
      );

    if (add_issued_data_to_fleece_paper_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to Fleece paper history',
        StatusCodes.BAD_REQUEST
      );
    }
  }
  //add data from OTHER GOODS inventory
  async OTHER_GOODS() {
    // const maxNumber = await issue_for_challan_model.aggregate([
    //         {
    //           $group: {
    //             _id: null,
    //             max: {
    //               $max: '$sr_no',
    //             },
    //           },
    //         },
    //       ]);

    // const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
    if (this.issued_item_details?.available_quantity < this.issued_data) {
      throw new ApiError('Available Quantiry is less than issued quantity');
    }
    const factor =
      this.issued_data / this.issued_item_details?.available_quantity;
    // const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_quantity: this.issued_data,
      //   issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const [result] = await issue_for_challan_model.create(
      [
        {
          // sr_no: newMax,
          issued_from: this.issued_from,
          issued_item_details: updated_issued_item_details,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_other_goods_inventory =
      await othergoods_inventory_items_details.updateOne(
        { _id: this.issued_item_details._id },
        {
          $inc: {
            available_quantity: -this.issued_data,
            //   available_sqm: -issued_sqm,
            available_amount: -issued_amount,
          },
          $set: {
            issue_status: issues_for_status?.challan,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );

    if (update_other_goods_inventory?.matchedCount === 0) {
      throw new ApiError('Other Goods item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_other_goods_inventory?.acknowledged ||
      update_other_goods_inventory?.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update Other Goods inventory',
        StatusCodes?.BAD_REQUEST
      );
    }

    //update Face inventory invoice ediatble status
    const update_other_goods_inventory_invoice_editable_status =
      await othergoods_inventory_invoice_details?.updateOne(
        { _id: this.issued_item_details?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );
    if (
      update_other_goods_inventory_invoice_editable_status?.matchedCount === 0
    ) {
      throw new ApiError(
        'Fleece paper item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_other_goods_inventory_invoice_editable_status?.acknowledged ||
      update_other_goods_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Other Goods item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to plywood history model
    const add_issued_data_to_other_goods_history =
      await other_goods_history_model.create(
        [
          {
            issued_for_challan_id: result?._id,
            issue_status: issues_for_status?.challan,
            other_goods_item_id: this.issued_item_details?._id,
            issued_quantity: this.issued_data,
            // issued_sqm: issued_sqm,
            issued_amount: issued_amount,
            created_by: this.userDetails?._id,
            updated_by: this.userDetails?._id,
          },
        ],
        { session: this.session }
      );

    if (add_issued_data_to_other_goods_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to Other Goods history',
        StatusCodes.BAD_REQUEST
      );
    }
  }
  async FLITCHING_FACTORY() {
    const common_fields = {
      issued_from: this.issued_from,
      created_by: this.userDetails?._id,
      updated_by: this.userDetails?._id,
    };

    const updated_item_details = this.issued_item_details?.map((item) => ({
      ...common_fields,
      issued_item_details: item,
    }));
    const add_data_to_challan_result = await issue_for_challan_model.insertMany(
      updated_item_details,
      { session: this.session }
    );

    if (add_data_to_challan_result?.length === 0) {
      throw new ApiError(
        'Failed to issue data for challan.',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_flitching_done_item_details_issue_status =
      await flitching_done_model.updateMany(
        { _id: { $in: this.issued_item_id } },
        {
          $set: {
            issue_status: issues_for_status?.challan,
          },
        },
        { session: this.session }
      );

    if (update_flitching_done_item_details_issue_status?.matchedCount === 0) {
      throw new ApiError(
        'Flitching done Items not found.',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_flitching_done_item_details_issue_status?.acknowledged ||
      update_flitching_done_item_details_issue_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Flitching done items status',
        StatusCodes.BAD_REQUEST
      );
    }
  }

  async CROSSCUTTING() {
    const common_fields = {
      issued_from: this.issued_from,
      created_by: this.userDetails?._id,
      updated_by: this.userDetails?._id,
    };
    const updated_item_details = this.issued_item_details?.map((item) => ({
      ...common_fields,
      issued_item_details: item,
    }));
    const add_data_to_challan_result = await issue_for_challan_model.insertMany(
      updated_item_details,
      { session: this.session }
    );

    if (add_data_to_challan_result?.length === 0) {
      throw new ApiError(
        'Failed to issue data for challan.',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_flitching_done_item_details_issue_status =
      await crosscutting_done_model.updateMany(
        { _id: { $in: this.issued_item_id } },
        {
          $set: {
            issue_status: issues_for_status?.challan,
          },
        },
        { session: this.session }
      );

    if (update_flitching_done_item_details_issue_status?.matchedCount === 0) {
      throw new ApiError(
        'Flitching done Items not found.',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_flitching_done_item_details_issue_status?.acknowledged ||
      update_flitching_done_item_details_issue_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Flitching done items status',
        StatusCodes.BAD_REQUEST
      );
    }
  }

  async DRESSING_FACTORY() {
    const updated_body = {
      issued_from: item_issued_from?.dressing_factory,
      issued_item_details: this.issued_item_details,
      created_by: this.userDetails?._id,
      updated_by: this.userDetails?._id,
    };

    //add model name to insert data to create order using session
    const create_order_result = await issue_for_challan_model?.create(
      [updated_body],
      { session: this.session }
    );

    if (create_order_result?.length === 0) {
      throw new ApiError(
        'Failed to Add order details',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_dressing_done_item_issue_status =
      await dressing_done_items_model.updateOne(
        { _id: this.issued_item_details?._id },
        {
          $set: {
            issue_status: issues_for_status?.challan,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );

    if (update_dressing_done_item_issue_status?.matchedCount === 0) {
      throw new ApiError(
        'Dressing Done item not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_dressing_done_item_issue_status?.acknowledged ||
      update_dressing_done_item_issue_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Dressing Done item status',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_dressing_done_other_details_editable_status =
      await dressing_done_other_details_model?.updateOne(
        { _id: this.issued_item_details?.dressing_done_other_details_id },
        {
          $set: {
            isEditable: false,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );
    if (
      update_dressing_done_other_details_editable_status?.matchedCount === 0
    ) {
      throw new ApiError(
        'Dressing Done Other Detail not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_dressing_done_other_details_editable_status?.acknowledged ||
      update_dressing_done_other_details_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Dressing Done Item Other Details status',
        StatusCodes.BAD_REQUEST
      );
    }

    const create_dressing_history = await dressing_done_history_model.create(
      [
        {
          dressing_done_other_details_id:
            this.issued_item_details?.dressing_done_other_details_id,
          bundles: [this.issued_item_details?._id],
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (create_dressing_history?.length === 0) {
      throw new ApiError(
        'Failed to add dressing item to history',
        StatusCodes.BAD_REQUEST
      );
    }
  }
  async GROUPING_FACTORY() {
    // const maxNumber = await issue_for_challan_model.aggregate([
    //         {
    //           $group: {
    //             _id: null,
    //             max: {
    //               $max: '$sr_no',
    //             },
    //           },
    //         },
    //       ]);

    // const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;

    if (
      this.issued_item_details?.available_details?.no_of_leaves <
      this.issued_data
    ) {
      throw new ApiError('Available sheets are less than issued sheets');
    }
    const factor =
      this.issued_data /
      this.issued_item_details?.available_details?.no_of_leaves;
    const issued_sqm =
      this.issued_item_details?.available_details?.sqm * factor;
    const issued_amount =
      this.issued_item_details?.available_details?.amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_no_of_leaves: this.issued_data,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const [result] = await issue_for_challan_model.create(
      [
        {
          // sr_no: newMax,
          issued_from: this.issued_from,
          issued_item_details: updated_issued_item_details,
          created_by: this.userDetails?._id,
          updated_by: this.userDetails?._id,
        },
      ],
      { session: this.session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_grouping_done_items_details =
      await grouping_done_items_details_model.updateOne(
        { _id: this.issued_item_details._id },
        {
          $inc: {
            'available_details.no_of_leaves': -this.issued_data,
            'available_details.sqm': -issued_sqm,
            'available_details.amount': -issued_amount,
          },
          $set: {
            issue_status: issues_for_status?.challan,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );

    if (update_grouping_done_items_details?.matchedCount === 0) {
      throw new ApiError(
        'Grouping done item not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_grouping_done_items_details?.acknowledged ||
      update_grouping_done_items_details?.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update grouping done items',
        StatusCodes?.BAD_REQUEST
      );
    }

    //update Face inventory invoice ediatble status
    const update_grouping_done_details_editable_status =
      await grouping_done_details_model?.updateOne(
        { _id: this.issued_item_details?.grouping_done_other_details_id },
        {
          $set: {
            isEditable: false,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );
    if (update_grouping_done_details_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'Grouping done details not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_grouping_done_details_editable_status?.acknowledged ||
      update_grouping_done_details_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update Grouping done details status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to plywood history model
    const add_issued_data_to_grouping_done_history =
      await grouping_done_history_model.create(
        [
          {
            issued_for_challan_id: result?._id,
            issue_status: issues_for_status?.challan,
            ...this.issued_item_details,
            // grouping_done_other_details_id:this.issued_item_details?.grouping_done_other_details_id,
            grouping_done_item_id: this.issued_item_details?._id,
            no_of_leaves: this.issued_data,
            sqm: issued_sqm,
            amount: issued_amount,
            created_by: this.userDetails?._id,
            updated_by: this.userDetails?._id,
          },
        ],
        { session: this.session }
      );

    if (add_issued_data_to_grouping_done_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to grouping done history',
        StatusCodes.BAD_REQUEST
      );
    }
  }
}

export default IssueForChallan;
