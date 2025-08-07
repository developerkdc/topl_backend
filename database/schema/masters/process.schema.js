import mongoose from 'mongoose';
import { process_type } from '../../Utils/constants/constants.js';

const processSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
      // unique: [true, "Sr.No must be unique"]
    },
    name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Process Name is required'],
    },
    process_type: {
      type: String,
      uppercase: true,
      trim: true,
      enum: [process_type.pre_pressing, process_type.post_pressing],
      required: [true, 'Process Type is required'],
    },
    status: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'created by is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'updated by is required'],
    },
  },
  {
    timestamps: true,
  }
);

processSchema.index({ name: 1 }, { unique: true });
processSchema.index({ sr_no: 1 }, { unique: true });
processSchema.index({ process_type: 1 });
processSchema.index({ created_by: 1 });
processSchema.index({ updated_by: 1 });

const processModel = mongoose.model('process', processSchema);
export default processModel;
