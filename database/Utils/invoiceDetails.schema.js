import mongoose from "mongoose";

const invoice_details = new mongoose.Schema({
  invoice_date: {
    type: Date,
    default: Date.now,
    required: [true, "Invoice Date is required."],
  },
  invoice_no: {
    type: String,
    unique: true,
    required: [true, "Invoice No is required."],
  },
  total_item_amount: {
    type: Number,
    required: [true, "Total Item Amount is required."],
  },
  transporter_details: {
    type: String,
    default: null,
  },
  port_of_loading: {
    type: String,
    default: null,
  },
  port_of_discharge: {
    type: String,
    default: null,
  },
  bill_of_landing: {
    type: String,
    default: null,
  },
  freight: {
    type: Number,
    default: 0,
  },
  isFreightInclude: {
    type: Boolean,
    default: false,
  },
  load_unload: {
    type: Number,
    default: 0,
  },
  isLoadUnloadInclude: {
    type: Boolean,
    default: false,
  },
  insurance: {
    type: Number,
    default: 0,
  },
  isInsuranceInclude: {
    type: Boolean,
    default: false,
  },
  other: {
    type: Number,
    default: 0,
  },
  isOtherInclude: {
    type: Boolean,
    default: false,
  },
  other_for_import: {
    type: Number,
    default: 0, // Used for IGST Calculation for Import
  },
  gst_percentage: {
    type: Number,
    required: [true, "GST Percentage is required."],
    default: 0, // You can set a default like 18
  },
  igst_percentage: {
    type: Number,
    default: 0,
  },
  sgst_percentage: {
    type: Number,
    default: 0,
  },
  cgst_percentage: {
    type: Number,
    default: 0,
  },
  invoice_value_with_gst: {
    type: Number,
    required: [true, "Invoice Value with GST is required."],
  },
  remark: {
    type: String,
    default: "",
  },
});

export default invoice_details;
