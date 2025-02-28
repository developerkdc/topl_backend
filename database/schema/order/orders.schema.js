import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';
import {
  branding_type,
  order_category,
  order_status,
  order_type,
} from '../../Utils/constants/constants.js';

const OrderSchema = new mongoose.Schema(
  {
    order_no: {
      type: Number,
      required: true,
      unique: true,
    },
    order_category: {
      type: String,
      enum: [
        order_category.raw,
        order_category.plain,
        order_category.series_product,
      ],
      required: true,
      uppercase: true,
      trim: true,
    },
    orderDate: { type: Date, required: true },

    owner_name: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    order_type: {
      type: String,
      enum: [order_type.job_work, order_type.regular],
      required: true,
      default: order_type.regular,
      uppercase: true,
      trim: true,
    },
    order_received_from: {
      type: String, //ONLINE, FACTORY, MOBILE
      // required: true,
      default: '',
      uppercase: true,
      trim: true,
    },
    credit_schedule: {
      type: String, //ADVANCE, AGAINST DISPATCH, 15 DAYS, 30 DAYS, 45 DAYS, 60 DAYS
      // required: true,
      default: '',
      uppercase: true,
      trim: true,
    },
    freight: {
      type: Number,
      default: 0,
    },
    local_freight: {
      type: Number,
      default: 0,
    },
    trade_discount_percentage: {
      type: Number,
      default: 0,
    },
    branding_type: {
      type: String,
      enum: [branding_type.with_branding, branding_type.without_branding],
      required: true,
      default: '',
      uppercase: true,
      trim: true,
    },
    common_instructions: {
      type: [String],
      default: null,
    },
    order_remarks: {
      type: String,
      uppercase: true,
      trim: true,
      default: '',
    },
    order_status: {
      type: String,
      enum: [
        order_status.complete,
        order_status.pending,
        order_status.partial_complete,
      ],
      uppercase: true,
      trim: true,
      default: null,
    },

    raw_materials: {
      type: String,
      default: null,
    },

    series_product: {
      type: String,
      default: null,
    },
    is_close: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By Id is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Updated By Id is required'],
    },
  },
  {
    timestamps: true,
  }
);

export const OrderModel = mongoose.model('orders', OrderSchema);
LogSchemaFunction('orders', OrderModel);
