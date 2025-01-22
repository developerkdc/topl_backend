import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const CurrencySchema = new mongoose.Schema({
  currency_name: {
    type: String,
    required: [true, 'Currency Name is required.'],
    trim: true,
    unique: [true, 'Currency Name already exist.'],
    uppercase: true,
  },
  currency_remarks: {
    type: String,
    trim: true,
    uppercase: true,
  },
  created_employee_id: {
    type: mongoose.Types.ObjectId,
    ref: 'users',
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

CurrencySchema.index({ currency_name: 1 }, { unique: true });
const CurrencyModel = mongoose.model('currency', CurrencySchema);
LogSchemaFunction('currency', CurrencyModel, []);
export default CurrencyModel;
