import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const other_goods_history_schema = new mongoose.Schema(
  {
    other_goods_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Other Goods Item ID is required.'],
    },
    issued_for_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issued for order ID is required.'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [issues_for_status?.order],
        message: `Invalid Issue status -> {{VALUE}} it must be one of the ${issues_for_status?.order}`,
      },
      default: issues_for_status?.order,
    },
    issued_quantity: {
      type: Number,
      required: [true, 'Issued quantity is required.'],
    },
    issued_amount: {
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

other_goods_history_schema?.index({ issue_status: 1 });
// other_goods_history_schema?.index({ plywood_item_id: 1 }, { unique: true });

const plywood_history_model = mongoose.model(
  'other_goods_history_details',
  other_goods_history_schema,
  'other_goods_history_details'
);

export default plywood_history_model;
