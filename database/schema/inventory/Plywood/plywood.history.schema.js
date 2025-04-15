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
      // required: [true, 'Issued for order ID is required.'],
      default: null,
    },
    issued_for_challan_id: {
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, 'Issued for order ID is required.'],
      default: null,
    },
    issued_for_plywood_resizing_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    pressing_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          issues_for_status?.order,
          issues_for_status?.plywood_resizing,
          issues_for_status?.pressing,
        ],
        message: `Invalid Issue status -> {{VALUE}} it must be one of the ${issues_for_status?.order},${issues_for_status?.plywood_resizing},${issues_for_status?.pressing}`,
      },
      default: null,
    },
    issued_sheets: {
      type: Number,
      required: [true, 'Issued sheets are required.'],
    },
    issued_sqm: {
      type: Number,
      required: [true, 'Issued SQM are required.'],
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

plywood_history_schema?.index({ issue_status: 1 });
// plywood_history_schema?.index({ plywood_item_id: 1 }, { unique: true });

const plywood_history_model = mongoose.model(
  'plywood_history_details',
  plywood_history_schema,
  'plywood_history_details'
);

export default plywood_history_model;
