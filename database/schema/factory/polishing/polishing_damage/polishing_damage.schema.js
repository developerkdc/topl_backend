import mongoose from 'mongoose';

const polishing_damage_schema = new mongoose.Schema(
  {
    sr_no: Number,
    polishing_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'polishing Done ID is required.'],
    },
    no_of_sheets: {
      type: Number,
      required: [true, 'No. of Sheets is required.'],
    },
    sqm: {
      type: Number,
      required: [true, 'SQM is required.'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required.'],
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

polishing_damage_schema.index({ polishing_done_id: 1 });
polishing_damage_schema.index({ sr_no: 1 });

const polishing_damage_model = mongoose.model(
  'polishing_damage_details',
  polishing_damage_schema,
  'polishing_damage_details'
);

export default polishing_damage_model;
