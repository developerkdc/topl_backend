import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const CutSchema = new mongoose.Schema({
  cut_name: {
    type: String,
    required: [true, "Cut Name is required."],
    unique: [true, "Cut Name already exist."],
    trim: true,
    uppercase: true,
  },
  cut_remarks: {
    type: String,
    trim: true,
  },
  created_employee_id: {
    type: mongoose.Types.ObjectId,
    ref: "users",
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

CutSchema.index({ cut_name: 1 }, { unique: true });
const CutModel = mongoose.model("cut", CutSchema);
LogSchemaFunction("cut", CutModel, []);
export default CutModel;
