import mongoose from 'mongoose';
import { issues_for_status } from '../../../../Utils/constants/constants.js';

const dressing_done_other_details_schema = new mongoose.Schema(
  {
    slicing_done_other_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    peeling_done_other_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    dressing_date: {
      type: Date,
      required: [true, 'Dressing date is required'],
    },
    shift: {
      type: String,
      required: [true, 'Shift is required.'],
      trim: true,
      uppercase: true,
    },
    no_of_workers: {
      type: Number,
      required: [true, 'No. of Workers is required.'],
    },
    no_of_working_hours: {
      type: Number,
      required: [true, 'No. of Working hours.'],
    },
    no_of_total_hours: {
      type: Number,
      required: [true, 'No of total hours is required.'],
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    remark: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created by is required.'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated by is required.'],
    },
  },
  { timestamps: true }
);

dressing_done_other_details_schema.index({ isEditable: 1 });

export const dressing_done_other_details_model = mongoose.model(
  'dressing_done_other_details',
  dressing_done_other_details_schema,
  'dressing_done_other_details'
);

const dressing_done_items_schema = new mongoose.Schema(
  {
    dressing_done_other_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Dressing Done other details id is required.'],
    },
    log_no_code: {
      type: String,
      required: [true, 'Log No. Code is required'],
      trim: true,
      uppercase: true,
    },
    item_name: {
      type: String,
      required: [true, 'Item Name is required.'],
      trim: true,
      uppercase: true,
    },
    item_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Item Name ID is required.'],
    },
    item_sub_category_name: {
      type: String,
      required: [true, 'Item SubCategory Name is required.'],
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Item SubCategory ID is required'],
    },
    pallet_number: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'Pallet Number is required.'],
    },
    bundle_number: {
      type: Number,
      required: [true, 'Bundle Number is required.'],
    },
    length: {
      type: Number,
      required: [true, 'Length is required'],
    },
    width: {
      type: Number,
      required: [true, 'Width is required'],
    },
    thickness: {
      type: Number,
      required: [true, 'Thickness is required.'],
    },
    no_of_leaves: {
      type: Number,
      required: [true, 'No of Leaves is required'],
    },
    sqm: {
      type: Number,
      required: [true, 'SQM is required'],
    },
    volume: {
      type: Number,
      required: [true, 'Volume is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    character_name: {
      type: String,
      required: [true, 'Character Name is required.'],
      uppercase: true,
      trim: true,
    },
    character_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Charcter ID is required.'],
    },
    pattern_name: {
      type: String,
      required: [true, 'Pattern Name is required.'],
    },
    pattern_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Pattern ID is required'],
    },
    series_name: {
      type: String,
      required: [true, 'Series Name is required.'],
    },
    series_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Series ID is required'],
    },
    grade_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Grade Name is required.'],
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Grade ID is required.'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          issues_for_status.grouping,
          issues_for_status.order,
          issues_for_status.smoking_dying,
        ],
        message: `Invalid Issue Status -> {{VALUE}} it must be one of the ${issues_for_status.grouping}, ${issues_for_status.order}, ${issues_for_status.smoking_dying} `,
      },
      default: null,
    },
    amount_factor: {
      type: Number,
      default: 1,
    },
    expense_amount: {
      type: Number,
      default: 0,
    },
    is_dressing_done: {
      type: Boolean,
      default: false,
    },
    remark: {
      type: String,
      default: null,
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

dressing_done_items_schema.index({ log_no_code: 1 });
dressing_done_items_schema.index({ pallet_number: 1 });
dressing_done_items_schema.index(
  { pallet_number: 1, bundle_number: 1 },
  { unique: true }
);
dressing_done_items_schema.index({ item_name: 1 });
dressing_done_items_schema.index({ item_sub_category_name: 1 });

export const dressing_done_items_model = mongoose.model(
  'dressing_done_items',
  dressing_done_items_schema,
  'dressing_done_items'
);
