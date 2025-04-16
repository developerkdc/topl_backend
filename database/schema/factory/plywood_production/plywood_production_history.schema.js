import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const plywood_production_history_schema = new mongoose.Schema(
  {
    plywood_production_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Plywood Resizing Done ID is required.'],
    },
    issued_for_id: {
      //this is the Id of the document to which the item is been issued
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, 'Issued for order ID is required.'],
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

// indexing
const indexingFields = [
  [{ plywood_resizing_done_id: 1 }],
  [{ issue_status: 1 }],
  [{ created_by: 1 }],
  [{ updatedAt: 1 }],
];

indexingFields.forEach((index) =>
  plywood_production_history_schema.index(...index)
);

const plywood_resizing_history_model = mongoose.model(
  'plywood_production_history_details',
  plywood_production_history_schema,
  'plywood_production_history_details'
);

export default plywood_resizing_history_model;
