import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, "Sr.No is required"],
      // unique: [true, "Sr.No must be unique"]
    },
    vehicle_number: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Vehicle No is required'],
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

vehicleSchema.index({ vehicle_number: 1 }, { unique: true });
vehicleSchema.index({ sr_no: 1 }, { unique: true });
vehicleSchema.index({ created_by: 1 })
vehicleSchema.index({ updated_by: 1 })

const vehicleModel = mongoose.model('vehicles', vehicleSchema);
export default vehicleModel;
