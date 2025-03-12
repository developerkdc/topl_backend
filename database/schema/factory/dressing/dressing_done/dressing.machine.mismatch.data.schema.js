import mongoose from 'mongoose';
import { dressing_error_types } from '../../../../Utils/constants/constants.js';

const dressing_miss_match_data_schema = new mongoose.Schema(
  {
    dressing_date: {
      type: Date,
      required: [true, 'Dressing Date is required.'],
    },
    log_no_code: {
      type: String,
      required: [true, 'Log No Code is required.'],
    },
    item_name: {
      type: String,
      required: [true, 'Item Name is required.'],
      uppercase: true,
      trim: true,
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, 'Item ID is required.'],
      default: null,
    },
    length: {
      type: Number,
      required: [true, 'Length is required. '],
    },
    width: {
      type: Number,
      required: [true, 'Width is required'],
    },
    thickness: {
      type: Number,
      required: [true, 'Thickness is required.'],
    },
    no_of_leaves: {
      type: Number,
      required: [true, 'No of Leaves is required.'],
    },
    sqm: {
      type: Number,
      required: [true, 'SQM is required'],
    },
    bundle_number: {
      type: Number,
      required: [true, 'Bundle Number is required'],
    },
    pallet_number: {
      type: String,
      required: [true, 'Pallet Number is required.'],
      trim: true,
    },
    process_status: {
      type: String,
      enum: {
        values: [
          dressing_error_types?.dressing_done,
          dressing_error_types.no_of_leaves_missmatch,
          dressing_error_types.peeling_not_done,
          dressing_error_types.process_pending,
          dressing_error_types.slicing_not_done,
          dressing_error_types.thickness_missmatch,
          dressing_error_types.in_complete_data,
        ],
        message: `Invalid error type -> {{VALUE}} must be one of the ${dressing_error_types.dressing_done} , ${dressing_error_types.no_of_leaves_missmatch},  ${dressing_error_types.peeling_not_done} , ${dressing_error_types.process_pending} , ${dressing_error_types.slicing_not_done} , ${dressing_error_types.thickness_missmatch}, ${dressing_error_types.in_complete_data}`,
      },
      default: dressing_error_types.process_pending,
    },
    status: {
      type: Boolean,
      default: true,
    },
    is_hidden: {
      type: Boolean,
      default: false,
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

dressing_miss_match_data_schema.index(
  { pallet_number: 1, bundle_number: 1, log_no_code: 1 },
  { unique: true }
);
dressing_miss_match_data_schema.index({ pallet_number: 1 });
dressing_miss_match_data_schema.index({ bundle_number: 1 });
dressing_miss_match_data_schema.index({ log_no_code: 1 });
dressing_miss_match_data_schema.index({ dressing_date: 1 });

const dressing_miss_match_data_model = mongoose.model(
  'dressing_miss_match_data',
  dressing_miss_match_data_schema,
  'dressing_miss_match_data'
);

export default dressing_miss_match_data_model;
