import mongoose from 'mongoose';
import {
  issues_for_status,
  item_issued_from,
  order_category,
} from '../../../../Utils/constants/constants.js';

const validateOrderField = function () {
  return this.issue_status === issues_for_status?.order ? true : false;
};

const pressing_done_history_schema = new mongoose.Schema(
  {
    pressing_id: {
      type: String,
      required: [true, 'Pressing ID is required'],
      trim: true,
      uppercase: true,
    },
    pressing_done_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Pressing Done Details Id is required'],
    },
    issued_to_flow: {  //name of factory where item has been issue
      type: String,
      enum: {
        values: [
          item_issued_from?.cnc_factory,
          item_issued_from?.color_factory,
          item_issued_from?.bunito_factory,
          item_issued_from?.polishing_factory,
          item_issued_from?.canvas_factory,
          item_issued_from?.packing,
        ],
        message: `Invalid Type -> {{VALUE}} , it must be one of the ${(item_issued_from?.packing, item_issued_from?.cnc_factory, item_issued_from?.color_factory, item_issued_from?.bunito_factory, item_issued_from?.polishing_factory)}`,
      },
      required: [true, 'Issued to flow is required.'],
    },
    issued_to_flow_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issued to flow id is required.'],
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
    no_of_sheets: {
      type: Number,
      default: 0,
      required: [true, 'No of leaves is required'],
    },
    sqm: {
      type: Number,
      default: 0,
      required: [true, 'SQM is required'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          issues_for_status.order,
          issues_for_status.stock,
          issues_for_status.sample,
        ],
        message: `Invalid type {{VALUE}} it must be one of the ${(issues_for_status.order, issues_for_status.stock, issues_for_status.sample)}`,
      },
      default: null,
    },
    amount: {
      type: Number,
      default: 0,
      required: [true, 'Item Amount is required'],
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

export const pressing_done_history_model = mongoose.model(
  'pressing_done_history',
  pressing_done_history_schema,
  'pressing_done_history'
);
