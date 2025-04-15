import mongoose from 'mongoose';
import { item_issued_from } from '../../../Utils/constants/constants.js';

const issued_from_values = Object.values(item_issued_from);
const issue_for_challan_schema = new mongoose.Schema(
  {
    sr_no: Number,
    issued_from: {
      type: String,
      required: [true, 'Issued from is required'],
      enum: {
        values: issued_from_values,
        message:
          'Invalid Issued from value -> {{VALUE}}. It must be one of the : ' +
          issued_from_values?.join(', '),
      },
    },
    issued_item_details: {
      type: {},
      required: [true, 'Issued Item details is required.'],
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
  { timestamps: true }
);

const issue_for_challan_model = mongoose.model(
  'issue_for_challan_details',
  issue_for_challan_schema,
  'issue_for_challan_details'
);

export default issue_for_challan_model;
