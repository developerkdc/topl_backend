import mongoose from 'mongoose';

const issue_for_slicing_available_schema = new mongoose.Schema({
  issue_for_slicing_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Issue for Slicing ID is required.'],
  },
  height: {
    type: Number,
    default: 0,
    required: [true, 'Available Height is required.'],
  },
  width: {
    type: Number,
    default: 0,
    required: [true, 'Available Width is required.'],
  },
  length: {
    type: Number,
    default: 0,
    required: [true, 'Available Length is required.'],
  },
  cmt: {
    type: Number,
    default: 0,
    required: [true, 'Available CMT is required.'],
  },
  amount: {
    type: Number,
    required: [true, 'Total Available amount is required'],
  },
  remark: {
    type: String,
    default: null,
  },
  issued_for_dressing: {
    type: Boolean,
    default: false,
  },
  is_reslicing_done: {
    type: Boolean,
    default: false,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Created By is required'],
  },

  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Updated  By is required'],
  },
});

issue_for_slicing_available_schema?.index(
  { issue_for_slicing_id: 1 },
  { unique: true }
);

const issue_for_slicing_available_model = mongoose.model(
  'issue_for_slicing_available',
  issue_for_slicing_available_schema,
  'issue_for_slicing_available'
);
export default issue_for_slicing_available_model;
