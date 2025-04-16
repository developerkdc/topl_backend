import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const fleece_history_schema = new mongoose.Schema(
  {
    fleece_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Fleece Item ID is required.'],
    },
    issued_for_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      // // required: [true, 'Issued for order ID is required.'],
      default: null,
    },
    pressing_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    issued_for_challan_id: {
      type: mongoose.Schema.Types.ObjectId,
      default:null
    },
    issue_status: {
      type: String,
      enum: {
        values: [issues_for_status?.order, issues_for_status?.pressing],
        message: `Invalid Issue status -> {{VALUE}} it must be one of the ${issues_for_status?.order}, ${issues_for_status?.pressing}`,
      },
      default: issues_for_status?.order,
    },
    issued_number_of_roll: {
      type: Number,
      required: [true, 'Issued No of Roll are required.'],
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

fleece_history_schema?.index({ issue_status: 1 });

const fleece_history_model = mongoose.model(
  'fleece_history_details',
  fleece_history_schema,
  'fleece_history_details'
);

export default fleece_history_model;
