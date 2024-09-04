import mongoose from "mongoose";
import LogSchemaFunction from "../../LogsSchema/logs.schema.js";

const IssuedForGroupingSchema = new mongoose.Schema({
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "raw_material",
    required: true,
  },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    trim: true,
  },
  issued_for_grouping_remarks: {
    type: String,
  },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const IssuedForGroupingModel = mongoose.model(
  "issued_for_grouping",
  IssuedForGroupingSchema
);

const lookup = [
  {
    $lookup: {
      from: "raw_materials",
      localField: "item_id",
      foreignField: "_id",
      as: "item_id",
    },
  },
  {
    $unwind: {
      path: "$item_id",
      preserveNullAndEmptyArrays: true,
    },
  },
];

LogSchemaFunction("issuedForGrouping", IssuedForGroupingModel, lookup);
