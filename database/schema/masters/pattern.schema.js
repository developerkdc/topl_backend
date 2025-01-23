import mongoose from 'mongoose';

const patternSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, "Sr.No is required"],
      // unique: [true, "Sr.No must be unique"]
    },
    name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Pattern Name is required'],
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

patternSchema.index({ name: 1 }, { unique: true });
patternSchema.index({ sr_no: 1 }, { unique: true });
patternSchema.index({ created_by: 1 })
patternSchema.index({ updated_by: 1 })

const patternModel = mongoose.model('patterns', patternSchema);
export default patternModel;
