import { isValidObjectId } from 'mongoose';
import ApiError from '../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../utils/constants.js';
import {
  issues_for_status,
  item_issued_from,
} from '../../../database/Utils/constants/constants';
import { log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import { flitch_inventory_items_model } from '../../../database/schema/inventory/Flitch/flitch.schema';
import {
  plywood_inventory_invoice_details,
  plywood_inventory_items_details,
} from '../../../database/schema/inventory/Plywood/plywood.schema.js';
import issue_for_challan_model from '../../../database/schema/challan/issue_for_challan/issue_for_challan.schema.js';
import plywood_history_model from '../../../database/schema/inventory/Plywood/plywood.history.schema.js';
import { veneer_inventory_invoice_model, veneer_inventory_items_model } from '../../../database/schema/inventory/venner/venner.schema.js';
import { mdf_inventory_invoice_details, mdf_inventory_items_details } from '../../../database/schema/inventory/mdf/mdf.schema.js';
import mdf_history_model from '../../../database/schema/inventory/mdf/mdf.history.schema.js';
import { face_inventory_invoice_details, face_inventory_items_details } from '../../../database/schema/inventory/face/face.schema.js';
import face_history_model from '../../../database/schema/inventory/face/face.history.schema.js';
import { core_inventory_invoice_details, core_inventory_items_details } from '../../../database/schema/inventory/core/core.schema.js';
import core_history_model from '../../../database/schema/inventory/core/core.history.schema.js';
import { fleece_inventory_invoice_modal, fleece_inventory_items_modal } from '../../../database/schema/inventory/fleece/fleece.schema.js';
import fleece_history_model from '../../../database/schema/inventory/fleece/fleece.history.schema.js';

//add for each inventory and factory item
const issued_from_map = {
  [item_issued_from?.log]: log_inventory_items_model,
  [item_issued_from?.flitch]: flitch_inventory_items_model,
  [item_issued_from?.plywood]: plywood_inventory_items_details,
  [item_issued_from?.veneer]: veneer_inventory_items_model,
  [item_issued_from?.mdf]: mdf_inventory_items_details,
  [item_issued_from?.face]: face_inventory_items_details,

};
class IssueForChallan {
  constructor(
    session,
    userDetails,
    issued_from,
    issued_item_id,
    issued_data
  ) {
    if (!isValidObjectId(issued_item_id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }
    this.session = session;
    this.userDetails = userDetails;
    this.issued_from = issued_from;
    this.issued_item_id = issued_item_id;
    this.issued_item_details = null;
    this.issued_data = issued_data || null;
  }

  //method to fetch issued item details based on issued item id
  async fetch_issued_item_details() {
    const issued_item_details = await issued_from_map[this.issued_from]
      ?.findOne({ _id: this.issued_item_id })
      .session(this.session);

    if (!issued_item_details) {
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
  async LOG() {}
  //add data from flitch inventory
  async FLITCH() {}
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
    const factor =
      this.issued_data / this.issued_item_details?.available_sheets;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const result = await issue_for_challan_model.create(
      {
        // sr_no: newMax,
        issued_from: this.issued_from,
        issued_item_details: updated_issued_item_details,
        created_by: this.userDetails?._id,
        updated_by: this.userDetails?._id,
      },
      { session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_plywood_inventory = plywood_inventory_items_details.updateOne(
      { _id: this.issued_item_id },
      {
        $inc: {
          available_sheets: -this.issued_data,
          available_sqm: -issued_sqm,
          available_amount: -issued_amount,
        },
        $set: {
            issue_status:issues_for_status?.challan,
            updated_by: this.userDetails?._id,
        }
      },
      { session }
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
            updated_by: userDetails?._id,
          },
        },
        { session }
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
        { session }
      );

    if (add_issued_data_to_plywood_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to plywood history',
        StatusCodes.BAD_REQUEST
      );
    }

    return result;
  }
  //add data from VENEER inventory
  async VENEER() {
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
    const factor =
      this.issued_data / this.issued_item_details?.available_sheets;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const result = await issue_for_challan_model.create(
      {
        // sr_no: newMax,
        issued_from: this.issued_from,
        issued_item_details: updated_issued_item_details,
        created_by: this.userDetails?._id,
        updated_by: this.userDetails?._id,
      },
      { session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_veneer_inventory = veneer_inventory_items_model.updateOne(
      { _id: this.issued_item_id },
      {
        $inc: {
          available_sheets: -this.issued_data,
          available_sqm: -issued_sqm,
          available_amount: -issued_amount,
        },
        $set:{
            issue_status:issues_for_status?.challan,
            updated_by: this.userDetails?._id,
        }
      },
      { session }
    );

    if (update_veneer_inventory?.matchedCount === 0) {
      throw new ApiError('Veneer item not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_veneer_inventory?.acknowledged ||
      update_veneer_inventory?.modifiedCount <= 0
    ) {
      throw new ApiError(
        'Failed to update Veneer inventory',
        StatusCodes?.BAD_REQUEST
      );
    }

    //update veneer inventory invoice ediatble status
    const update_veneer_inventory_invoice_editable_status =
      await veneer_inventory_invoice_model?.updateOne(
        { _id: this.issued_item_details?.invoice_id },
        {
          $set: {
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_veneer_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'Venner item invoice not found',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_veneer_inventory_invoice_editable_status?.acknowledged ||
      update_veneer_inventory_invoice_editable_status?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update veneer item invoice status',
        StatusCodes.BAD_REQUEST
      );
    }

    //add data to plywood history model
    // const add_issued_data_to_veneer_history =
    //   await plywood_history_model.create(
    //     [
    //       {
    //         issued_for_challan_id: result?._id,
    //         issue_status: issues_for_status?.challan,
    //         plywood_item_id: this.issued_item_details?._id,
    //         issued_sheets: this.issued_data,
    //         issued_sqm: issued_sqm,
    //         issued_amount: issued_amount,
    //         created_by: this.userDetails?._id,
    //         updated_by: this.userDetails?._id,
    //       },
    //     ],
    //     { session }
    //   );

    // if (add_issued_data_to_plywood_history?.length === 0) {
    //   throw new ApiError(
    //     'Failed to add data to plywood history',
    //     StatusCodes.BAD_REQUEST
    //   );
    // }

    return result;
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
    const factor =
      this.issued_data / this.issued_item_details?.available_sheets;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const result = await issue_for_challan_model.create(
      {
        // sr_no: newMax,
        issued_from: this.issued_from,
        issued_item_details: updated_issued_item_details,
        created_by: this.userDetails?._id,
        updated_by: this.userDetails?._id,
      },
      { session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_mdf_inventory = mdf_inventory_items_details.updateOne(
      { _id: this.issued_item_id },
      {
        $inc: {
          available_sheets: -this.issued_data,
          available_sqm: -issued_sqm,
          available_amount: -issued_amount,
        },
        $set: {
            issue_status:issues_for_status?.challan,
            updated_by: this.userDetails?._id,
        }
      },
      { session }
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
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_mdf_inventory_invoice_editable_status?.matchedCount === 0) {
      throw new ApiError(
        'MDF item invoice not found',
        StatusCodes.BAD_REQUEST
      );
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
    const add_issued_data_to_mdf_history =
      await mdf_history_model.create(
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
        { session }
      );

    if (add_issued_data_to_mdf_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to MDF history',
        StatusCodes.BAD_REQUEST
      );
    }

    return result;
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
    const factor =
      this.issued_data / this.issued_item_details?.available_sheets;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const result = await issue_for_challan_model.create(
      {
        // sr_no: newMax,
        issued_from: this.issued_from,
        issued_item_details: updated_issued_item_details,
        created_by: this.userDetails?._id,
        updated_by: this.userDetails?._id,
      },
      { session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_face_inventory = face_inventory_items_details.updateOne(
      { _id: this.issued_item_id },
      {
        $inc: {
          available_sheets: -this.issued_data,
          available_sqm: -issued_sqm,
          available_amount: -issued_amount,
        },
        $set: {
            issue_status:issues_for_status?.challan,
            updated_by: this.userDetails?._id,
        }
      },
      { session }
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
            updated_by: userDetails?._id,
          },
        },
        { session }
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
    const add_issued_data_to_face_history =
      await face_history_model.create(
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
        { session }
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
    const factor =
      this.issued_data / this.issued_item_details?.available_sheets;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const result = await issue_for_challan_model.create(
      {
        // sr_no: newMax,
        issued_from: this.issued_from,
        issued_item_details: updated_issued_item_details,
        created_by: this.userDetails?._id,
        updated_by: this.userDetails?._id,
      },
      { session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_core_inventory = core_inventory_items_details.updateOne(
      { _id: this.issued_item_id },
      {
        $inc: {
          available_sheets: -this.issued_data,
          available_sqm: -issued_sqm,
          available_amount: -issued_amount,
        },
        $set: {
            issue_status:issues_for_status?.challan,
            updated_by: this.userDetails?._id,
        }
      },
      { session }
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
            updated_by: userDetails?._id,
          },
        },
        { session }
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
    const add_issued_data_to_core_history =
      await core_history_model.create(
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
        { session }
      );

    if (add_issued_data_to_core_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to Core history',
        StatusCodes.BAD_REQUEST
      );
    }

    return result;
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
    const factor =
      this.issued_data / this.issued_item_details?.available_number_of_roll;
    const issued_sqm = this.issued_item_details?.available_sqm * factor;
    const issued_amount = this.issued_item_details?.available_amount * factor;
    const updated_issued_item_details = {
      ...this.issued_item_details,
      issued_sqm: issued_sqm,
      issued_amount: issued_amount,
    };

    const result = await issue_for_challan_model.create(
      {
        // sr_no: newMax,
        issued_from: this.issued_from,
        issued_item_details: updated_issued_item_details,
        created_by: this.userDetails?._id,
        updated_by: this.userDetails?._id,
      },
      { session }
    );

    if (!result) {
      throw new ApiError(
        'Failed to issue for challan',
        StatusCodes?.BAD_REQUEST
      );
    }

    const update_fleece_paper_inventory = fleece_inventory_items_modal.updateOne(
      { _id: this.issued_item_id },
      {
        $inc: {
          available_number_of_roll: -this.issued_data,
          available_sqm: -issued_sqm,
          available_amount: -issued_amount,
        },
        $set: {
            issue_status:issues_for_status?.challan,
            updated_by: this.userDetails?._id,
        }
      },
      { session }
    );

    if (update_fleece_paper_inventory?.matchedCount === 0) {
      throw new ApiError('Fleece paper item not found', StatusCodes.BAD_REQUEST);
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
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_fleece_paper_inventory_invoice_editable_status?.matchedCount === 0) {
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
        { session }
      );

    if (add_issued_data_to_fleece_paper_history?.length === 0) {
      throw new ApiError(
        'Failed to add data to Fleece paper history',
        StatusCodes.BAD_REQUEST
      );
    }

    return result;
  }
  //add data from OTHER GOODS inventory
  async OTHER_GOODS() {}
}

export default IssueForChallan;
