import mongoose from 'mongoose';
import { item_issued_from } from '../../../../Utils/constants/constants.js';

const canvas_done_details_schema = new mongoose.Schema(
  {
    sr_no: Number,
    issue_for_canvas_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Issue for canvas is required."]
    },
    canvas_date: {
      type: Date,
      required: [true, "canvas Date is required."]
    },
    no_of_workers: {
      type: Number,
      required: [true, "No. of workers are required."]
    },
    working_hours: {
      type: Number,
      required: [true, "Working hours is required."]
    },
    shift: {
      type: String,
      uppercase: true,
      required: [true, "Shift is required."]
    },
    total_hours: {
      type: Number,
      required: [true, "Total Hours is required."]
    },
    no_of_sheets: {
      type: Number,
      required: [true, "No.of Sheets are required."]
    },
    sqm: {
      type: Number,
      required: [true, "SQM is required."]
    },
    amount: {
      type: Number,
      required: [true, "Amount is required."]
    },
    available_details: {
      no_of_sheets: {
        type: Number,
        default: function () {
          return this.no_of_sheets
        }
      },
      sqm: {
        type: Number,
        default: function () {
          return this.sqm
        }
      },
      amount: {
        type: Number,
        default: function () {
          return this.amount
        }
      },
    },
    issue_status: {
      type: String,
      enum: {
        values: [item_issued_from?.pressing_factory, item_issued_from?.canvas_factory, item_issued_from?.color_factory, item_issued_from?.bunito_factory, item_issued_from?.polishing_factory],
        message: `Invalid Type -> {{VALUE}} , it must be one of the ${(item_issued_from?.pressing_factory, item_issued_from?.canvas_factory, item_issued_from?.color_factory, item_issued_from?.bunito_factory, item_issued_from?.polishing_factory)}`
      }
    },
    isEditable: {
      type: Boolean,
      default: true
    },
    remark: {
      type: String,
      default: null,
      uppercase: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By is required.'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By is required.'],
    },
  },
  { timestamps: true }
);

const indexed_fields = [[{ issue_for_canvas_id: 1 }], [{ sr_no: 1 }, { unique: true }]]
indexed_fields?.forEach((field) => canvas_done_details_schema.index(...field))


export const canvas_done_details_model = mongoose.model(
  'canvas_done_details',
  canvas_done_details_schema,
  'canvas_done_details'
);
