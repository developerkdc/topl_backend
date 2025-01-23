import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const ItemCodeSchema = new mongoose.Schema({
  item_code: {
    type: String,
    required: [true, 'Item Code is required.'],
    trim: true,
    unique: [true, 'Item Code already exist.'],
    uppercase: true,
    set: function (value) {
      return value.replace(/\s+/g, ' ').trim();
    },
  },
  item_code_remarks: {
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

const ItemCodeModel = mongoose.model('item_code', ItemCodeSchema);
LogSchemaFunction('itemCode', ItemCodeModel, []);

export default ItemCodeModel;
