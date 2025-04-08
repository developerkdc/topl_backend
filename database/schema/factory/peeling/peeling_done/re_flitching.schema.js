import mongoose from 'mongoose';
import { issues_for_status } from '../../../../Utils/constants/constants.js';

const re_flitching_other_details_schema = new mongoose.Schema(
  {
    issue_for_peeling_available_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'issue for pelling available id is required'],
    },
    flitching_date: {
      type: Date,
      required: [true, 'flitching Date is required'],
    },
    no_of_workers: {
      type: Number,
      required: [true, 'No.of Workers is required '],
    },
    no_of_working_hours: {
      type: Number,
      required: [true, 'No. of Working hours is required'],
    },
    no_of_total_hours: {
      type: Number,
      required: [true, 'No. of Total hours is required'],
    },
    shift: {
      type: String,
      required: [true, 'Shift is required'],
      trim: true,
      uppercase: true,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    total_amount: {
      type: Number,
      required: [true, 'Total Amount is required'],
    },
    wastage_consumed_total_amount: {
      type: Number,
      default: 0,
    },
    final_amount: {
      type: Number,
      default: function () {
        return this.total_amount + this.wastage_consumed_total_amount;
      },
    },
    remark: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By Id is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By Id is required'],
    },
  },
  { timestamps: true }
);

re_flitching_other_details_schema.index(
  { issue_for_peeling_available_id: 1 },
  { unique: true }
);
export const re_flitching_other_details_model = mongoose.model(
  're_flitching_other_details',
  re_flitching_other_details_schema,
  're_flitching_other_details'
);

const re_flitching_items_schema = new mongoose.Schema(
  {
    re_flitching_other_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 're flitching other details id is required'],
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items id is required'],
    },
    item_sr_no: {
      type: Number,
      required: [true, 'Invoice Sr No is required'],
    },
    item_name: {
      type: String,
      required: [true, 'Item Name is required'],
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
        uppercase: true,
        trim: true,
        default: null,
      },
    },
    item_sub_category_name: {
      type: String,
      required: [true, 'item_sub_category_name is required'],
      trim: true,
      uppercase: true,
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'item_sub_category_id is required'],
    },
    log_no: {
      type: String,
      required: [true, 'Log Number is required'],
      trim: true,
      uppercase: true,
    },
    flitch_code: {
      type: String,
      required: [true, 'Flitch code is required'],
      trim: true,
      uppercase: true,
    },
    log_no_code: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    flitch_formula: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'BF',
    },
    length: {
      type: Number,
      required: [true, 'Length is required'],
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
    // height: {
    //   type: Number,
    //   required: [true, 'height is required'],
    // },
    cmt: {
      type: Number,
      required: [true, 'Flitch Cmt is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Rate in Inr is required'],
    },
    amount_factor: {
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
    issue_status: {
      type: String,
      enum: {
        values: [issues_for_status?.slicing],
        message: `Invalid status {{VALUE}} Issue Status must either be one of ${issues_for_status?.slicing}`,
      },
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By Id is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By Id is required'],
    },
  },
  {
    timestamps: true,
  }
);

export const re_flitching_items_model = mongoose.model(
  're_flitching_items',
  re_flitching_items_schema,
  're_flitching_items'
);
