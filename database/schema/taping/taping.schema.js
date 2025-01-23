import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const CreateTappingSchema = new mongoose.Schema({
  issued_for_tapping_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'issued_for_taping',
    required: true,
  },
  cutting_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cutting',
    required: true,
  },
  tapping_no_of_pcs: {
    type: Number,
    required: true,
  },
  tapping_length: {
    type: Number,
    required: true,
  },
  tapping_width: {
    type: Number,
    required: true,
  },

  tapping_sqm: {
    type: Number,
    required: true,
  },
  tapping_waste_sqm: {
    type: Number,
    required: [true, 'Waste Sqm is required'],
  },

  tapping_waste_sqm_percentage: {
    type: Number,
    required: [true, 'Waste Sqm Percentage is required'],
  },
  total_tapping_waste_sqm: {
    type: Number,
    required: [true, 'Waste Sqm is required'],
  },

  total_tapping_waste_sqm_percentage: {
    type: Number,
    required: [true, 'Waste Sqm Percentage is required'],
  },

  tapping_remarks: {
    type: String,
  },

  tapping_images: {
    type: Array,
  },
  ready_sheet_form_no_of_pcs_available: {
    type: Number,
    required: true,
  },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    trim: true,
  },

  issued_for_taping_date: { type: Date, required: true },
  taping_done_date: { type: Date, required: true },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const CreateTappingModel = mongoose.model(
  'tapping',
  CreateTappingSchema
);
LogSchemaFunction('tapping', CreateTappingModel);
