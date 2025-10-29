import mongoose from 'mongoose';
import {
  item_issued_for,
  item_issued_from,
  order_category,
} from '../../../../Utils/constants/constants.js';
import { group } from 'console';

const finished_ready_for_packing_schema = new mongoose.Schema(
  {
    issued_from_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issued From ID is required.'],
    },
    pressing_id: {
      type: String,
      required: [true, 'Pressing ID is required'],
      trim: true,
    },
    pressing_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Pressing Details ID is required'],
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Order ID is required.'],
    },
    order_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Order Item ID is required.'],
    },
    sales_item_name:{
type : String,
required : [true,"Sales Item Name is required."]
    },
    order_number: {
      type: Number,
      required: [true, 'Order Number is required.'],
    },
    order_item_no: {
      type: Number,
      required: [true, 'Order Item Number is required.'],
    },
    group_no: {
      type: String,
      required: [true, 'Group Number is required.'],
    },
    group_no_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Group Number ID is required.'],
    },
    // photo_no: {
    //     type: String,
    //     required: [true, 'Photo Number is required.'],
    // },
    length: {
      type: Number,
      required: [true, 'Length is required.'],
    },
    width: {
      type: Number,
      required: [true, 'Width is required.'],
    },
    thickness: {
      type: Number,
      required: [true, 'Thickness is required.'],
    },
    no_of_sheets: {
      type: Number,
      required: [true, 'Issued Sheets are required.'],
    },
    sqm: {
      type: Number,
      required: [true, 'Issued SQM is required.'],
    },
    amount: {
      type: Number,
      required: [true, 'Issued Amount is required.'],
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
      required: [true, 'order_category is required'],
    },
    product_type: {
      type: String,
      required: [true, 'Product Type is required'],
      trim: true,
    },
    issued_for: {
      type: String,
      enum: {
        values: [
          item_issued_for?.order,
          item_issued_for?.sample,
          item_issued_for?.stock,
        ],
        message: `Invalid type -> {{VALUE}}, it must be one of the ${(item_issued_for?.order, item_issued_for?.sample, item_issued_for?.stock)}`,
      },
      required: [true, 'Item Issued for is required.'],
    },
    issued_from: {
      type: String,
      enum: {
        values: [
          item_issued_from?.pressing_factory,
          item_issued_from?.cnc_factory,
          item_issued_from?.color_factory,
          item_issued_from?.bunito_factory,
          item_issued_from?.polishing_factory,
          item_issued_from?.canvas_factory,
        ],
        message: `Invalid Type -> {{VALUE}} , it must be one of the ${(item_issued_from?.pressing_factory, item_issued_from?.cnc_factory, item_issued_from?.color_factory, item_issued_from?.bunito_factory, item_issued_from?.polishing_factory, item_issued_from?.canvas_factory)}`,
      },
      required: [true, 'Issued from is required.'],
    },
    is_packing_done: {
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
  {
    timestamps: true,
  }
);

const indexed_fields = [
  [{ group_no: 1 }],
]

indexed_fields.forEach((field) => {
  finished_ready_for_packing_schema.index(...field)
})
const finished_ready_for_packing_model = mongoose.model(
  'finished_ready_for_packing_details',
  finished_ready_for_packing_schema,
  'finished_ready_for_packing_details'
);

export default finished_ready_for_packing_model;
