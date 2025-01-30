import mongoose from 'mongoose';

const slicing_done_items_schema = new mongoose.Schema({
  sr_no: {
    type: Number,
    required: [true, 'Sr No. is required'],
  },
  slicing_done_other_details_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'slicing_done_other_details',
    required: [true, 'Slicing Done other details id is required'],
  },
  slicing_done_other_details_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'slicing_done_other_details',
    required: [true, 'Slicing Done other details id is required'],
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
  flitch_no: {
    type: String,
    required: [true, 'Flitch No is required'],
  },
  flitch_side: {
    type: String,
    required: [true, 'Flitch Side is required'],
  },
  length: {
    type: Number,
    required: [true, 'Length is required'],
  },
  width: {
    type: Number,
    required: [true, 'Width is required'],
  },
  height: {
    type: Number,
    required: [true, 'Height is required'],
  },
  thickness: {
    type: Number,
    required: [true, 'Thickness is required'],
  },
  no_of_leaves: {
    type: Number,
    required: [true, 'No of leaves is required'],
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
