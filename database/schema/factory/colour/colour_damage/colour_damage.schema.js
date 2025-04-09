import mongoose from 'mongoose';

const color_damage_schema = new mongoose.Schema(
  {
    sr_no: Number,
    color_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Color Done ID is required.'],
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

color_damage_schema.index({ color_done_id: 1 });
color_damage_schema.index({ sr_no: 1 });

const color_damage_model = mongoose.model(
  'color_damage_details',
  color_damage_schema,
  'color_damage_details'
);

export default color_damage_model;
