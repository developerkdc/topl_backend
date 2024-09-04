import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const ItemNameSchema = new mongoose.Schema({
  item_name: {
    type: String,
    required: [true, "Item Name is required."],
    trim: true,
    unique: [true, "Item Name already exist."],
    set: function (value) {
      return value.replace(/\s+/g, " ").trim();
    },
  },
  type: {
    type: String,
    default:""
  },
  item_name_remarks: {
    type: String,
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
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const ItemNameModel = mongoose.model("item_name", ItemNameSchema);
LogSchemaFunction("itemName", ItemNameModel,[]);

export default ItemNameModel;
