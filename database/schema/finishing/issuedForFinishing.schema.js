import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const IssuedForFinishingSchema = new mongoose.Schema({
  issued_for_pressing_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "issued_for_pressing",
    required: true,
  },
  group_no: {
    type: Number,
    required: true,
  },

  tapping_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "taping",
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

  pressing_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "pressing",
    required: true,
  },

  available_pressed_pcs: {
    type: Number,
    required: true,
  },

  status: {
    type: String,
    enum: [
      "pending",
      "open grain",
      "sent for open grain",
      "metallic",
      "sent for metallic",
      "sent for rejected",
      "qc done",
      "rejected",
    ],
    default: "pending",
  },

  revert_status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },

  status_updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    trim: true,
    default: null,
  },

  remarks: {
    type: String,
  },

  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    trim: true,
  },

  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const IssuedForFinishingModel = mongoose.model(
  "issued_for_finishing",
  IssuedForFinishingSchema
);
LogSchemaFunction("issuedForFinishing", IssuedForFinishingModel);
