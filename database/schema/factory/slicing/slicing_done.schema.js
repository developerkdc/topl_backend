import mongoose from 'mongoose';

const slicing_done_schema = new mongoose.Schema({
  slicing_date: {
    type: Date,
    required: [true, 'Slicing Date is required'],
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
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['wastage', 'rest_roller'],
      message:
        'Invalid type {{VALUES}} it must be one of the wastage or rest_roller ',
    },
  },
});
