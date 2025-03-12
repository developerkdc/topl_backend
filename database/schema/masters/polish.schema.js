import mongoose from 'mongoose';

const polishSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
    },
    name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Polish Name is required'],
    },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Polish Code is required'],
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

polishSchema.index({ name: 1 }, { unique: true });
polishSchema.index({ sr_no: 1 }, { unique: true });
polishSchema.index({ created_by: 1 });
polishSchema.index({ updated_by: 1 });
const polishModel = mongoose.model('polish', polishSchema);
export default polishModel;
