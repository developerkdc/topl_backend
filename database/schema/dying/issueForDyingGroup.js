import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const IssuedForDyingGroupSchema = new mongoose.Schema({
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'group',
    required: true,
  },

  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['issued for dying', 'dyed'],
    default: 'issued for dying',
  },
  issued_for_dying_group_remarks: {
    type: String,
  },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const IssuedForDyingGroupModel = mongoose.model(
  'issued_for_dying_group',
  IssuedForDyingGroupSchema
);
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
    $unwind: '$group_id',
  },
  {
    $lookup: {
      from: 'raw_materials', // Assuming "items" is the collection name for item details
      localField: 'group_id.item_details',
      foreignField: '_id',
      as: 'group_id.item_details',
    },
  },
];
LogSchemaFunction('issuedForDyingGroup', IssuedForDyingGroupModel, lookup);
