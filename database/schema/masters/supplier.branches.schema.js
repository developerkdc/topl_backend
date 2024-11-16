import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const contactPersonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "contact person name is required"],
    // unique: [true, "contact person name must be unique"],
    uppercase: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, "email id is required"],
    // unique: [true, "contact person email must be unique"],
    trim: true
  },
  mobile_number: {
    type: String,
    unique: [true, "contact person mobile number must be unique"],
    required: [true, "mobile number must be unique is required"],
  },
  designation: {
    type: String,
    required: [true, "designation is required"],
    uppercase: true,
    trim: true
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
    uppercase: true,
    trim: true
  },
  contact_person: {
    type: [contactPersonSchema],
    required: [true, "at least one contact person is required"],
  },
  address: {
    type: String,
    required: [true, "address is required"],
    uppercase: true,
    trim: true
  },
  state: {
    type: String,
    required: [true, "state is required"],
    // uppercase: true,
    trim: true
  },
  country: {
    type: String,
    required: [true, "country is required"],
    // uppercase: true,
    trim: true
  },
  city: {
    type: String,
    required: [true, "city is required"],
    // uppercase: true,
    trim: true
  },
  pincode: {
    type: String,
    required: [true, "pincode is required"],
    uppercase: true,
    trim: true
  },
  gst_number: {
    type: String,
    required: [true, "gst number is required"],
    uppercase: true,
    trim: true
  },
  web_url: {
    type: String,
    default: null,
    // uppercase: true,
    trim: true
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
