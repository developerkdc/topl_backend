import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const UnitSchema = new mongoose.Schema({
  unit_name: {
    type: String,
    required: [true, "Unit Name is required."],
    trim: true,
    unique: [true, "Unit Name already exist."],
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
  unit_remarks: {
    type: String,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const UnitModel = mongoose.model("unit", UnitSchema);
LogSchemaFunction("unit", UnitModel, []);

export default UnitModel;
