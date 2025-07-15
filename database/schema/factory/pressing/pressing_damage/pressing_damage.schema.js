import mongoose from 'mongoose';
import {
  base_type_constants,
  consumed_from_constants,
  issues_for_status,
  order_category,
} from '../../../../Utils/constants/constants.js';

const pressing_damage_schema = new mongoose.Schema(
  {
    sr_no: Number,
    pressing_done_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'issue for tapping id is required'],
    },
    no_of_sheets: {
      type: Number,
      default: 0,
      required: [true, 'No of leaves is required'],
    },
    sqm: {
      type: Number,
      default: 0,
      required: [true, 'SQM is required'],
    },
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
    updated_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Updated By is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// indexing
const indexingFields = [[{ created_by: 1 }], [{ updatedAt: 1 }]];

indexingFields.forEach((index) => pressing_damage_schema.index(...index));

export const pressing_damage_model = mongoose.model(
  'pressing_damage',
  pressing_damage_schema,
  'pressing_damage'
);
