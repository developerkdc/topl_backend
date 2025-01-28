import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const issue_for_slicing_schema = new mongoose.Schema(
  {
    flitch_inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'flitch_inventory_item_details',
      required: [true, 'Flitch Inventory Item ID is required'],
    },
    flitching_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    inward_sr_no: {
      type: Number,
      // unique: true,
      required: [true, 'Inward Sr.No is required. '],
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Invoice Id is required'],
    },
    inward_date: {
      type: Date,
      default: Date.now,
      required: [true, 'Inward Date is required.'],
    },
    invoice_date: {
      type: Date,
      default: Date.now,
      required: [true, 'Invoice Date is required.'],
    },
    invoice_no: {
      type: String,
      // unique: true,
      trim: true,
      uppercase: true,
      required: [true, 'Invoice No is required.'],
    },
    item_sr_no: {
      type: Number,
      required: [true, 'Item Sr.No is required'],
    },

    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items id is required'],
    },
    item_name: {
      type: String,
      required: [true, 'Item Name is required'],
      trim: true,
      uppercase: true,
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items Sub-Category Id is required'],
    },
    item_sub_category_name: {
      type: String,
      required: [true, 'Item Sub-Category Name is required'],
      trim: true,
      uppercase: true,
    },
    color: {
      color_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        // required: [true, 'color id is required'],
      },
      color_name: {
        type: String,
        default: null,
        // required: [true, 'color name is required'],
      },
    },
    flitch_formula: {
      type: String,
      required: [true, 'Flitch Formula is required'],
    },
    log_no: {
      type: String,
      required: [true, 'Log Number is required'],
      trim: true,
      uppercase: true,
    },
    log_no_code: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    flitch_code: {
      type: String,
      required: [true, 'Log Number is required'],
      trim: true,
      uppercase: true,
    },
    length: {
      type: Number,
      required: [true, 'Length is required'],
    },
    width1: {
      type: Number,
      required: [true, 'Width1 is required'],
    },
    width2: {
      type: Number,
      required: [true, 'Width2 is required'],
    },
    width3: {
      type: Number,
      required: [true, 'Width3 is required'],
    },
    height: {
      type: Number,
      required: [true, 'Height is required'],
    },
    cmt: {
      type: Number,
      required: [true, 'CMT is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    expense_amount: {
      type: Number,
      default: 0,
    },

    amount_factor: {
      type: Number,
      default: 1,
    },
    issued_from: {
      type: String,
      uppercase: true,
      required: [true, 'Issued from is required'],
      enum: {
        values: [
          issues_for_status?.flitching,
          issues_for_status?.flitching_done,
        ],
        message: `Invalid issued from type {{VALUE}} it should be one of the ${issues_for_status.flitching}, ${issues_for_status.flitching_done} `,
      },
    },
    is_slicing_completed: {
      type: Boolean,
      default: false,
    },
    is_peeling_done: {
      type: Boolean,
      default: false,
    },

    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By is required'],
    },
  },
  { timestamps: true }
);

issue_for_slicing_schema.index({ item_sr_no: 1 });
issue_for_slicing_schema.index({ flitching_done_id: 1 });

export const issued_for_slicing_model = mongoose.model(
  'issued_for_slicings',
  issue_for_slicing_schema,
  'issued_for_slicings'
);

const issued_for_slicing_view_schema = new mongoose.Schema(
  {},
  { strict: false, autoCreate: false, autoIndex: false }
);

export const issued_for_slicing_view_model = mongoose.model(
  'issued_for_slicing_view',
  issued_for_slicing_view_schema,
  'issued_for_slicing_view'
);

(async function () {
  await issued_for_slicing_view_model.createCollection({
    viewOn: 'issued_for_slicings',
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: 'flitch_inventory_item_details',
          localField: 'flitch_inventory_item_id',
          foreignField: '_id',
          as: 'flitch_item_details',
        },
      },
      {
        $lookup: {
          from: 'flitchings',
          localField: 'flitching_done_id',
          foreignField: '_id',
          as: 'flitching_done_item_details',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
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
          as: 'created_user_details',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'updated_by',
          foreignField: '_id',
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
          as: 'updated_user_details',
        },
      },
      {
        $unwind: {
          path: '$flitch_item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$flitching_done_item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$created_user_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$updated_user_details',
          preserveNullAndEmptyArrays: true,
        },
      },
    ],
  });
})();
