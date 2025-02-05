import mongoose from 'mongoose';

const issues_for_peeling_wastage_schema = new mongoose.Schema(
  {
    issue_for_peeling_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'issue for pelling id is required'],
    },
    issue_for_peeling_available_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
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
    total_wastage_amount: {
      type: Number,
      default: 0,
      required: [true, 'Total Wastage Amount is required.'],
    },
    wastage_consumed_amount: {
      type: Number,
      default: 0,
      required: [true, 'Wastage Consumed Amount is required.'],
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

issues_for_peeling_wastage_schema.index({ issue_for_peeling_id: 1 });
issues_for_peeling_wastage_schema.index({ issue_for_peeling_available_id: 1 });
issues_for_peeling_wastage_schema.index({ issue_for_peeling_id: 1, issue_for_peeling_available_id: 1 }, { unique: true });

const issues_for_peeling_wastage_model = mongoose.model(
  'issues_for_peeling_wastage',
  issues_for_peeling_wastage_schema,
  'issues_for_peeling_wastage'
);

export default issues_for_peeling_wastage_model;
