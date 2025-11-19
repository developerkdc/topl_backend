import mongoose from 'mongoose';
import { order_category } from '../../Utils/constants/constants.js';

const dispatch_items_schema = new mongoose.Schema(
  {
    packing_done_other_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Packing Done Mongodb ID is required.'],
    },
    packing_done_id: {
      type: Number,
      required: [true, 'Packing Done ID is required.'],
    },
    packing_done_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Packing Done Mongodb ID is required.'],
    },
    packing_date: {
      type: Date,
    },
    dispatch_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Dispatch ID is required.'],
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: [true, 'order_id is required'],
    },
    order_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: [true, 'order_item_id is required'],
    },
    invoice_no: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
      uppercase: true,
    },
    order_no: {
      type: String,
      required: [true, 'Order number is required'],
      trim: true,
      uppercase: true,
    },
    order_item_no: {
      type: String,
      required: [true, 'Order item number is required'],
      trim: true,
      uppercase: true,
    },
    order_category: {
      type: String,
      enum: {
        values: [
          order_category?.raw,
          order_category?.decorative,
          order_category?.series_product,
        ],
        message: `Invalid type {{VALUE}} it must be one of the ${[
          order_category?.raw,
          order_category?.decorative,
          order_category?.series_product,
        ]?.join(', ')}`,
      },
      uppercase: true,
      // required: [true, 'Order category is required'],
      trim: true,
    },
    product_category: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },

    group_no: {
      type: String,
      // required: [true, 'Group Number is required.'],
      default: null,
      trim: true,
      uppercase: true,
    },
    group_no_id: {
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, 'Group Number ID is required.'],
      default: null,
    },
    photo_no: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    log_no: {
      type: String,
      // required: [true, 'Log Number is required.'],
      default: null,
      trim: true,
      uppercase: true,
    },
    item_name: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    sales_item_name: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    item_sub_category_name: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    length: {
      type: Number,
      default: null,
    },
    width: {
      type: Number,
      default: null,
    },
    diameter: {
      type: Number,
      default: null,
    },
    thickness: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    no_of_sheets: {
      type: Number,
      default: null,
    },
    number_of_rolls: {
      type: Number,
      default: null,
    },
    no_of_leaves: {
      type: Number,
      default: null,
    },
    girth: {
      type: Number,
      default: null,
    },
    cmt: {
      type: Number,
      default: null,
    },
    quantity: {
      type: Number,
      default: null,
    },
    number_of_rolls: {
      type: Number,
      default: null,
    },
    sqm: {
      type: Number,
      default: null,
    },
    cbm: {
      type: Number,
      default: null,
    },
    new_sqm: {
      type: Number,
      default: null,
    },
    rate: {
      type: Number,
      default: 0,
      required: [true, 'Rate is required'],
    },
    amount: {
      type: Number,
      default: 0,
      required: [true, 'Item Amount is required'],
    },
    discount_percentage: {
      type: Number,
      default: 0,
      // required: [true, 'Item Amount is required'],
    },
    discount_value: {
      type: Number,
      default: 0,
      required: [true, 'Item Amount is required'],
    },
    final_amount: {
      type: Number,
      default: function () {
        return this.amount - this.discount_value;
      },
      required: [true, 'Item Amount with discount is required'],
    },
    gst_details: {
      gst_percentage: {
        type: Number,
        default: 0,
      },
      gst_amount: {
        type: Number,
        default: 0,
      },
      igst_percentage: {
        type: Number,
        default: 0,
      },
      igst_amount: {
        type: Number,
        default: 0,
      },
      cgst_percentage: {
        type: Number,
        default: 0,
      },
      cgst_amount: {
        type: Number,
        default: 0,
      },
      sgst_percentage: {
        type: Number,
        default: 0,
      },
      sgst_amount: {
        type: Number,
        default: 0,
      },
    },
    discount_amount: {
      type: Number,
      default: 0,
    },
    hsn_number: {
      type: Number,
      default: 0,
    },
    calculate_unit: {
      type: String,
      default: null,
    },
    final_row_amount: {
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

const dispatchItemsModel = mongoose.model(
  'dispatch_items',
  dispatch_items_schema,
  'dispatch_items'
);
export default dispatchItemsModel;
