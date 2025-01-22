import mongoose from 'mongoose';
import LogSchemaFunction from '../../LogsSchema/logs.schema.js';

const GroupSchema = new mongoose.Schema({
  group_no: {
    type: Number,
    unique: true,
    required: [true, 'Group No is required'],
  },
  item_details: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'raw_material',
      required: [true, 'Item ID is required'],
    },
  ],
  total_item_sqm_original: {
    type: Number,
    required: [true, 'Total Item SQM is required'],
  },
  total_item_sqm_available: {
    type: Number,
    required: [true, 'Total Item SQM Available is required'],
  },
  group_pcs: {
    type: Number,
    required: [true, 'Group No Of PCs  is required'],
  },
  group_length: {
    type: Number,
    required: [true, 'Group Length is required'],
  },
  group_width: {
    type: Number,
    required: [true, 'Group Width is required'],
  },

  group_no_of_pattas_original: {
    type: Number,
    required: [true, 'Group No Of Pattas Original is required'],
  },
  group_no_of_pattas_available: {
    type: Number,
    required: [true, 'Group No Of Pattas Available is required'],
  },
  group_sqm_available: {
    type: Number,
    required: [true, 'Group Sqm Available is required'],
  },
  group_grade: {
    type: String,
    required: [true, 'Grade is required'],
  },
  orientation: {
    type: String,
    required: [true, 'Orientation is required'],
  },
  book_type: {
    type: String,
    required: [true, 'Book Type is required'],
  },
  group_pallete_no: {
    type: String,
    required: [true, 'Pallete No is required'],
  },
  group_physical_location: {
    type: String,
    required: [true, 'Physical Location is required'],
  },
  group_images: {
    type: Array,
  },
  date_of_grouping: {
    type: Date,
    required: [true, 'Date of Grouping is required'],
  },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: [
      'available',
      'issued for smoking',
      'not available',
      'issued for dying',
    ],
    default: 'available',
  },
  split: {
    type: Boolean,
    default: false,
  },
  group_remarks: {
    type: String,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const GroupModel = mongoose.model('group', GroupSchema);

const lookup = [
  {
    $lookup: {
      from: 'raw_materials',
      localField: 'item_details',
      foreignField: '_id',
      as: 'item_details',
    },
  },
];
LogSchemaFunction('group', GroupModel, lookup);
