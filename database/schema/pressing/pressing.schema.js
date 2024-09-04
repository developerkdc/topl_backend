import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const PressingSchema = new mongoose.Schema({
  issued_for_pressing_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "issued_for_pressing",
    required: true,
  },
  group_no: {
    type: Number,
    required: true,
  },

  tapping_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "taping",
    required: true,
  },
  ready_sheet_form_inventory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ready_sheet_form_inventory",
    required: true,
  },
  ready_sheet_form_history_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ready_sheet_form_inventory_history",
    required: true,
  },
  consumed_quantity: {
    type: Number,
    required: true,
  },
  consumed_item_name: {
    type: String,
    required: true,
  },
  other_goods_consumed_remarks: {
    type: String,
    default: null,
  },
  date_of_consumption: {
    type: Date,
    required: true,
    trim: true,
  },

  consumed_details: [
    {
      item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "other_goods",
        required: true,
      },
      other_goods_consumed_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "other_goods_issued",
        required: true,
      },
      consumed_quantity: {
        type: Number,
        required: true,
      },
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
    },
  ],

  pressing_no_of_peices: {
    type: Number,
    required: true,
  },
  pressing_length: {
    type: Number,
    required: true,
  },
  pressing_width: {
    type: Number,
    required: true,
  },
  pressing_sqm: {
    type: Number,
    required: true,
  },
  pressing_remarks: {
    type: String,
    default: null,
  },

  pressing_waste_sqm: {
    waste_sqm: {
      type: Number,
      required: [true, "Waste Sqm is required"],
    },
    waste_sqm_percentage: {
      type: Number,
      required: [true, "Waste Sqm is required"],
    },
  },

  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    trim: true,
  },

  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const PressingModel = mongoose.model("pressing", PressingSchema);
LogSchemaFunction("pressing", PressingModel);
