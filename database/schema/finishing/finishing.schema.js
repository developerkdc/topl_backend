import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const FinishingSchema = new mongoose.Schema({
  issued_for_finishing_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'issued_for_finishing',
    required: true,
  },
  group_no: {
    type: Number,
    required: true,
  },
  finishing_no_of_pcs: {
    type: Number,
    required: true,
  },

  finishing_length: {
    type: Number,
    required: true,
  },
  finishing_width: {
    type: Number,
    required: true,
  },
  finishing_sqm: {
    type: Number,
    require: true,
  },
  finishing_remarks: {
    type: String,
  },
  finishing_images: {
    type: Array,
  },
  tapping_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'taping',
    required: true,
  },
  ready_sheet_form_inventory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ready_sheet_form_inventory',
    required: true,
  },
  ready_sheet_form_history_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ready_sheet_form_inventory_history',
    required: true,
  },

  pressing_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pressing',
    required: true,
  },

  final_finishing_status: {
    type: String,
    default: 'qc done',
  },

  status: {
    type: String,
  },

  finishing_waste_sqm: {
    waste_sqm: {
      type: Number,
      required: [true, 'Waste Sqm is required'],
    },
    waste_sqm_percentage: {
      type: Number,
      required: [true, 'Waste Sqm is required'],
    },
  },

  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    trim: true,
  },

  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const FinishingModel = mongoose.model('finishing', FinishingSchema);
LogSchemaFunction('finishing', FinishingModel);
