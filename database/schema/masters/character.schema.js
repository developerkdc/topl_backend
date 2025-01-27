import mongoose from 'mongoose';

const chararterSchema = new mongoose.Schema(
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
      required: [true, 'Character Name is required'],
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

chararterSchema.index({ name: 1 }, { unique: true });
chararterSchema.index({ sr_no: 1 }, { unique: true });
chararterSchema.index({ created_by: 1 });
chararterSchema.index({ updated_by: 1 });
const characterModel = mongoose.model('characters', chararterSchema);
export default characterModel;
