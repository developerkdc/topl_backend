import mongoose from "mongoose";
import LogSchemaFunction from "../../LogsSchema/logs.schema.js";

const RawMaterialSchema = new mongoose.Schema({
  invoice_no: {
    type: String,
    required: [true, "Invoice No is required."],
    trim: true,
  },
  invoice_date: {
    type: Date,
    trim: true,
  },
  date_of_received: {
    type: Date,
    default: null,
  },
  item_name: {
    type: String,
    required: [true, "Item Name is required."],
    trim: true,
  },
  item_code: {
    type: String,
    required: [true, "Item Code is required."],
    trim: true,
  },
  item_log_no: {
    type: String,
    required: [true, "Item Log No is required."],
    trim: true,
  },
  item_bundle_no: {
    type: String,
    required: [true, "Item Bundle No is required."],
    trim: true,
  },
  item_length: {
    type: Number,
    required: [true, "Item Length is required."],
    trim: true,
  },
  item_width: {
    type: Number,
    required: [true, "Item Width is required."],
    trim: true,
  },

  item_sample_pattas: {
    type: Number,
    trim: true,
    required: true,
    min: 0,
  },
  item_sample_sqm: {
    type: Number,
    trim: true,
    required: true,
    min: 0,
  },

  item_pallete_no: {
    type: String,
    required: [true, "Item Pallete No is required."],
    trim: true,
  },
  item_physical_location: {
    type: String,
    required: [true, "Item Physical Location is required."],
    trim: true,
  },
  item_grade: {
    type: String,
    required: [true, "Item Grade is required."],
    trim: true,
  },
  item_rate_per_sqm: {
    type: Number,
    required: [true, "Item Rate Per SQM required."],
    trim: true,
  },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    trim: true,
  },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "supplier",
    required: true,
    trim: true,
  },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const RawMaterialSampleModel = mongoose.model(
  "raw_material_sample",
  RawMaterialSchema
);

LogSchemaFunction("rawMaterialSample", RawMaterialSampleModel);
