import mongoose from "mongoose";

const ApprovalConfigSchema = new mongoose.Schema({
  configuration: {
    type: {},
  },
  created_employee_id: {
    type: mongoose.Types.ObjectId,
    ref: "users",
    required: true,
    trim: true,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const ApprovalConfigModel = mongoose.model("approval_config", ApprovalConfigSchema);
export default ApprovalConfigModel;
