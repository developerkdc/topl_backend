import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const IssuedTapingSchema = new mongoose.Schema({
  issued_for_cutting_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'issued_for_cutting',
    required: true,
  },
  cutting_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cutting',
    required: true,
  },

  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    trim: true,
  },
  issued_for_taping_remarks: {
    type: String,
  },
  revert_status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  issued_for_taping_date: {
    type: Date,
    default: () => new Date().setUTCHours(0, 0, 0, 0),
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const IssueForTapingModel = mongoose.model(
  'issued_for_taping',
  IssuedTapingSchema
);
LogSchemaFunction('issuedForTaping', IssueForTapingModel);
