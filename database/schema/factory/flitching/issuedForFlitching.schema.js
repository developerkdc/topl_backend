import mongoose from 'mongoose';
import invoice_details from '../../../Utils/invoiceDetails.schema.js';
import { issues_for_status } from '../../../Utils/constants/constants.js';
import { approval_status } from '../../../Utils/approvalStatus.schema.js';

const issues_for_flitching_details_schema = new mongoose.Schema(
  {
    log_inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'log_inventory_items_details',
      required: [true, 'Log Inventory Items Id is required'],
    },
    issue_for_crosscutting_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'issues_for_crosscutting',
      default: null,
    },
    crosscut_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'crosscutting_done',
      default: null,
    },
    item_sr_no: {
      type: Number,
      required: [true, 'Items Sr.No is required'],
    },
    supplier_item_name: {
      type: String,
      default: null,
    },
    supplier_log_no: {
      type: String,
      default: null,
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
    log_no: {
      type: String,
      required: [true, 'Log No is required'],
      trim: true,
      uppercase: true,
    },
    log_formula: {
      type: String,
      required: [true, 'Log formula is required'],
    },
    status: {
      type: String,
      enum: {
        values: [issues_for_status.flitching],
        message: `Invalid status {{VALUE}} Issue Status must either be one of ${issues_for_status.flitching}`,
      },
      default: issues_for_status.flitching,
    },
    // invoice_length: {
    //   type: Number,
    //   required: [true, "Invoice length is required"],
    // },
    // invoice_diameter: {
    //   type: Number,
    //   required: [true, "Invoice diameter is required"],
    // },
    // invoice_cmt: {
    //   type: Number,
    //   required: [true, "Invoice CMT is required"],
    // },
    // indian_cmt: {
    //   type: Number,
    //   required: [true, "Indian CMT is required"],
    // },
    length: {
      type: Number,
      required: [true, 'Physical length is required'],
    },
    diameter: {
      type: Number,
      required: [true, 'Physical diameter is required'],
    },
    cmt: {
      type: Number,
      required: [true, 'Physical CMT is required'],
    },
    flitching_completed: {
      type: Boolean,
      default: false,
    },
    available_quantity: {
      length: {
        type: Number,
        default: function () {
          return this.length;
        },
        required: [true, ' length is required'],
      },
      diameter: {
        type: Number,
        default: function () {
          return this.diameter;
        },
        required: [true, ' diameter is required'],
      },
      cmt: {
        type: Number,
        default: function () {
          return this.cmt;
        },
        required: [true, ' CMT is required'],
      },
      amount: {
        type: Number,
        default: function () {
          return this.amount;
        },
        required: [true, 'Amount is required'],
      },
      sqm_factor: {
        type: Number,
        default: 1,
      },
      expense_amount: {
        type: Number,
        default: function () {
          return this.expense_amount;
        },
        required: [true, 'Expense Amount is required'],
      },
    },
    approval_status: approval_status,
    // exchange_rate: {
    //   type: Number,
    //   default: null,
    // },
    // rate_in_currency: {
    //   type: Number,
    //   default: null,
    // },
    rate: {
      type: Number,
      required: [true, 'Rate in currency is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Rate in Inr is required'],
    },
    amount_factor: {
      type: Number,
      default: 0,
    },
    sqm_factor: {
      type: Number,
      default: 1,
    },
    expense_amount: {
      type: Number,
      default: 0,
    },
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Invoice Id is required'],
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      // required: [true, "Created By is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

issues_for_flitching_details_schema.index({ item_sr_no: 1 });
issues_for_flitching_details_schema.index(
  { item_sr_no: 1, invoice_id: 1, crosscut_done_id: 1 },
  { unique: true }
);

export const issues_for_flitching_model = mongoose.model(
  'issues_for_flitching',
  issues_for_flitching_details_schema
);

const issues_for_flitching_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const issues_for_flitching_view_model = mongoose.model(
  'issues_for_flitching_view',
  issues_for_flitching_view_schema
);

(async function () {
  await issues_for_flitching_view_model.createCollection({
    viewOn: 'issues_for_flitchings',
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: 'log_inventory_invoice_details',
          localField: 'invoice_id',
          foreignField: '_id',
          as: 'log_invoice_details',
        },
      },
      {
        $unwind: {
          path: '$log_invoice_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'created_user',
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







