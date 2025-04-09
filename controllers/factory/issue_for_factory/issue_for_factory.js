import mongoose, { isValidObjectId } from 'mongoose';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import issue_for_cnc_model from '../../../database/schema/factory/cnc/issue_for_cnc/issue_for_cnc.schema.js';
import {
  item_issued_for,
  item_issued_from,
} from '../../../database/Utils/constants/constants.js';
import { cnc_done_details_model } from '../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';

//item issued from model map
const issued_from_factory_model_map = {
  [item_issued_from?.pressing_factory]: 'pressing_factory model',
  [item_issued_from?.cnc_factory]: cnc_done_details_model,
};

//add to factory model map
const add_to_factory_map = {
  [item_issued_from?.pressing_factory]: 'pressing_factory model',
  [item_issued_from?.cnc_factory]: issue_for_cnc_model,
};

//history model map
const add_to_factory_history_map = {
  [item_issued_from?.pressing_factory]: 'pressing_factory model',
  [item_issued_from?.cnc_factory]: issue_for_cnc_model,
};
class Issue_For_Factory {
  constructor(
    session,
    userDetails,
    issued_from,
    issue_details,
    add_to_factory,
    issued_for
  ) {
    if (!isValidObjectId(issue_details?.issued_from_id)) {
      throw new ApiError('Invalid Issued from ID', StatusCodes?.BAD_REQUEST);
    }
    this.session = session;
    this.userDetails = userDetails;
    this.issued_from = issued_from;
    this.issued_for = issued_for;
    this.issue_details = issue_details;
    this.issued_from_id = issue_details?.issued_from_id;
    this.issued_from_details = null;
    this.add_to_factory = add_to_factory;
  }

  async fetch_issue_from_data() {
    const issued_from_data = await issued_from_factory_model_map[
      this.issued_from
    ]
      ?.findById(this.issued_from_id)
      .session(this.session);
    if (!issued_from_data) {
      throw new ApiError(
        `${this?.issued_from} Done data not found.`,
        StatusCodes?.NOT_FOUND
      );
    }

    this.issued_from_details = issued_from_data;
    return issued_from_data;
  }

  async add_issued_items_to_factory() {
    try {
      await this.fetch_issue_from_data();

      const add_to_factory_model = add_to_factory_map[this.add_to_factory];
      if (!add_to_factory_model) {
        throw new ApiError('Invalid Factory Name.', StatusCodes.BAD_REQUEST);
      }

      const [max_sr_no] = await add_to_factory_model.aggregate([
        {
          $group: {
            _id: null,
            max_sr_no: {
              $max: '$sr_no',
            },
          },
        },
      ]);

      //add issue data to the factory
      const [add_data_to_factory_result] = await add_to_factory_model.create(
        [
          {
            sr_no: max_sr_no ? max_sr_no?.max_sr_no + 1 : 1,
            order_id:
              this.issued_for === item_issued_for?.order
                ? this.issue_details?.order_id
                : null,
            order_item_id:
              this.issued_for === item_issued_for?.order
                ? this.issue_details?.order_item_id
                : null,
            issued_from_id: this.issued_from_details?._id,
            issued_from: this.issued_from,
            issued_for: this.issued_for,
            issued_sheets: this.issue_details?.issued_sheets,
            issued_amount: this.issue_details?.issued_amount,
            issued_sqm: this.issue_details?.issued_sqm,
            created_by: this.userDetails?._id,
            updated_by: this.userDetails?._id,
          },
        ],
        { session: this.session }
      );

      if (!add_data_to_factory_result) {
        throw new ApiError('Failed to issue details', StatusCodes.BAD_REQUEST);
      }

      //update available_details and issue_status from particular factory
      const update_factory_details_result = await issued_from_factory_model_map[
        this.issued_from
      ]?.updateOne(
        { _id: this.issued_from_details?._id },
        {
          $inc: {
            'available_details.no_of_sheets':
              -this.issue_details?.issued_sheets,
            'available_details.amount': -this.issue_details?.issued_amount,
            'available_details.sqm': -this.issue_details?.issued_sqm,
          },
          $set: {
            isEditable: false,
            updated_by: this.userDetails?._id,
          },
        },
        { session: this.session }
      );
      if (update_factory_details_result?.matchedCount === 0) {
        throw new ApiError(
          `${this?.issued_from?.split('_')?.join(' ')?.toUpperCase()} Done data not found.`,
          StatusCodes.NOT_FOUND
        );
      }

      if (
        !update_factory_details_result?.acknowledged ||
        update_factory_details_result?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update available details',
          StatusCodes.BAD_REQUEST
        );
      }

      //creating history for the issued item
      const [add_data_to_factory_history] = await add_to_factory_history_map[
        this.issued_from
      ]?.create(
        [
          {
            issued_for: this.issued_for,
            issued_sheets: this.issue_details?.issued_sheets,
            issued_amount: this.issue_details?.issued_amount,
            issued_sqm: this.issue_details?.issued_sqm,
            issued_item_id: this.issued_from_details?._id,
            created_by: this.userDetails?._id,
            updated_by: this.userDetails?._id,
            issue_status: this.add_to_factory,
          },
        ],
        { session: this.session }
      );

      if (!add_data_to_factory_history) {
        throw new ApiError('Failed to create history', StatusCodes.BAD_REQUEST);
      }
    } catch (error) {
      throw error;
    }
  }
}

export default Issue_For_Factory;
