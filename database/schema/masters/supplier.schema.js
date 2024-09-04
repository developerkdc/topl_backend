import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const SupplierSchema = new mongoose.Schema({
  supplier_name: {
    type: String,
    required: [true, "Supplier Name is required."],
    trim: true,
    unique: [true, "Supplier Name already exist."],
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    // required: true,
    trim: true,
  },
  pincode: {
    type: String,
    // minlength: 6,
    // required: true,
    // maxlength: 6,
    trim: true,
  },
  bill_address: {
    type: String,
    required: true,
    trim: true,
  },
  delivery_address: {
    type: String,
    // required: true,
    trim: true,
  },
  contact_Person_name: {
    type: String,
    required: true,
    trim: true,
  },
  contact_Person_number: {
    type: Number,
    required: true,
    trim: true,
  },
  country_code: {
    type: String,
    required: true,
    trim: true,
  },
  email_id: {
    type: String,
    // minlength: 5,
    // maxlength: 50,
    required: [true, "Email ID is Required"],
    trim: true,
    // unique: [true, "Email ID already exist."],
  },
  pan_no: {
    type: String,
    trim: true,
    // required: [true, "PAN NO is Required"],
    // minlength: 10,
    // maxlength: 10,
  },
  gst_no: {
    type: String,
    // required: [true, "GST NO is Required"],
    trim: true,
    // minlength: 15,
    // maxlength: 15,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  created_employee_id: {
    type: mongoose.Types.ObjectId,
    ref: "users",
    required: true,
    trim: true,
  },
  supplier_remarks: {
    type: String,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const SupplierModel = mongoose.model("supplier", SupplierSchema);
LogSchemaFunction("supplier", SupplierModel,[]);

export default SupplierModel;
