import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const IndividualSmokeSchema = new mongoose.Schema({
  issued_smoking_quantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  // issued_smoking_quantity: {
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
    required: [true, 'Item ID is required.'],
  },
  // issued_individual_smoking_id: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   required: [true, "issued individual smoking id is required"],
  // },
  smoke_images: {
    type: Array,
  },
  // issued_for_smoking_date: {
  //   type: Date,
  //   required: [true, "Issued for smoking Date is required"],
  // },
  date_of_smoking: {
    type: Date,
    required: [true, 'Date of Smoking is required.'],
  },
  in_time: {
    type: Date,
    required: [true, 'In Time is required.'],
  },
  process_time: {
    type: Number,
    required: [true, 'Out Time is required.'],
  },
  out_time: {
    type: Date,
    required: [true, 'Date of Grouping is required.'],
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
    required: [true, 'Liters of Ammonia used is required.'],
  },
  created_employee_id: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['smoked', 'passed', 'rejected'],
    default: 'smoked',
  },
  individual_smoked_remarks: {
    type: String,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const IndividualSmokeModel = mongoose.model(
  'individual_smoke',
  IndividualSmokeSchema
);

const lookup = [
  {
    $lookup: {
      from: 'raw_materials',
      localField: 'item_details',
      foreignField: '_id',
      as: 'item_details',
    },
  },
  {
    $unwind: {
      path: '$item_details',
      preserveNullAndEmptyArrays: true,
    },
  },
];
LogSchemaFunction('individualSmoke', IndividualSmokeModel, lookup);
