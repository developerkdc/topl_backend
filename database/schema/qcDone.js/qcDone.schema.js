import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const QcDoneInventorySchema = new mongoose.Schema({
  issued_for_finishing_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'issued_for_finishing',
    required: true,
  },
  group_no: {
    type: Number,
    required: true,
  },
  qc_no_of_pcs_available: {
    type: Number,
    required: true,
  },
  ready_sheet_form_pallete_no: {
    type: String,
    default: '',
  },
  ready_sheet_form_physical_location: {
    type: String,
    default: '',
  },
  qc_length: {
    type: Number,
    required: true,
  },
  qc_width: {
    type: Number,
    required: true,
  },
  qc_sqm: {
    type: Number,
    require: true,
  },

  finishing_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'finishing',
    required: true,
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

  status: {
    type: String,
    enum: ['available', 'not available'],
    default: 'available',
  },

  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    trim: true,
  },
  qc_remarks: {
    type: String,
  },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const QcDoneInventoryModel = mongoose.model(
  'qc_done_inventory',
  QcDoneInventorySchema
);
LogSchemaFunction('qcDoneInventory', QcDoneInventoryModel);
