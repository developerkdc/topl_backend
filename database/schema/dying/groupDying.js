import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const GroupDyingSchema = new mongoose.Schema({
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "group",
    required: true,
  },
  // issued_for_dying_date: {
  //   type: Date,
  //   required: [true, "Issued for Dying Date is required"],
  // },
  date_of_dying: {
    type: Date,
    required: [true, "Date of Dying is required"],
  },
  item_details: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "raw_material",
      required: [true, "Item ID is required"],
    },
  ],

  dying_images: {
    type: Array,
  },

  in_time: {
    type: Date,
    required: [true, "In Time is required"],
  },
  process_time: {
    type: Number,
    required: [true, "Out Time is required"],
  },
  out_time: {
    type: Date,
    required: [true, "Date of Grouping is required"],
  },
  consumed_item_name_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "item_name",
    required: [true, "Consumed Item Name ID is required."],
  },
  consumed_item_name: {
    type: String,
    required: [true, "Consumed Item Name is required."],
  },
  liters_of_ammonia_used: {
    type: Number,
    required: [true, "Liters of Ammonia used is required"],
  },
  created_employee_id: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["dyed", "passed", "rejected"],
    default: "dyed",
  },
  group_dying_remarks: {
    type: String,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const GroupDyingModel = mongoose.model("group_dying", GroupDyingSchema);
LogSchemaFunction("groupDying", GroupDyingModel);
