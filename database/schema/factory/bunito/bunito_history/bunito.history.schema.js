import mongoose from 'mongoose';
import { issues_for_status, item_issued_from } from '../../../../Utils/constants/constants.js';

const bunito_history_schema = new mongoose.Schema(
  {
    sr_no: Number,
    bunito_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Plywood Item ID is required.'],
    },
    issued_for_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issued to flow id is required.'],
    },
    issue_for_bunito_id: {
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, 'Issued for order ID is required.'],
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
  [{ bunito_item_id: 1 }],
];
indexed_fields?.forEach((field) => bunito_history_schema.index(...field));
const bunito_history_model = mongoose.model(
  'bunito_history_details',
  bunito_history_schema,
  'bunito_history_details'
);

export default bunito_history_model;
