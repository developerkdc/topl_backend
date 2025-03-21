import mongoose from 'mongoose';
import { approval_status } from '../../../Utils/approvalStatus.schema.js';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const flitchingSchema = new mongoose.Schema(
  {
    // sr_no: Number,
    issue_for_flitching_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'issues_for_flitching',
      required: [true, 'Issue for flitching Id is required'],
    },
    log_inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'log_inventory_items_details',
      required: [true, 'Log Inventory Items Id is required'],
    },
    crosscut_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'crosscutting_done',
      default: null,
    },
    machine_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'machine id is required'],
    },
    machine_name: {
      type: String,
      required: [true, 'machine name is required'],
      trim: true,
      uppercase: true,
    },
    color: {
      color_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      color_name: {
        type: String,
        default: null,
      },
    },
    // item_id: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   required: [true, "item id is required"],
    // },
    // item_name: {
    //   type: String,
    //   required: [true, "item name is required"],
    // },
    log_no: {
      type: String,
      required: [true, 'log number is required'],
      trim: true,
      uppercase: true,
    },
    flitch_code: {
      type: String,
      required: [true, 'flitch code is required'],
      trim: true,
      uppercase: true,
    },
    log_no_code: {
      type: String,
      required: [true, 'Log No Code  is required'],
      trim: true,
      uppercase: true,
    },
    flitch_formula: {
      type: String,
      required: [true, 'flitch flitch is required'],
    },
    length: {
      type: Number,
      required: [true, 'length is required'],
    },
    width1: {
      type: Number,
      required: [true, 'width1 is required'],
    },
    width2: {
      type: Number,
      required: [true, 'width2 is required'],
    },
    width3: {
      type: Number,
      required: [true, 'width3 is required'],
    },
    height: {
      type: Number,
      required: [true, 'height is required'],
    },
    flitch_cmt: {
      type: Number,
      required: [true, 'crosscut cmt is required'],
    },
    sqm_factor: {
      type: Number,
      required: [true, 'sqm factor is required'],
    },
    wastage_info: {
      wastage_sqm: {
        type: Number,
        required: [true, 'wastage sqm is required'],
      },
      wastage_length: {
        type: Number,
        required: [true, 'wastage length is required '],
      },
    },
    worker_details: {
      flitching_date: {
        type: Date,
        required: [true, 'flicthing date is required'],
      },
      workers: {
        type: Number,
        required: [true, 'workers are required'],
      },
      shift: {
        type: String,
        required: [true, 'shift is required'],
        trim: true,
        uppercase: true,
      },
      working_hours: {
        type: Number,
        required: [true, 'working hours are required'],
      },
      no_of_total_hours: {
        type: Number,
        required: [true, 'No.Total Hours is required'],
      },
    },
    per_cmt_cost: {
      type: Number,
      required: [true, 'per_cmt_cost is required'],
    },
    cost_amount: {
      type: Number,
      required: [true, 'cost_amount is required'],
    },
    required_hours: {
      type: Number,
      required: [true, 'required hours is required'],
    },
    required_workers: {
      type: Number,
      required: [true, 'required workers is required'],
    },
    expense_amount: {
      type: Number,
      required: [true, 'expense amount is required'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          issues_for_status?.slicing,
          issues_for_status?.slicing_peeling,
          issues_for_status?.order,
          issues_for_status?.chalan,
        ],
        message: `Invalid status {{VALUE}} Issue Status must either be one of ${issues_for_status?.slicing}, ${issues_for_status?.slicing_peeling}, ${issues_for_status?.order}}, ${issues_for_status?.chalan}`,
      },
      default: null,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    approval_status: approval_status,
    remarks: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'created by is required'],
    },
    deleted_at: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const flitching_done_model =
  mongoose.models.flitchings || mongoose.model('flitching', flitchingSchema);

const flitching_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const flitching_view_modal = mongoose.model(
  'flitching_done_view',
  flitching_view_schema
);

(async function () {
  await flitching_view_modal.createCollection({
    viewOn: 'flitchings',
    pipeline: [
      {
        $sort: {
          updatedAt: 1,
          _id: 1,
        },
      },
      {
        $lookup: {
          from: 'issues_for_flitchings',
          localField: 'issue_for_flitching_id',
          foreignField: '_id',
          as: 'issueForFlitchingDetails',
        },
      },
      {
        $unwind: {
          path: '$issueForFlitchingDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'created_user',
          pipeline: [
            {
              $project: {
                user_name: 1,
                user_type: 1,
                dept_name: 1,
                first_name: 1,
                last_name: 1,
                email_id: 1,
                mobile_no: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$created_user',
          preserveNullAndEmptyArrays: true,
        },
      },
    ],
  });
})();
