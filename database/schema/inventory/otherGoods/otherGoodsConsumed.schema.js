import mongoose from "mongoose";
import LogSchemaFunction from "../../LogsSchema/logs.schema.js";

const OtherGoodsSchema = new mongoose.Schema({
  date_of_inward: {
    type: Date,
    required: true,
    trim: true,
  },
  item_name: {
    type: String,
    required: [true, "Item Name is required."],
    trim: true,
  },
  units: {
    type: String,
    required: true,
    trim: true,
  },
  rate: {
    type: Number,
    required: true,
    trim: true,
  },
  received_quantity: {
    type: Number,
    required: true,
    trim: true,
  },
  available_quantity: {
    type: Number,
    required: true,
    trim: true,
  },
  date_of_consumption: {
    type: Date,
    required: true,
    trim: true,
  },
  consumption_quantity: {
    type: Number,
    required: true,
    trim: true,
  },
  processes: {
    type: String,
    required: true,
    trim: true,
  },
  supplier_details: {
    supplier_name: {
      type: String,
      required: [true, "Supplier Name is required."],
      trim: true,
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
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      minlength: 6,
      required: true,
      maxlength: 6,
      trim: true,
    },
    bill_address: {
      type: String,
      required: true,
      trim: true,
    },
    delivery_address: {
      type: String,
      required: true,
      trim: true,
    },
    contact_Person_name: {
      type: String,
      required: true,
      trim: true,
    },
    contact_Person_number: {
      type: String,
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
      minlength: 5,
      maxlength: 50,
      required: [true, "Email ID is Required"],
      trim: true,
    },
    pan_no: {
      type: String,
      trim: true,
    },
    gst_no: {
      type: String,
      trim: true,
    },
  },
  other_goods_consumed_remarks: {
    type: String,
  },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const OtherGoodsConsumedModel = mongoose.model(
  "other_goods_issued",
  OtherGoodsSchema
);

LogSchemaFunction("otherGoodsIssued", OtherGoodsConsumedModel,[]);

export default OtherGoodsConsumedModel;
