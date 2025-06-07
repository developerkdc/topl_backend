import mongoose from 'mongoose';
import { transporter_type } from '../../Utils/constants/constants.js';

const vehicleSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
      // unique: [true, "Sr.No must be unique"]
    },
    vehicle_number: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Vehicle No is required'],
    },
    invoice_date: {
      type: Date,
      required: [true, 'RC validity date is required.'],
      default: null,
    },
    type: {
      type: String,
      enum: {
        values: [transporter_type.part_load, transporter_type.full_load],
        message: `Invalid type {{VALUE}}, type must either be one of ${[transporter_type.part_load, transporter_type.full_load].join(',')}`,
      },
      uppercase: true,
      required: [true, 'Transporter type is required'],
    },
    transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'transporters',
      required: [true, 'Transporter is required.'],
    },
    transporter_details: {
      type: Object,
      required: [true, 'Transporter Details is required.'],
    },
    rc_number: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'RC Number is required.'],
    },
    rc_validity: {
      type: Date,
      required: [true, 'RC validity date is required.'],
      default: null,
    },
    rto_passing_weight: {
      type: Number,
      required: [true, 'RTO passing Weight is required.'],
      default: 0,
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required.'],
      default: 0,
    },
    freight_amount: {
      type: Number,
      required: [true, 'Freight Amount is required.'],
      default: 0,
    },

    driver_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Driver Name is required.'],
    },
    driver_licence_number: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Driver Licence Number is required.'],
    },
    licence_validity: {
      type: Date,
      required: [true, 'Licence validity date is required.'],
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

vehicleSchema.index({ vehicle_number: 1 });
vehicleSchema.index({ sr_no: 1 }, { unique: true });
vehicleSchema.index({ invoice_date: 1 });
vehicleSchema.index({ sr_no: 1 });
vehicleSchema.index({ sr_no: 1 });
vehicleSchema.index({ created_by: 1 });
vehicleSchema.index({ updated_by: 1 });

const vehicleModel = mongoose.model('vehicles', vehicleSchema);
export default vehicleModel;
