import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const ReadySheetFormInventoryHistorySchema = new mongoose.Schema({
  group_no: {
    type: Number,
    required: true,
  },
  tapping_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "taping",
    required: true,
  },

  ready_sheet_form_width: {
    type: Number,
    required: true,
  },
  ready_sheet_form_length: {
    type: Number,
    required: true,
  },
  ready_sheet_form_sqm: {
    type: Number,
    required: true,
  },

  ready_sheet_form_no_of_pcs_original: {
    type: Number,
    required: true,
  },

  ready_sheet_form_no_of_pcs_available: {
    type: Number,
    required: true,
  },

  ready_sheet_form_pallete_no: {
    type: String,
  },
  ready_sheet_form_physical_location: {
    type: String,
  },

  ready_sheet_form_rejected_pcs: {
    type: Number,
    default: 0,
  },

  ready_sheet_form_approved_pcs: {
    type: Number,
    default: 0,
  },

  status: {
    type: String,
  },

  remarks: {
    type: String,
    default: null,
  },

  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    trim: true,
  },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const ReadySheetFormHistoryModel = mongoose.model(
  "ready_sheet_form_inventory_history",
  ReadySheetFormInventoryHistorySchema
);
LogSchemaFunction("readySheetFormInventoryHistory", ReadySheetFormHistoryModel);
