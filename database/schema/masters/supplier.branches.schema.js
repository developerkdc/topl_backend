import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const contactPersonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "contact person name is required"],
    unique: [true, "contact person name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "email id is required"],
    trim: true,
  },
  mobile_number: {
    type: String,
    required: [true, "mobile number is required"],
  },
  designation: {
    type: String,
    required: [true, "designation is required"],
  },
});
const supplierBranchesSchema = new mongoose.Schema({
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "supplier",
    required: [true, "supplier id is required"],
  },
  branch_name: {
    type: String,
    required: [true, "branch name is reqiured"],
  },
  contact_person: {
    type: [contactPersonSchema],
    required: [true, "at least one contact person is required"],
  },
  address: {
    type: String,
    required: [true, "address is required"],
  },
  state: {
    type: String,
    required: [true, "state is required"],
  },
  country: {
    type: String,
    required: [true, "country is required"],
  },
  city: {
    type: String,
    required: [true, "city is required"],
  },
  pincode: {
    type: String,
    required: [true, "pincode is required"],
  },
  gst_number: {
    type: String,
    required: [true, "gst number is required"],
  },
  web_url: {
    type: String,
    default: null,
    // required: [true, "web url is required"],
  },
  is_main_branch: {
    type: Boolean,
    default: false,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const supplierBranchModel =
  mongoose.models.supplierbranchmodels ||
  mongoose.model("supplier_branch", supplierBranchesSchema);
// LogSchemaFunction("supplier_branch", supplierBranchModel, []);

export default supplierBranchModel;
