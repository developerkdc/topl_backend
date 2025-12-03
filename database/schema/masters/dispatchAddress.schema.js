import mongoose from 'mongoose';

const dispatchAddressSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
      // unique: [true, "Sr.No must be unique"]
    },
    address: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Address is required'],
      unique: [true, 'Address must be unique'],
    },
    country: {
      type: String,
      trim: true,
      required: [true, 'country is required'],
    },
    state: {
      type: String,
      trim: true,
      required: [true, 'state is required'],
    },
    city: {
      type: String,
      trim: true,
      required: [true, 'city is required'],
    },
    pincode: {
      type: String,
      trim: true,
      required: [true, 'pincode is required'],
    },
    gst_number: {
      type: String,
      trim: true,
      required: [true, 'gst number is required'],
    },
    is_primary: {
      type: Boolean,
      default: false,
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

dispatchAddressSchema.index({ sr_no: 1 }, { unique: true });
dispatchAddressSchema.index({ created_by: 1 });
dispatchAddressSchema.index({ updated_by: 1 });
dispatchAddressSchema.index({ pincode: 1 });
dispatchAddressSchema.index({ gst_number: 1 });

const dispatchAddressModel = mongoose.model(
  'dispatchAddress',
  dispatchAddressSchema,
  'dispatchAddress'
);
export default dispatchAddressModel;
