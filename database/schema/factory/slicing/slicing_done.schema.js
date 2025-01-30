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

export const slicing_done_other_details_model = mongoose.model(
  'slicing_done_other_details',
  slicing_done_other_details_schema,
  'slicing_done_other_details'
);

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

export const slicing_done_items_model = mongoose.model(
  'slicing_done_items',
  slicing_done_items_schema,
  'slicing_done_items'
);
