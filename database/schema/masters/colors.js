import mongoose from 'mongoose';

const colorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Color Name is required'],
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

colorSchema.index({ name: 1 }, { unique: true });

const colorModel = mongoose.model('colors', colorSchema);
export default colorModel;
