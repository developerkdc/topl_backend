import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const PalleteNameSchema = new mongoose.Schema({
  pallete_no: {
    type: String,
    required: [true, 'Pallete Number is required.'],
    trim: true,
    unique: [true, 'Pallete Number already exist.'],
  },
  pallete_remarks: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  item_physical_location: {
    type: String,
    required: true,
    trim: true,
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

const PalleteModel = mongoose.model('pallete', PalleteNameSchema);
LogSchemaFunction('pallete', PalleteModel, []);

export default PalleteModel;
