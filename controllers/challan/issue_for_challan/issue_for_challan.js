import { isValidObjectId } from 'mongoose';
import ApiError from '../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../utils/constants.js';
import { issues_for_status, item_issued_from } from '../../../database/Utils/constants/constants.js';
import { log_inventory_invoice_model, log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import { flitch_inventory_invoice_model, flitch_inventory_items_model } from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import issue_for_challan_model from '../../../database/schema/challan/issue_for_challan/issue_for_challan.schema.js';
import { veneer_inventory_invoice_model, veneer_inventory_items_model } from '../../../database/schema/inventory/venner/venner.schema.js';

//add for each inventory and factory item
const issued_from_map = {
  [item_issued_from?.log]: log_inventory_items_model,
  [item_issued_from?.flitch]: flitch_inventory_items_model,
};
class IssueForChallan {
  constructor(session, userDetails, issued_from, issued_item_ids) {
    if (!isValidObjectId(issued_item_id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }
    this.session = session;
    this.userDetails = userDetails;
    this.issued_from = issued_from;
    this.issued_item_id = issued_item_ids;
    this.issued_item_details = null;
  }

  //method to fetch issued item details based on issued item id
  async fetch_issued_item_details() {
    let issued_item_details;
    const issued_from_array = ["LOG", "FLITCH", "VENEER"]
    if (issued_from_array?.includes(this.issued_from)) {
      issued_item_details = await issued_from_map[this.issued_from]
        ?.find({ _id: { $in: this.issued_item_id } })
        .session(this.session);
    } else {
      issued_item_details = await issued_from_map[this.issued_from]
        ?.findOne({ _id: { $in: this.issued_item_id } })
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
    const issued_items_invoice_ids = this.issued_item_details?.map((i) => i?.invoice_id)
    const add_data_to_challan_result = await issue_for_challan_model.insertMany(
      updated_item_details,
      { session: this.session }
    );

    if (add_data_to_challan_result?.length === 0) {
      throw new ApiError("Failed to issue data for challan.", StatusCodes.BAD_REQUEST);
    };

    const update_log_item_details_issue_status = await log_inventory_items_model.updateMany({ _id: { $in: this.issued_item_id } }, {
      $set: {
        issue_status: issues_for_status?.challan
      }
    }, { session: this.session });

    if (update_log_item_details_issue_status?.matchedCount === 0) {
      throw new ApiError("Log Items not found.", StatusCodes.BAD_REQUEST)
    };

    if (!update_log_item_details_issue_status?.acknowledged || update_log_item_details_issue_status?.modifiedCount === 0) {
      throw new ApiError("Failed to update inventory items status", StatusCodes.BAD_REQUEST)
    };

    const update_inventory_invoice_editable_status_result = await log_inventory_invoice_model.updateMany({ _id: { $in: issued_items_invoice_ids } }, {
      $set: {
        isEditable: false
      }
    }, { session: this.session });

    if (update_inventory_invoice_editable_status_result?.matchedCount === 0) {
      throw new ApiError("Log items invoice not found.", StatusCodes.NOT_FOUND)
    };
    if (!update_inventory_invoice_editable_status_result?.acknowledged || update_inventory_invoice_editable_status_result.modifiedCount === 0) {
      throw new ApiError("Failed to update invoice status", StatusCodes.BAD_REQUEST)
    };

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
    const issued_items_invoice_ids = this.issued_item_details?.map((i) => i?.invoice_id)
    const add_data_to_challan_result = await issue_for_challan_model.insertMany(
      updated_item_details,
      { session: this.session }
    );

    if (add_data_to_challan_result?.length === 0) {
      throw new ApiError("Failed to issue data for challan.", StatusCodes.BAD_REQUEST);
    };

    const update_flitch_item_details_issue_status = await flitch_inventory_items_model.updateMany({ _id: { $in: this.issued_item_id } }, {
      $set: {
        issue_status: issues_for_status?.challan
      }
    }, { session: this.session });

    if (update_flitch_item_details_issue_status?.matchedCount === 0) {
      throw new ApiError("Flitch Items not found.", StatusCodes.BAD_REQUEST)
    };

    if (!update_flitch_item_details_issue_status?.acknowledged || update_flitch_item_details_issue_status?.modifiedCount === 0) {
      throw new ApiError("Failed to update inventory items status", StatusCodes.BAD_REQUEST)
    };

    const update_inventory_invoice_editable_status_result = await flitch_inventory_invoice_model.updateMany({ _id: { $in: issued_items_invoice_ids } }, {
      $set: {
        isEditable: false
      }
    }, { session: this.session });

    if (update_inventory_invoice_editable_status_result?.matchedCount === 0) {
      throw new ApiError("Flitch items invoice not found.", StatusCodes.NOT_FOUND)
    };
    if (!update_inventory_invoice_editable_status_result?.acknowledged || update_inventory_invoice_editable_status_result.modifiedCount === 0) {
      throw new ApiError("Failed to update invoice status", StatusCodes.BAD_REQUEST)
    };

  }
  //add data from Plywood inventory
  async PLYWOOD() { }
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
    const issued_items_invoice_ids = this.issued_item_details?.map((i) => i?.invoice_id)
    const add_data_to_challan_result = await issue_for_challan_model.insertMany(
      updated_item_details,
      { session: this.session }
    );

    if (add_data_to_challan_result?.length === 0) {
      throw new ApiError("Failed to issue data for challan.", StatusCodes.BAD_REQUEST);
    };

    const update_veneer_item_details_issue_status = await veneer_inventory_items_model.updateMany({ _id: { $in: this.issued_item_id } }, {
      $set: {
        issue_status: issues_for_status?.challan
      }
    }, { session: this.session });

    if (update_veneer_item_details_issue_status?.matchedCount === 0) {
      throw new ApiError("Flitch Items not found.", StatusCodes.BAD_REQUEST)
    };

    if (!update_veneer_item_details_issue_status?.acknowledged || update_veneer_item_details_issue_status?.modifiedCount === 0) {
      throw new ApiError("Failed to update inventory items status", StatusCodes.BAD_REQUEST)
    };

    const update_inventory_invoice_editable_status_result = await veneer_inventory_invoice_model.updateMany({ _id: { $in: issued_items_invoice_ids } }, {
      $set: {
        isEditable: false
      }
    }, { session: this.session });

    if (update_inventory_invoice_editable_status_result?.matchedCount === 0) {
      throw new ApiError("Venner items invoice not found.", StatusCodes.NOT_FOUND)
    };
    if (!update_inventory_invoice_editable_status_result?.acknowledged || update_inventory_invoice_editable_status_result.modifiedCount === 0) {
      throw new ApiError("Failed to update invoice status", StatusCodes.BAD_REQUEST)
    };
  }
  //add data from MDF inventory
  async MDF() { }
  //add data from Face inventory
  async FACE() { }
  //add data from CORE inventory
  async CORE() { }
  //add data from FLEECE PAPER inventory
  async FLEECE_PAPER() { }
  //add data from OTHER GOODS inventory
  async OTHER_GOODS() { }
}

export default IssueForChallan;
