import mongoose from 'mongoose';
import {
  order_category,
  order_item_status,
} from '../../../Utils/constants/constants.js';

const decorative_order_item_details_schema = new mongoose.Schema(
  {
    item_no: {
      type: Number,
      required: [true, 'Item Number is required.'],
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'orders',
      required: [true, 'Order Id is required'],
    },

    item_name: {
      type: String,
      required: [true, 'Item Name is required'],
      trim: true,
      uppercase: true,
    },
    item_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Item Name ID is required'],
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    item_sub_category_name: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    photo_number: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    photo_number_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    group_number: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    group_number_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    different_group_photo_number: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    different_group_photo_number_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    different_group_group_number: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    different_group_group_number_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    series_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    series_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    pressing_instructions: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    base_type: {
      type: String,
      uppercase: true,
      trim: true,
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
    base_required_thickness: {
      type: Number,
      default: 0,
    },
    length: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 0,
    },
    thickness: {
      type: Number,
      default: 0,
    },
    no_of_sheets: {
      type: Number,
      default: 0,
    },
    sqm: {
      type: Number,
      default: 0,
    },
    previous_rate: {
      type: Number,
      default: 0,
    },
    rate_per_sqm: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
    remark: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    item_status: {
      type: String,
      default: null,
      enum: {
        values: [order_item_status?.cancel],
        message: `Invalid Order Status -> {{VALUE}} it must be one of the ${order_item_status?.cancel}`,
      },
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

decorative_order_item_details_schema?.index(
  { order_id: 1, item_no: 1 },
  { unique: true }
);
decorative_order_item_details_schema.index({ item_status: 1 });
decorative_order_item_details_schema.index({ amount: 1 });
decorative_order_item_details_schema.index({ item_name: 1 });
decorative_order_item_details_schema.index({ item_sub_category_name: 1 });
decorative_order_item_details_schema.index({ photo_number: 1 });
decorative_order_item_details_schema.index({ group_number: 1 });
decorative_order_item_details_schema.index({ base_type: 1 });
decorative_order_item_details_schema.index({ base_sub_category_name: 1 });

export const decorative_order_item_details_model = mongoose.model(
  'decorative_order_item_details',
  decorative_order_item_details_schema,
  'decorative_order_item_details'
);
