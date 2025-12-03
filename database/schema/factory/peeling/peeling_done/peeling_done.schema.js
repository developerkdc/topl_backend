import mongoose from 'mongoose';
import {
  issues_for_status,
  peeling_done,
} from '../../../../Utils/constants/constants.js';

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
    isEditable: {
      type: Boolean,
      default: true,
    },
    total_cmt: {
      type: Number,
      required: [true, 'Total Cmt is required'],
    },
    total_amount: {
      type: Number,
      required: [true, 'Total Amount is required'],
    },
    wastage_consumed_total_amount: {
      type: Number,
      default: 0,
    },
    final_amount: {
      type: Number,
      default: function () {
        return this.total_amount + this.wastage_consumed_total_amount;
      },
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

const veneer_output_type_not_required_field = function () {
  return this.output_type !== peeling_done.veneer;
};

const core_face_output_type_not_required_field = function () {
  return (
    this.output_type !== peeling_done.face && this.output_type !== peeling_done.core
  );
}

const peeling_done_items_schema = new mongoose.Schema(
  {
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
    log_no: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Log No is required'],
    },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Code is required'],
    },
    side: {
      type: String,
      default: 'A',
      uppercase: true,
      trim: true,
    },
    log_no_code: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Log No Code is required'],
    },
    item_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Item Name is required'],
    },
    item_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Item Name ID is required'],
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items Sub-Category Id is required'],
    },
    item_sub_category_name: {
      type: String,
      required: [true, 'Item Sub-Category Name is required'],
      trim: true,
      uppercase: true,
    },
    length: {
      type: Number,
      default: 0,
      required: [veneer_output_type_not_required_field, 'Length is required'],
    },
    width: {
      type: Number,
      default: 0,
      required: [veneer_output_type_not_required_field, 'Width is required'],
    },
    // height: {
    //   type: Number,
    //   default: 0,
    //   required: [veneer_output_type_not_required_field, 'Height is required'],
    // },
    thickness: {
      type: Number,
      default: 0,
      required: [true, 'Thickness is required'],
    },
    no_of_leaves: {
      type: Number,
      default: 0,
      required: [true, 'No of leaves is required'],
    },
    cmt: {
      type: Number,
      default: 0,
      required: [veneer_output_type_not_required_field, 'CMT is required'],
    },
    color_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    color_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    character_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [core_face_output_type_not_required_field, 'Character ID is required'],
    },
    character_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [core_face_output_type_not_required_field, 'Character Name is required'],
    },
    pattern_id: {
      type: mongoose.Schema.Types.ObjectId,
      required:  [core_face_output_type_not_required_field, 'Pattern ID is required'],
    },
    pattern_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [core_face_output_type_not_required_field, 'Pattern Name is required'],
    },
    series_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [core_face_output_type_not_required_field, 'Series ID is required'],
    },
    series_name: {
      type: String,
      uppercase: true,
      trim: true,
      required:[core_face_output_type_not_required_field, 'Series Name is required'],
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Grade ID is required'],
    },
    grade_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Grade Name is required'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [issues_for_status.dressing, issues_for_status.pressing],
        message: `Invalid type {{VALUE}} it must be one of the ${peeling_done.veneer}, ${peeling_done.face} or ${peeling_done.core}`,
      },
      default: null,
    },
    is_dressing_done: {
      type: Boolean,
      default: false,
    },
    item_amount: {
      type: Number,
      default: 0,
      required: [
        veneer_output_type_not_required_field,
        'Item Amount is required',
      ],
    },
    item_wastage_consumed_amount: {
      type: Number,
      default: 0,
    },
    item_total_amount: {
      type: Number,
      default: function () {
        return this.item_amount + this.item_wastage_consumed_amount;
      },
      required: [true, 'Item Total Amount is required'],
    },
    remark: {
      type: String,
      uppercase: true,
      trim: true,
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
  {
    timestamps: true,
  }
);

peeling_done_items_schema.index({ peeling_done_other_details_id: 1 });
peeling_done_items_schema.index({ log_no_code: 1 }, { unique: true });

export const peeling_done_items_model = mongoose.model(
  'peeling_done_items',
  peeling_done_items_schema,
  'peeling_done_items'
);
