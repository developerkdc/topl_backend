import mongoose from 'mongoose';

const chararterSchema = new mongoose.Schema(
  {
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

const characterModel = mongoose.model('characters', chararterSchema);
export default characterModel;
