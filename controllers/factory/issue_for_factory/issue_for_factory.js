import { isValidObjectId } from 'mongoose';
import { cnc_done_details_model } from '../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';
import { issue_for_cnc_model } from '../../../database/schema/factory/cnc/issue_for_cnc/issue_for_cnc.schema.js';
import {
  item_issued_for,
  item_issued_from,
} from '../../../database/Utils/constants/constants.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
// import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { bunito_done_details_model } from '../../../database/schema/factory/bunito/bunito_done/bunito_done.schema.js';
import bunito_history_model from '../../../database/schema/factory/bunito/bunito_history/bunito.history.schema.js';
import { issue_for_bunito_model } from '../../../database/schema/factory/bunito/issue_for_bunito/issue_for_bunito.schema.js';
import { canvas_done_details_model } from '../../../database/schema/factory/canvas/canvas_done/canvas_done.schema.js';
import canvas_history_model from '../../../database/schema/factory/canvas/canvas_history/canvas.history.schema.js';
import { issue_for_canvas_model } from '../../../database/schema/factory/canvas/issue_for_canvas/issue_for_canvas.schema.js';
import cnc_history_model from '../../../database/schema/factory/cnc/cnc_history/cnc.history.schema.js';
import { color_done_details_model } from '../../../database/schema/factory/colour/colour_done/colour_done.schema.js';
import color_history_model from '../../../database/schema/factory/colour/colour_history/colour_history.schema.js';
import { issue_for_color_model } from '../../../database/schema/factory/colour/issue_for_colour/issue_for_colour.schema.js';
import { issue_for_polishing_model } from '../../../database/schema/factory/polishing/issue_for_polishing/issue_for_polishing.schema.js';
import { polishing_done_details_model } from '../../../database/schema/factory/polishing/polishing_done/polishing_done.schema.js';
import polishing_history_model from '../../../database/schema/factory/polishing/polishing_history/polishing.history.schema.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';

//item issued from model map
const issued_from_factory_model_map = {
  [item_issued_from?.pressing_factory]: pressing_done_details_model,
  [item_issued_from?.cnc_factory]: cnc_done_details_model,
  [item_issued_from?.bunito_factory]: bunito_done_details_model,
  [item_issued_from?.color_factory]: color_done_details_model,
  [item_issued_from?.canvas_factory]: canvas_done_details_model,
  [item_issued_from?.polishing_factory]: polishing_done_details_model,
};

//add to factory model map
const add_to_factory_map = {
  [item_issued_from?.pressing_factory]: issues_for_pressing_model,
  [item_issued_from?.cnc_factory]: issue_for_cnc_model,
  [item_issued_from?.bunito_factory]: issue_for_bunito_model,
  [item_issued_from?.color_factory]: issue_for_color_model,
  [item_issued_from?.polishing_factory]: issue_for_polishing_model,
  [item_issued_from?.canvas_factory]: issue_for_canvas_model,
};

//history model map
const add_to_factory_history_map = {
  [item_issued_from?.pressing_factory]: pressing_done_history_model,
  [item_issued_from?.cnc_factory]: cnc_history_model,
  [item_issued_from?.bunito_factory]: bunito_history_model,
  [item_issued_from?.canvas_factory]: canvas_history_model,
  [item_issued_from?.polishing_factory]: polishing_history_model,
  [item_issued_from?.color_factory]: color_history_model,
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

      const [max_sr_no] = await add_to_factory_model
        .aggregate([
          {
            $group: {
              _id: null,
              max_sr_no: {
                $max: '$sr_no',
              },
            },
          },
        ])
        .session(this.session);
      const new_sr_no = max_sr_no ? max_sr_no?.max_sr_no + 1 : 1;
      //add issue data to the factory
      const [add_data_to_factory_result] = await add_to_factory_model.create(
        [
          {
            sr_no: new_sr_no,
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
            pressing_details_id:
              this.issued_from === item_issued_from?.pressing_factory
                ? this.issued_from_details?._id
                : this?.issued_from_details?.pressing_details_id,
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
            'available_details.no_of_sheets': Number(
              -this.issue_details?.issued_sheets
            )?.toFixed(2),
            'available_details.amount': Number(
              -this.issue_details?.issued_amount
            )?.toFixed(2),
            'available_details.sqm': Number(
              -this.issue_details?.issued_sqm
            )?.toFixed(3),
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

      let issued_item_issue_id = null;
      let issue_for_field_key = null;

      if (this.issued_from !== item_issued_from?.pressing_factory) {
        const factory_key = this.issued_from?.toLowerCase();
        issue_for_field_key = `issue_for_${factory_key}_id`;

        issued_item_issue_id = this.issued_from_details?.[issue_for_field_key];
        if (!issued_item_issue_id) {
          throw new ApiError(
            `${issue_for_field_key} not found in issued_from_details.`,
            StatusCodes.BAD_REQUEST
          );
        }
      }

      const [max_histroy_sr_no] = await add_to_factory_history_map[
        this.issued_from
      ]
        .aggregate([
          {
            $group: {
              _id: null,
              max_sr_no: {
                $max: '$sr_no',
              },
            },
          },
        ])
        .session(this.session);
      const history_payload = {
        sr_no: max_histroy_sr_no ? max_histroy_sr_no?.max_sr_no + 1 : 1,
        issued_for_id: add_data_to_factory_result?._id,
        issued_for: this.issued_for,
        no_of_sheets: this.issue_details?.issued_sheets,
        amount: this.issue_details?.issued_amount,
        sqm: this.issue_details?.issued_sqm,
        issued_item_id: this.issued_from_details?._id,
        created_by: this.userDetails?._id,
        updated_by: this.userDetails?._id,
        issue_status: this.add_to_factory,
        order_id: this.issue_details?.order_id,
        order_item_id: this.issue_details?.order_item_id,
        // order_category,
      };
      console.log(history_payload);

      if (issue_for_field_key && issued_item_issue_id) {
        history_payload[issue_for_field_key] = issued_item_issue_id;
      }
      //creating history for the issued item
      const [add_data_to_factory_history] = await add_to_factory_history_map[
        this.issued_from
      ]?.create([history_payload], { session: this.session });

      if (!add_data_to_factory_history) {
        throw new ApiError('Failed to create history', StatusCodes.BAD_REQUEST);
      }
    } catch (error) {
      throw error;
    }
  }
}

export default Issue_For_Factory;
