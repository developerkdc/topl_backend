import mongoose from 'mongoose';

const DecorativeOrderItemDetailsSchema = new mongoose.Schema(
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
    order_category: {
      type: String,
      enum: [
        order_category.raw,
        order_category.plain,
        order_category.series_product,
      ],
      required: [true, 'Order Category is required'],
      uppercase: true,
      trim: true,
    },

    photo_no: {
      type: String,
      default:null
    },
    group_no:{
      type: String,
      default:null
    },
    series:{
      type: String,
      default:null
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
    log_no: {
      type: String,
      required: [true, 'Log No is required'],
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

export const DecorativeOrderItemDetailsModel = mongoose.model(
  'decorative_order_item_details',
  DecorativeOrderItemDetailsSchema
);
