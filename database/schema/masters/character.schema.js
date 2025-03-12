import mongoose from 'mongoose';

const characterSchema = new mongoose.Schema(
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

characterSchema.index({ name: 1 }, { unique: true });
characterSchema.index({ sr_no: 1 }, { unique: true });
characterSchema.index({ created_by: 1 });
characterSchema.index({ updated_by: 1 });
const characterModel = mongoose.model('characters', characterSchema);
export default characterModel;
