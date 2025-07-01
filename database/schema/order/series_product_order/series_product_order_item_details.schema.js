import mongoose from 'mongoose';
import { order_item_status } from '../../../Utils/constants/constants.js';

const series_product_order_item_details_schema = new mongoose.Schema(
  {
    item_no: {
      type: Number,
      required: [true, 'Sr no is required'],
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'orders',
      required: [true, 'Order Id is required'],
    },
    item_name: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    item_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    item_sub_category_name: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    photo_number: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'Photo No is required'],
    },
    photo_number_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Photo Id is required'],
    },
    dispatch_schedule: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'Dispatch Schedule is required'],
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Product Id is required'],
    },
    product_code: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'Code is required'],
    },
    color_code: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    veneer_min_thickness: {
      type: Number,
      default: null,
    },
    sq_feet: {
      type: Number,
      required: [true, 'SQF is required'],
    },
    base_required_sheet: {
      type: Number,
      default: null,
    },
    flow_process: [
      {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
      },
    ],
    no_of_hours: {
      type: Number,
      default: null,
    },
    base_size: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'Base Size is required'],
    },
    pressing_instructions: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    base_type: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    base_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    base_sub_category_name: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    base_min_thickness: {
      type: Number,
      default: null,
    },
    length: {
      type: Number,
      required: [true, 'Base Length is required'],
    },
    width: {
      type: Number,
      required: [true, 'Base Width is required'],
    },
    thickness: {
      type: Number,
    },
    no_of_sheets: {
      type: Number,
      required: [true, 'Required sheet is required'],
    },
    sqm: {
      type: Number,
      required: [true, 'SQM is required'],
    },
    previous_rate: {
      type: Number,
      default: null,
    },
    rate_per_sq_feet: {
      type: Number,
      required: [true, 'Rate per SQF is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    sales_item_name: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    remark: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    item_status: {
      type: String,
      enum: {
        values: [order_item_status?.cancel],
        message: `Invalid Order Status -> {{VALUE}} it must be one of the ${order_item_status?.cancel}`,
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

series_product_order_item_details_schema.index({ item_no: 1 });
series_product_order_item_details_schema.index({ order_id: 1 });
series_product_order_item_details_schema.index(
  { item_no: 1, order_id: 1 },
  { unique: true }
);

const series_product_order_item_details_model = mongoose.model(
  'series_product_order_item_details',
  series_product_order_item_details_schema,
  'series_product_order_item_details'
);

export default series_product_order_item_details_model;
