import mongoose from 'mongoose';

const issues_for_peeling_available_schema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
    },
    issue_for_peeling_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'issue for pelling id is required'],
    },
    length: {
      type: Number,
      default: 0,
      required: [true, 'Available Length is required.'],
    },
    diameter: {
      type: Number,
      default: 0,
      required: [true, 'Available Width is required.'],
    },
    cmt: {
      type: Number,
      default: 0,
      required: [true, 'Available CMT is required.'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
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
      required: [true, 'Created By is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

issues_for_peeling_available_schema.index({ sr_no: 1 }, { unique: true });
issues_for_peeling_available_schema.index({ issue_for_peeling_id: 1 });

const issues_for_peeling_available_model = mongoose.model(
  'issues_for_peeling_available',
  issues_for_peeling_available_schema,
  'issues_for_peeling_available'
);

export default issues_for_peeling_available_model;
