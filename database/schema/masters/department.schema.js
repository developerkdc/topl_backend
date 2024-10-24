import mongoose from "mongoose";

const departMentSchema = new mongoose.Schema({
  sr_no: Number,
  dept_name: {
    type: String,
    required: [true, "department name is required"],
    trim: true,
    unique: [true, "Department Name already exist."],
  },
  remark: {
    type: String,
  },
  dept_access: {
    type: {},
  },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    default: null,
  },
  deleted_at: {
    type: Date,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const departMentModel = mongoose.models.department || mongoose.model("department", departMentSchema);
export default departMentModel;
