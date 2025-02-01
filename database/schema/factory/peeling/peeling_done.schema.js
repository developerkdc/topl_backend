import mongoose from 'mongoose';
import { peeling_done } from '../../../Utils/constants/constants.js';

const peeling_done_other_details_schema = new mongoose.Schema(
  {
    issue_for_peeling_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'issue for pelling id is required'],
    },
    peeling_date: {
      type: Date,
      required: [true, 'Peeling Date is required'],
    },
    no_of_workers: {
      type: Number,
      required: [true, 'No.of Workers is required '],
    },
    no_of_working_hours: {
      type: Number,
      required: [true, 'No. of Working hours is required'],
    },
    no_of_total_hours: {
      type: Number,
      required: [true, 'No. of Total hours is required'],
    },
    shift: {
      type: String,
      required: [true, 'Shift is required'],
      trim: true,
      uppercase: true,
    },
    wastage_consumed_total_amount: {
      type: Number,
      default: 0,
    },
    remark: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By Id is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By Id is required'],
    },
  },
  { timestamps: true }
);

peeling_done_other_details_schema.index({ type: 1 });
peeling_done_other_details_schema.index(
  { issue_for_peeling_id: 1 },
  { unique: true }
);

export const peeling_done_other_details_model = mongoose.model(
  'peeling_done_other_details',
  peeling_done_other_details_schema,
  'peeling_done_other_details'
);

const output_type_validate = function () {
  const output_type = this.output_type;
  return output_type !== peeling_done.veneer;
};

const peeling_done_items_schema = new mongoose.Schema({
  sr_no: {
    type: Number,
    required: [true, 'Sr No. is required'],
  },
  peeling_done_other_details_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'peeling_done_other_details',
    required: [true, 'Peeling Done other details id is required'],
  },
  output_type: {
    type: String,
    enum: {
      values: [peeling_done.veneer, peeling_done.face, peeling_done.core],
      message: `Invalid type {{VALUE}} it must be one of the ${peeling_done.veneer}, ${peeling_done.face} or ${peeling_done.core}`,
    },
    required: [true, 'Output Type is required'],
  },
  item_name: {
    type: String,
    required: [true, 'Item Name is required'],
  },
  item_name_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Item Name ID is required'],
  },
  log_no_code: {
    type: String,
    required: [true, 'Log No Code is required'],
  },
  log_no: {
    type: String,
    required: [true, 'Log No is required'],
  },
  code: {
    type: String,
    required: [true, 'Code is required'],
  },
  length: {
    type: Number,
    required: [output_type_validate, 'Length is required'],
  },
  width: {
    type: Number,
    required: [output_type_validate, 'Width is required'],
  },
  height: {
    type: Number,
    required: [output_type_validate, 'Height is required'],
  },
  thickness: {
    type: Number,
    required: [output_type_validate, 'Thickness is required'],
  },
  no_of_leaves: {
    type: Number,
    required: [output_type_validate, 'No of leaves is required'],
  },
  cmt: {
    type: Number,
    required: [true, 'CMT is required'],
  },
  color_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  color_name: {
    type: String,
    default: null,
  },
  character_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Charcter ID is required'],
  },
  character_name: {
    type: String,
    required: [true, 'Charcter Name is required'],
  },
  pattern_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Pattern ID is required'],
  },
  pattern_name: {
    type: String,
    required: [true, 'Pattern Name is required'],
  },
  series_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Series ID is required'],
  },
  series_name: {
    type: String,
    required: [true, 'Series Name is required'],
  },
  grade_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Grade ID is required'],
  },
  grade_name: {
    type: String,
    required: [true, 'Grade Name is required'],
  },
  issued_for_dressing: {
    type: Boolean,
    default: false,
  },
  item_total_amount: {
    type: Number,
    required: [true, 'Total Amount is required'],
  },
  item_wastage_consumed_amount: {
    type: Number,
    default: 0,
  },
  remark: {
    type: String,
    default: null,
  },
});

peeling_done_items_schema.index({ sr_no: 1 }, { unique: true });
peeling_done_items_schema.index({ peeling_done_other_details_id: 1 });

export const peeling_done_items_model = mongoose.model(
  'peeling_done_items',
  peeling_done_items_schema,
  'peeling_done_items'
);
