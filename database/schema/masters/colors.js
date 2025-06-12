import mongoose from 'mongoose';
import { color_type } from '../../Utils/constants/constants.js';

const colorSchema = new mongoose.Schema(
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
      default: null,
    },
    type: {
      type: String,
      enum: {
        values: [
          color_type.timber,
          color_type.pre_pressing,
          color_type.post_pressing,
        ],
        message: `{VALUE} is not a valid color type`,
      },
      required: [true, 'Color Type is required'],
      uppercase: true,
      trim: true,
    },
    process_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    process_name: {
      type: String,
      uppercase: true,
      trim: true,
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

colorSchema.index({ name: 1 }, { unique: true });
colorSchema.index({ sr_no: 1 }, { unique: true });
colorSchema.index({ type: 1 });
colorSchema.index({ process_name: 1 });
colorSchema.index({ created_by: 1 });
colorSchema.index({ updated_by: 1 });

const colorModel = mongoose.model('colors', colorSchema);
export default colorModel;
