import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const GradeNameSchema = new mongoose.Schema({
  grade_name: {
    type: String,
    required: [true, 'Grade Name is required.'],
    unique: [true, 'Grade Name already exist.'],
    uppercase: true,
    trim: true,
  },
  grade_remarks: {
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

GradeNameSchema.index({ grade_name: 1 }, { unique: true });
const GradeModel = mongoose.model('grade', GradeNameSchema);
LogSchemaFunction('grade', GradeModel, []);
export default GradeModel;
