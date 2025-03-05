import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const grouping_done_details_schema = new mongoose.Schema(
  {
    grouping_done_date: {
      type: Date,
      required: [true, 'grouping Date is required'],
    },
    issue_for_grouping_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issues for grouping id is required'],
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
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
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

export const grouping_done_details_model = mongoose.model(
  'grouping_done_details',
  grouping_done_details_schema,
  'grouping_done_details'
);

const grouping_done_items_details_schema = new mongoose.Schema(
  {
    grouping_done_other_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Process done id is required'],
    },
    group_no: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Group No is required'],
    },
    photo_no: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Photo No is required'],
    },
    photo_no_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Photo No ID is required'],
    },
    item_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Item Name is required'],
    },
    item_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Item Name ID is required'],
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
    log_no_code: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Log No Code is required'],
    },
    length: {
      type: Number,
      default: 0,
      required: [true, 'Length is required'],
    },
    width: {
      type: Number,
      default: 0,
      required: [true, 'Width is required'],
    },
    height: {
      type: Number,
      default: 0,
      required: [true, 'Height is required'],
    },
    thickness: {
      type: Number,
      default: 0,
      required: [true, 'Thickness is required'],
    },
    no_of_leaves: {
      type: Number,
      default: 0,
      required: [true, 'No of leaves is required'],
    },
    sqm: {
      type: Number,
      default: 0,
      required: [true, 'SQM is required'],
    },
    available_details: {
      no_of_leaves: {
        type: Number,
        default: function () {
          return this.no_of_leaves;
        },
      },
      sqm: {
        type: Number,
        default: function () {
          return this.sqm;
        },
      },
    },
    pallet_number: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'pallet_number is required'],
    },
    process_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'process id is required'],
    },
    process_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'process name is required'],
    },
    cut_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    cut_name: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
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
    character_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    character_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    pattern_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    pattern_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    series_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Series ID is required'],
    },
    series_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Series Name is required'],
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Grade ID is required'],
    },
    grade_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Grade Name is required'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          issues_for_status.order,
          issues_for_status.tapping_stock,
          issues_for_status.tapping_sample,
        ],
        message: `Invalid type {{VALUE}} it must be one of the ${(issues_for_status.order, issues_for_status.tapping_stock, issues_for_status.tapping_sample)}`,
      },
      default: null,
    },
    is_damaged: {
      type: Boolean,
      default: false,
    },
    amount: {
      type: Number,
      default: 0,
      required: [true, 'Item Amount is required'],
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
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
    updated_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Updated By is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

grouping_done_items_details_schema.index({ group_no: -1 }, { unique: true });
grouping_done_items_details_schema.index(
  { group_no: -1, pallet_number: -1 },
  { unique: true }
);

export const grouping_done_items_details_model = mongoose.model(
  'grouping_done_items_details',
  grouping_done_items_details_schema,
  'grouping_done_items_details'
);
