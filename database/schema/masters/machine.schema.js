import mongoose from 'mongoose';

const machineSchema = new mongoose.Schema(
  {
    sr_no: Number,
    machine_name: {
      type: String,
      required: [true, 'Machine name is required'],
      unique: [true, 'Machine Name already exist.'],
      trim: true,
      uppercase: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'department',
      required: [true, 'department id is required'],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
  },
  { timestamps: true }
);

const machineModel =
  mongoose.models.machines || mongoose.model('machine', machineSchema);
export default machineModel;
