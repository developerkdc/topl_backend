import mongoose from 'mongoose';

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
processSchema.index({ created_by: 1 });
processSchema.index({ updated_by: 1 });

const processModel = mongoose.model('process', processSchema);
export default processModel;
