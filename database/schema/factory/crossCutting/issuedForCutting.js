import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const IssuedForCuttingSchema = new mongoose.Schema({
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "group",
    required: true,
  },
  group_history_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "group_history",
    required: true,
  },
  cutting_issued_sqm: {
    type: Number,
    required: true,
  },
  cutting_item_details: [
    {
      item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "raw",
        required: true,
      },
      cutting_quantity: {
        type: Number,
        default: 0,
        min: 0,
      },
      // cutting_quantity: {
      //   natural: {
      //     type: Number,
      //     default: 0,
      //     min: 0,
      //   },
      //   dyed: {
      //     type: Number,
      //     default: 0,
      //     min: 0,
      //   },
      //   smoked: {
      //     type: Number,
      //     default: 0,
      //     min: 0,
      //   },
      //   total: {
      //     type: Number,
      //     default: 0,
      //     min: 0,
      //   },
      // },
    },
  ],
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    trim: true,
  },
  issued_for_cutting_remarks: {
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

export const IssuedForCuttingModel = mongoose.model(
  "issued_for_cutting",
  IssuedForCuttingSchema
);
LogSchemaFunction("issuedForCutting", IssuedForCuttingModel);
