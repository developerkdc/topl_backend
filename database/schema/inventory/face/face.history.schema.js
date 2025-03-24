import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const face_history_schema = new mongoose.Schema(
  {
    face_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Face Item ID is required.'],
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

face_history_schema?.index({ issue_status: 1 });
// face_history_schema?.index({ plywood_item_id: 1 }, { unique: true });

const face_history_model = mongoose.model(
  'face_history_details',
  face_history_schema,
  'face_history_details'
);

export default face_history_model;
