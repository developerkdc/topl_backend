import mongoose from 'mongoose';
import { issues_for_status, item_issued_for, order_category } from '../../../Utils/constants/constants.js';

const validateOrderField = function () {
  return this.issue_status === item_issued_for.order ? true : false;
};

const grouping_done_history_schema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: [validateOrderField, 'order_id is required'],
    },
    order_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: [validateOrderField, 'order_item_id is required'],
    },
    order_category: {
      type: String,
      enum: {
        values: [order_category.decorative, order_category.series_product],
        message: `Invalid type {{VALUE}} it must be one of the ${order_category.decorative},${order_category.series_product}`,
      },
      uppercase: true,
      trim: true,
      default: null,
      required: [validateOrderField, 'order_category is required'],
    },
    issue_for_tapping_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // required: [true, 'Issue for tapping id is required'],
    },
    issued_for_challan_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    grouping_done_other_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Grouping other details id is required'],
    },
    grouping_done_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Grouping item id is required'],
    },
    group_no: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Group No is required'],
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
    thickness: {
      type: Number,
      default: 0,
      required: [true, 'Thickness is required'],
    },
    no_of_sheets: {
      type: Number,
      default: 0,
      required: [true, 'No of sheets is required'],
    },
    sqm: {
      type: Number,
      default: 0,
      required: [true, 'SQM is required'],
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
    issued_for: {
      type: String,
      enum: {
        values: [
          item_issued_for?.order,
          item_issued_for?.stock,
          item_issued_for?.sample,
        ],
        message: `Invalid type {{VALUE}} it must be one of the ${(item_issued_for?.order, item_issued_for?.stock, item_issued_for?.sample)}`,
      },
      default: null,
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          issues_for_status?.challan,
          issues_for_status?.order,
          issues_for_status?.tapping,
        ],
        message: `Invalid type {{VALUE}} it must be one of the ${issues_for_status?.order, issues_for_status?.challan, issues_for_status?.tapping}`,
      },
      default: null,
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

const grouping_done_history_model = mongoose.model(
  'grouping_done_history',
  grouping_done_history_schema,
  'grouping_done_history'
);
export default grouping_done_history_model;
