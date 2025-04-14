import mongoose from 'mongoose';

const plywood_resize_damage_schema = new mongoose.Schema(
  {
    sr_no:Number,
    issue_for_resizing_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issue for resizing ID is required.'],
    },
    no_of_sheets: {
      type: Number,
      required: [true, 'No. of Sheets is required.'],
    },
    sqm: {
      type: Number,
      required: [true, 'SQM is required.'],
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

plywood_resize_damage_schema.index(
  { issue_for_resizing_id: 1 },
  { unique: true }
);

const plywood_resize_damage_model = mongoose.model(
  'plywood_resize_damage_details',
  plywood_resize_damage_schema,
  'plywood_resize_damage_details'
);

export default plywood_resize_damage_model;
