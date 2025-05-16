import mongoose from 'mongoose';
import { issues_for_status, item_issued_for, item_issued_from, order_category } from '../../../../Utils/constants/constants.js';
const validateOrderField = function () {
  return this.issued_for === item_issued_for?.order ? true : false;
};
const issued_for_values = Object.values(item_issued_for)
const polishing_history_schema = new mongoose.Schema(
  {
    sr_no: Number,
    issue_for_polishing_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issue for polishing id is required.'],
    },
    issued_for_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issued to flow id is required.'],
    },
    issued_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, 'Issued for order ID is required.'],
      default: null,
    },
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
    issued_for: {
      type: String,
      enum: {
        values: issued_for_values,
        message: `Invalid type {{VALUE}} it must be one of the ${issued_for_values?.join(",")}`,
      },
      default: null,
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          item_issued_from?.pressing_factory,
          item_issued_from?.cnc_factory,
          item_issued_from?.color_factory,
          item_issued_from?.bunito_factory,
          item_issued_from?.polishing_factory,
        ],
        message: `Invalid Type -> {{VALUE}} , it must be one of the ${(item_issued_from?.pressing_factory, item_issued_from?.cnc_factory, item_issued_from?.color_factory, item_issued_from?.bunito_factory, item_issued_from?.polishing_factory)}`,
      },
      default: issues_for_status?.order,
    },
    no_of_sheets: {
      type: Number,
      required: [true, 'Issued sheets are required.'],
    },
    sqm: {
      type: Number,
      required: [true, 'Issued SQM are required.'],
    },
    amount: {
      type: Number,
      required: [true, 'Issued Amount is required.'],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By is required.'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By is required.'],
    },
  },
  { timestamps: true }
);

const indexed_fields = [
  [{ issue_status: 1 }],
  [{ sr_no: 1 }, { unique: true }],
  [{ issued_item_id: 1 }],
];
indexed_fields?.forEach((field) => polishing_history_schema.index(...field));
const polishing_history_model = mongoose.model(
  'polishing_history_details',
  polishing_history_schema,
  'polishing_history_details'
);

export default polishing_history_model;
