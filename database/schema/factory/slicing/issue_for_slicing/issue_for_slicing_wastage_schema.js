import mongoose from 'mongoose';

const issue_for_slicing_wastage_schema = new mongoose.Schema(
  {
    issue_for_slicing_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issue for Slicing ID is required.'],
    },
    height: {
      type: Number,
      default: 0,
      required: [true, 'Wastage Height is required.'],
    },
    width: {
      type: Number,
      default: 0,
      required: [true, 'Wastage Width is required.'],
    },
    length: {
      type: Number,
      default: 0,
      required: [true, 'Wastage Length is required.'],
    },
    cmt: {
      type: Number,
      default: 0,
      required: [true, 'Wastage CMT is required.'],
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

issue_for_slicing_wastage_schema?.index(
  { issue_for_slicing_id: 1 },
  { unique: true }
);
const issue_for_slicing_wastage_model = mongoose.model(
  'issue_for_slicing_wastage',
  issue_for_slicing_wastage_schema,
  'issue_for_slicing_wastage'
);

export default issue_for_slicing_wastage_model;
