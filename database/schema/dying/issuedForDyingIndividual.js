import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const IssuedForDyingIndividualSchema = new mongoose.Schema({
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'raw_material',
    required: true,
  },
  issued_dying_quantity: {
    type: Number,
    trim: true,
    required: true,
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
  status: {
    type: String,
    enum: ['issued for dying', 'dyed'],
    default: 'issued for dying',
  },
  issued_for_dying_individual_remarks: {
    type: String,
  },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    trim: true,
  },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const IssuedForDyingIndividualModel = mongoose.model(
  'issued_for_dying_individual',
  IssuedForDyingIndividualSchema
);
const lookup = [
  {
    $lookup: {
      from: 'raw_materials',
      localField: 'item_id',
      foreignField: '_id',
      as: 'item_id',
    },
  },
  {
    $unwind: {
      path: '$item_id',
      preserveNullAndEmptyArrays: true,
    },
  },
];
LogSchemaFunction(
  'issuedForDyingIndividual',
  IssuedForDyingIndividualModel,
  lookup
);
