import mongoose from "mongoose";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import { approval_status } from "../../../Utils/approvalStatus.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";

const crosscutting_approval_schema = new mongoose.Schema(
  {
    issue_for_crosscutting_data: {
      type: {},
    },
    unique_identifier: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Log Croscutting id is required"],
    },
    crosscutting_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Croscutting done id is required"],
    },
    issue_for_crosscutting_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "issues_for_crosscutting",
      required: [true, "issue for croscutting id is required"],
    },
    log_inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "log_inventory_items_details",
      required: [true, "Log Inventory Items Id is required"],
    },
    machine_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "machine id is required"],
    },
    machine_name: {
      type: String,
      required: [true, "machine name is required"],
    },
    log_no: {
      type: String,
      required: [true, "log number is required"],
    },
    code: {
      type: String,
      trim: true,
      required: [true, "code is required"],
    },
    log_no_code: {
      type: String,
      trim: true,
      required: [true, "code is required"],
    },
    length: {
      type: Number,
      required: [true, "length is required"],
    },
    girth: {
      type: Number,
      required: [true, "girth is required"],
    },
    crosscut_cmt: {
      type: Number,
      required: [true, "crosscut cmt is required"],
    },
    cost_amount: {
      type: Number,
      required: [true, "cost_amount is required"],
    },
    per_cmt_cost: {
      type: Number,
      required: [true, "per_cmt_cost is required"],
    },
    expense_amount: {
      type: Number,
      default: 0,
    },
    sqm_factor: {
      type: Number,
      required: [true, "factor is required"],
    },
    issue_status: {
      type: String,
      enum: {
        values: [issues_for_status.crosscut_done, issues_for_status.flitching],
        message: `Invalid status {{VALUE}} Issue Status must either be one of ${issues_for_status.crosscut_done}, ${issues_for_status.flitching}}`,
      },
      default: issues_for_status.crosscut_done,
    },
    wastage_info: {
      wastage_sqm: {
        type: Number,
        required: [true, "wastage_sqm is required"],
      },
      wastage_length: {
        type: Number,
        required: [true, "wastage_length is required"],
      },
    },
    worker_details: {
      crosscut_date: {
        type: Date,
        required: [true, "flicthing date is required"],
      },
      workers: {
        type: Number,
        required: [true, "workers are required"],
      },
      shift: {
        type: String,
        required: [true, "shift is required"],
      },
      working_hours: {
        type: Number,
        required: [true, "working hours are required"],
      },
    },
    required_hours: {
      type: Number,
      required: [true, "Required hours is required"],
    },
    required_workers: {
      type: Number,
      required: [true, "Required workers is required"],
    },
    remarks: {
      type: String,
      default: null,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    approval_status: approval_status,
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, "created by is required"],
    },
    deleted_at: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

crosscutting_approval_schema.add(approvalSchema);

crosscutting_approval_schema.index({ issue_for_crosscutting_id: -1 });
crosscutting_approval_schema.index({ code: -1 });
crosscutting_approval_schema.index({ issue_for_crosscutting_id: -1, code: -1 });

export const crosscutting_done_approval_model = mongoose.model(
  "crosscutting_done_approval",
  crosscutting_approval_schema
);
