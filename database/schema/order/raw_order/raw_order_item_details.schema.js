import mongoose from 'mongoose';

const RawOrderItemDetailsSchema = new mongoose.Schema(
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

indexingFields.forEach((index) => RawOrderItemDetailsSchema.index(...index));

export const RawOrderItemDetailsModel = mongoose.model(
  'raw_order_item_details',
  RawOrderItemDetailsSchema,
  'raw_order_item_details'
);
