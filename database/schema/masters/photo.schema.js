import mongoose, { Schema } from 'mongoose';

const photoSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
      // unique: [true, "Sr.No must be unique"]
    },
    photo_number: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Pattern Name is required'],
    },
    banner_image: {
      type: Schema.Types.Mixed,
      required: [true, 'Banner Images is required'],
    },
    images: {
      type: [Schema.Types.Mixed],
      default: null,
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

photoSchema.index({ photo_number: 1 }, { unique: true });
photoSchema.index({ sr_no: 1 }, { unique: true });
photoSchema.index({ created_by: 1 });
photoSchema.index({ updated_by: 1 });

const photoModel = mongoose.model('photos', photoSchema, 'photos');
export default photoModel;
