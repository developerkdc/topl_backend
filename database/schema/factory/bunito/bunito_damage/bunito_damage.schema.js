import mongoose from 'mongoose';

const bunito_damage_schema = new mongoose.Schema(
  {
    sr_no: Number,
    bunito_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'CNC Done ID is required.'],
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

bunito_damage_schema.index({ bunito_done_id: 1 });
bunito_damage_schema.index({ sr_no: 1 });

const bunito_damage_model = mongoose.model(
  'bunito_damage_details',
  bunito_damage_schema,
  'bunito_damage_details'
);

export default bunito_damage_model;
