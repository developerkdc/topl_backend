import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const PartyNameSchema = new mongoose.Schema({
  customer_name: {
    type: String,
    required: [true, 'Customer Name is required.'],
    trim: true,
    unique: [true, 'Customer Name already exist.'],
  },
  customer_place: {
    type: String,
    required: [true, 'Customer Place is required.'],
    trim: true,
  },
  party_remarks: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  created_employee_id: {
    type: mongoose.Types.ObjectId,
    ref: 'users',
    required: true,
    trim: true,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const PartyModel = mongoose.model('party', PartyNameSchema);
LogSchemaFunction('party', PartyModel);

export default PartyModel;
