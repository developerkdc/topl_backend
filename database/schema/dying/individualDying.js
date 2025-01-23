import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const IndividualDyingSchema = new mongoose.Schema({
  issued_dying_quantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  // issued_dying_quantity: {
  //   natural: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   dyed: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   smoked: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   total: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  // },
  item_details: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'raw_material',
    required: [true, 'Item ID is required'],
  },
  // issued_individual_dying_id: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   required: [true, "issued individual dying id is required"],
  // },
  dying_images: {
    type: Array,
  },
  // issued_for_dying_date: {
  //   type: Date,
  //   required: [true, "Issued for dying Date is required"],
  // },
  date_of_dying: {
    type: Date,
    required: [true, 'Date of dying is required'],
  },
  in_time: {
    type: Date,
    required: [true, 'In Time is required'],
  },
  process_time: {
    type: Number,
    required: [true, 'Out Time is required'],
  },
  out_time: {
    type: Date,
    required: [true, 'Date of Grouping is required'],
  },
  consumed_item_name_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'item_name',
    required: [true, 'Consumed Item Name ID is required.'],
  },
  consumed_item_name: {
    type: String,
    required: [true, 'Consumed Item Name is required.'],
  },
  liters_of_ammonia_used: {
    type: Number,
    required: [true, 'Liters of Ammonia used is required'],
  },
  created_employee_id: {
    type: String,
    required: true,
    trim: true,
  },
  individual_dying_remarks: {
    type: String,
  },
  status: {
    type: String,
    enum: ['dyed', 'passed', 'rejected'],
    default: 'dyed',
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const IndividualDyingModel = mongoose.model(
  'individual_dying',
  IndividualDyingSchema
);

LogSchemaFunction('individualDying', IndividualDyingModel);
