import mongoose from 'mongoose';

const canvas_damage_schema = new mongoose.Schema(
  {
    sr_no: Number,
    canvas_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'canvas Done ID is required.'],
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

canvas_damage_schema.index({ canvas_done_id: 1 });
canvas_damage_schema.index({ sr_no: 1 });

const canvas_damage_model = mongoose.model(
  'canvas_damage_details',
  canvas_damage_schema,
  'canvas_damage_details'
);

export default canvas_damage_model;
