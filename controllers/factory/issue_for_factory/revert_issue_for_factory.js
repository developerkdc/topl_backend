import mongoose, { isValidObjectId } from 'mongoose';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import { issue_for_cnc_model } from '../../../database/schema/factory/cnc/issue_for_cnc/issue_for_cnc.schema.js';
import {
  item_issued_for,
  item_issued_from,
} from '../../../database/Utils/constants/constants.js';
import { cnc_done_details_model } from '../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';
import { bunito_done_details_model } from '../../../database/schema/factory/bunito/bunito_done/bunito_done.schema.js';
import { issue_for_bunito_model } from '../../../database/schema/factory/bunito/issue_for_bunito/issue_for_bunito.schema.js';
import { canvas_done_details_model } from '../../../database/schema/factory/canvas/canvas_done/canvas_done.schema.js';
import { issue_for_canvas_model } from '../../../database/schema/factory/canvas/issue_for_canvas/issue_for_canvas.schema.js';

//item issued from model map
const issued_from_factory_model_map = {
  [item_issued_from?.pressing_factory]: 'pressing_factory model',
  [item_issued_from?.cnc_factory]: cnc_done_details_model,
  [item_issued_from?.bunito_factory]: bunito_done_details_model,
  [item_issued_from?.canvas_factory]: canvas_done_details_model,
};

//revert from factory map
const revert_from_factory_model_map = {
  [item_issued_from?.pressing_factory]: 'pressing_factory model',
  [item_issued_from?.cnc_factory]: issue_for_cnc_model,
  [item_issued_from?.bunito_factory]: issue_for_bunito_model,
  [item_issued_from?.canvas_factory]: issue_for_canvas_model,
};
//revert from factory history map
const issued_from_factory_history_model_map = {
  [item_issued_from?.pressing_factory]: 'pressing_factory model',
  [item_issued_from?.cnc_factory]: issue_for_cnc_model,
  [item_issued_from?.bunito_factory]: issue_for_bunito_model,
  [item_issued_from?.canvas_factory]: issue_for_canvas_model,
};

class Revert_Issued_Factory_Item {
  constructor(id, session, userDetails, revert_from_factory) {
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
    }
    this.id = id;
    this.session = session;
    this.userDetails = userDetails;
    this.revert_from_factory = revert_from_factory;
    this.issued_item_details = null;
  }

  async fetch_issued_data() {
    const issue_item_details = await revert_from_factory_model_map[
      this.revert_from_factory
    ]
      ?.findById(this.id)
      .lean()
      .session(this.session);
    if (!issue_item_details) {
      throw new ApiError(
        `${this.revert_from_factory} details not found.`,
        StatusCodes.NOT_FOUND
      );
    }

    this.issued_item_details = issue_item_details;
    return issue_item_details;
  }

  async revert_item_from_factory() {
    await this.fetch_issued_data();

    const revert_from_factory_result = await revert_from_factory_model_map[
      this.revert_from_factory
    ]?.deleteOne({ _id: this.id }, { session: this.session });

    if (
      !revert_from_factory_result.acknowledged ||
      revert_from_factory_result?.deletedCount === 0
    ) {
      throw new ApiError(
        `Failed to delete issued data.`,
        StatusCodes.BAD_REQUEST
      );
    }

    const update_issued_factory_details_result =
      await issued_from_factory_model_map[
        this.issued_item_details?.issued_from
      ]?.findOneAndUpdate(
        { _id: this.issued_item_details?.issued_from_id },
        {
          $inc: {
            'available_details.sqm':
              this.issued_item_details?.available_details?.sqm,
            'available_details.no_of_sheets':
              this.issued_item_details?.available_details?.no_of_sheets,
            'available_details.amount':
              this.issued_item_details?.available_details?.amount,
          },
          $set: {
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );

    if (!update_issued_factory_details_result) {
      throw new ApiError(
        'Failed to update issued from factory details',
        StatusCodes.BAD_REQUEST
      );
    }

    const is_item_editable = await issued_from_factory_model_map[
      this.issued_item_details?.issued_from
    ]
      ?.findById(this.issued_item_details?.issued_from_id)
      .session(this.session);

    if (
      is_item_editable?.available_details?.no_of_sheets ===
        is_item_editable?.no_of_sheets &&
      is_item_editable?.issue_status === null
    ) {
      const update_editable_status_result = await issued_from_factory_model_map[
        this.issued_item_details?.issued_from
      ]?.updateOne(
        { _id: this.issued_item_details?.issued_from_id },
        {
          $set: {
            isEditable: true,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );

      if (update_editable_status_result?.matchedCount === 0) {
        throw new ApiError(
          'Issued item details not found.',
          StatusCodes.NOT_FOUND
        );
      }
      if (
        !update_editable_status_result?.acknowledged ||
        update_editable_status_result?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update editable status from issued item details',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    const delete_factory_history_result =
      await issued_from_factory_history_model_map[
        this.issued_item_details?.issued_from
      ]?.deleteOne(
        { item_issued_for_id: this.issued_item_details?._id },
        { session: this.session }
      );
    if (
      !delete_factory_history_result?.acknowledged ||
      delete_factory_history_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to remove details from issued factory history',
        StatusCodes.BAD_REQUEST
      );
    }
  }
}

export default Revert_Issued_Factory_Item;
