import mongoose from 'mongoose';
import { order_item_status } from '../../../Utils/constants/constants.js';

const raw_order_item_details_schema = new mongoose.Schema(
  {
    item_no: {
      type: Number,
      required: [true, 'Item Number is required.'],
    },
    raw_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Raw Item id is required'],
    },
    approval_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'orders',
      required: [true, 'Approval Order Id is required'],
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'orders',
      required: [true, 'Approval Order Id is required'],
    },
    raw_material: {
      type: String,
      required: [true, 'Raw Material is required'], //LOG,FLITCH,VENEER,PLYWOOD,MDF,CORE,FACE,FLEECE PAPER,STORE
      uppercase: true,
      trim: true,
    },
    product_category: {
      type: String,
      required: [true, 'product category is required'], //LOG,FLITCH,VENEER,PLYWOOD,MDF,CORE,FACE,FLEECE PAPER,STORE
      uppercase: true,
      trim: true,
    },
    sales_item_name: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
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
      // required: [true, 'Items Sub-Category Id is required'],
      default: null,
    },
    item_sub_category_name: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, 'Items Sub-Category Id is required'],
      default: null,
    },
    unit_name: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    log_no: {
      type: String,
      // required: [true, 'Log No is required'],
      default: null,
      trim: true,
      uppercase: true,
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
    no_of_sheet: {
      type: Number,
      default: 0,
    },
    dispatch_no_of_sheets: {
      type: Number,
      default: 0,
    },
    cbm: {
      type: Number,
      default: 0,
    },
    sqm: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    rate: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
    item_status: {
      type: String,
      enum: {
        values: [order_item_status?.cancelled, order_item_status?.closed],
        message: `Invalid Order Status -> {{VALUE}} it must be one of the ${[order_item_status?.cancelled, order_item_status?.closed]?.join(",")}`,
      },
      default: null,
    },
    item_remarks: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
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

const indexingFields = [
  [{ order_id: 1, item_no: 1 }, { unique: true }],
  [{ raw_material: 1 }],
  [{ item_name: 1 }],
  [{ item_name_id: 1 }],
  [{ log_no: 1 }],
  [{ created_by: 1 }],
  [{ updatedAt: 1 }],
];

indexingFields.forEach((index) => raw_order_item_details_schema.index(...index));

export const approval_raw_order_item_details = mongoose.model(
  'approval_raw_order_item_details',
  raw_order_item_details_schema,
  'approval_raw_order_item_details'
);
