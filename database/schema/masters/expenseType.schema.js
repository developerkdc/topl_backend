import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const ExpenseTypeSchema = new mongoose.Schema({
  expense_type_name: {
    type: String,
    required: [true, "Expense Type Name is required."],
    unique: [true, "Expense Type Name already exist."],
    uppercase: true,
    trim: true
  },
  expense_type_remarks: {
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

ExpenseTypeSchema.index({ expense_type_name: 1 }, { unique: true });
const ExpenseTypeModel = mongoose.models.expense_types || mongoose.model("expense_type", ExpenseTypeSchema);
LogSchemaFunction("expense_type", ExpenseTypeModel, []);
export default ExpenseTypeModel;
