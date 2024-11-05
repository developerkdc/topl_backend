import mongoose from "mongoose";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import { approval_status } from "../../../Utils/approvalStatus.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";

const flitching_approval_schema = new mongoose.Schema(
  {
    unique_identifier: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Unique Identifier id is required"],
    },
    flitching_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Log Flitching id is required"],
    },
    issue_for_flitching_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "issues_for_flitching",
      required: [true, "Issue for flitching Id is required"],
    },
    log_inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "log_inventory_items_details",
      required: [true, "Log Inventory Items Id is required"],
    },
    crosscut_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "crosscutting_done",
      default: null,
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
    flitch_code: {
      type: String,
      required: [true, "flitch code is required"],
    },
    log_no_code: {
      type: String,
      required: [true, "Log No Code  is required"],
    },
    flitch_formula: {
      type: String,
      required: [true, "flitch flitch is required"],
    },
    length: {
      type: Number,
      required: [true, "length is required"],
    },
    width1: {
      type: Number,
      required: [true, "width1 is required"],
    },
    width2: {
      type: Number,
      required: [true, "width2 is required"],
    },
    width3: {
      type: Number,
      required: [true, "width3 is required"],
    },
    height: {
      type: Number,
      required: [true, "height is required"],
    },
    flitch_cmt: {
      type: Number,
      required: [true, "crosscut cmt is required"],
    },
    sqm_factor: {
      type: Number,
      required: [true, "sqm factor is required"]
    },
    wastage_info: {
      wastage_sqm: {
        type: Number,
        required: [true, "wastage sqm is required"]
      },
      wastage_length: {
        type: Number,
        required: [true, "wastage length is required "]
      }
    },
    worker_details: {
      flitching_date: {
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
    per_cmt_cost: {
      type: Number,
      required: [true, "per_cmt_cost is required"],
    },
    cost_amount: {
      type: Number,
      required: [true, "cost_amount is required"],
    },
    required_hours: {
      type: Number,
      required: [true, "required hours is required"]
    },
    required_workers: {
      type: Number,
      required: [true, "required workers is required"]
    },
    expense_amount: {
      type: Number,
      required: [true, "expense amount is required"]
    },
    remarks: {
      type: String,
      default: null,
    },
    approval_status: approval_status,
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "created by is required"],
    },
    deleted_at: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

flitching_approval_schema.add(approvalSchema);

// flitching_approval_schema.index({ issue_for_crosscutting_id: -1 });
// flitching_approval_schema.index({ code: -1 });
// flitching_approval_schema.index({ issue_for_crosscutting_id: -1, code: -1 });

export const flitching_approval_model = mongoose.model(
  "flitching_approval",
  flitching_approval_schema
);
