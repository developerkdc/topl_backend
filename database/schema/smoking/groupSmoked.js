import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const GroupSmokeSchema = new mongoose.Schema({
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'group',
    required: true,
  },
  // issued_for_smoking_date: {
  //   type: Date,
  //   required: [true, "Issued for smoking Date is required"],
  // },
  date_of_smoking: {
    type: Date,
    required: [true, 'Date of Smoking is required'],
  },
  item_details: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'raw_material',
      required: [true, 'Item ID is required'],
    },
  ],
  // issued_group_smoking_id: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   required: [true, "issued group smoking id is required"],
  // },
  smoke_images: {
    type: Array,
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
  status: {
    type: String,
    enum: ['smoked', 'passed', 'rejected'],
    default: 'smoked',
  },
  group_smoked_remarks: {
    type: String,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const GroupSmokeModel = mongoose.model('group_smoke', GroupSmokeSchema);

const lookup = [
  {
    $lookup: {
      from: 'groups',
      localField: 'group_id',
      foreignField: '_id',
      as: 'group_id',
    },
  },
  {
    $unwind: {
      path: '$group_id',
      preserveNullAndEmptyArrays: true,
    },
  },
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
      path: '$group_id',
      preserveNullAndEmptyArrays: true,
    },
  },
];
LogSchemaFunction('groupSmoke', GroupSmokeModel, lookup);
