import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const plywood_history_schema = new mongoose.Schema(
  {
    plywood_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Plywood Item ID is required.'],
    },
    issued_for_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Issued for order ID is required."]
    },
    issue_status: {
      type: String,
      enum: {
        values: [issues_for_status?.order],
        message: `Invalid Issue status -> {{VALUE}} it must be one of the ${issues_for_status?.order}`,
      },
      default: issues_for_status?.order,
    },
    issued_sheets: {
      type: Number,
      required: [true, 'Issued sheets are required.'],
    },
    issued_sqm: {
      type: Number,
      required: [true, 'Issued SQM are required.'],
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

plywood_history_schema?.index({ issue_status: 1 });
// plywood_history_schema?.index({ plywood_item_id: 1 }, { unique: true });

const plywood_history_model = mongoose.model(
  'plywood_history_details',
  plywood_history_schema,
  'plywood_history_details'
);

export default plywood_history_model;
