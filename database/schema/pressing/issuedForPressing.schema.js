import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const IssuedForPressingSchema = new mongoose.Schema({
  group_no: {
    type: Number,
    required: true,
  },
  ready_sheet_form_inventory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ready_sheet_form_inventory",
    required: true,
  },
  ready_sheet_form_history_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ready_sheet_form_inventory_history",
    required: true,
  },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    trim: true,
  },
  issued_for_pressing_remarks: {
    type: String,
  },
  revert_status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const IssuedForPressingModel = mongoose.model(
  "issued_for_pressing",
  IssuedForPressingSchema
);
LogSchemaFunction("issuedForPressing", IssuedForPressingModel);
