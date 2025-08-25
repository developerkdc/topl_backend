import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const GstSchema = new mongoose.Schema({
  gst_percentage: {
    type: Number,
    required: [true, 'Gst Percentage is required.'],
    trim: true,
    unique: [true, 'Gst Percentage already exist.'],
  },
  gst_remarks: {
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
    // trim: true,
    // uppercase: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

// GstSchema.index({ gst_name: 1 }, { unique: true });
const GstModel = mongoose.model('gst', GstSchema);
LogSchemaFunction('gst', GstModel, []);
export default GstModel;
