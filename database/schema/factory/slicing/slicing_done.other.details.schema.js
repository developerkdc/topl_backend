import mongoose from 'mongoose';

const slicing_done_other_details_schema = new mongoose.Schema(
  {
    issue_for_slicing_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'issue for slicing id is required'],
    },
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
      trim: true,
      uppercase: true,
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

    wastage_slicing_details: {
      actual_height: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Actual Height is required.',
        ],
      },
      wastage_height: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Wastage Height is required.',
        ],
      },
      actual_width: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Actual width is required.',
        ],
      },
      wastage_width: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Wastage Width is required.',
        ],
      },
      actual_length: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Actual Length is required.',
        ],
      },
      wastage_length: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Wastage Length is required.',
        ],
      },
      actual_cmt: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Actual CMT is required.',
        ],
      },
      wastage_cmt: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Wastage CMT is required.',
        ],
      },
      total_wastage_amount: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Total Wastage Amount is required.',
        ],
      },
      wastage_consumed_amount: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'wastage';
          },
          'Wastage Consumed Amount is required.',
        ],
      },
    },
    available_slicing_details: {
      actual_height: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'rest_roller';
          },
          'Actual Height is required.',
        ],
      },
      available_height: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'rest_roller';
          },
          'Available Height is required.',
        ],
      },
      actual_width: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'rest_roller';
          },
          'Actual width is required.',
        ],
      },
      available_width: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'rest_roller';
          },
          'Available Width is required.',
        ],
      },
      actual_length: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'rest_roller';
          },
          'Actual Length is required.',
        ],
      },
      available_length: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'rest_roller';
          },
          'Available Length is required.',
        ],
      },
      actual_cmt: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'rest_roller';
          },
          'Actual CMT is required.',
        ],
      },
      available_cmt: {
        type: Number,
        default: 0,
        required: [
          function () {
            return this.type === 'rest_roller';
          },
          'Available CMT is required.',
        ],
      },
    },
    wastage_consumed_total_amount: {
      type: Number,
      default: 0,
      required: [
        function () {
          return this.type === 'wastage';
        },
        'Wastage Consumed Total Amount is required.',
      ],
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

slicing_done_other_details_schema.index({ type: 1 });

const slicing_done_other_details_model = mongoose.model(
  'slicing_done_other_details',
  slicing_done_other_details_schema,
  'slicing_done_other_details'
);

export default slicing_done_other_details_model;
