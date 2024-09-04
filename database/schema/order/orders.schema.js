import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const OrderSchema = new mongoose.Schema({
  purchase_order_no: {
    type: String,
    required: true,
  },
  order_no: {
    type: Number,
    required: true,
    unique: true,
  },
  order_type: {
    type: String,
    enum: ["raw", "group"],
    required: true,
  },
  customer_name: {
    type: String,
    required: true,
    trim: true,
  },
  place: {
    type: String,
    required: true,
    trim: true,
  },
  order_mode: {
    type: String,
    enum: ["whatsapp", "offline"],
    required: true,
  },
  order_status: {
    type: String,
    enum: ["pending", "complete"],
  },
  group_order_details: [
    {
      item_no: {
        type: Number,
        required: true,
      },
      // units: {
      //   type: String,
      //   required: true,
      // },
      order_group_no: {
        type: Number,
        default: null,
      },
      order_item_name: {
        type: String,
        required: true,
      },
      order_item_code: {
        type: String,
        required: true,
      },
      order_length: {
        type: Number,
        required: true,
      },
      order_width: {
        type: Number,
        required: true,
      },
      order_required_pcs: {
        type: Number,
        required: true,
        min: 1,
      },
      order_required_sqm: {
        type: Number,
        required: true,
      },
      order_rate: {
        type: Number,
        required: true,
      },
      total_order_amount: {
        type: Number,
        required: true,
      },
      order_dispatched_pcs_qty: {
        type: Number,
        default: 0,
      },
      order_balance_pcs_qty: {
        type: Number,
        default: 0,
      },
      order_status: {
        type: String,
        enum: ["pending", "open", "closed"],
      },
      item_remarks: {
        type: String,
      },
    },
  ],

  raw_order_details: [
    {
      item_no: {
        type: Number,
        required: true,
      },
      // units: {
      //   type: String,
      //   required: true,
      // },
      order_item_name: {
        type: String,
        required: true,
      },
      order_item_code: {
        type: String,
        required: true,
      },
      order_length: {
        type: Number,
        // required: true,
      },
      order_width: {
        type: Number,
        // required: true,
      },
      order_sqm: {
        type: Number,
        required: true,
      },
      order_rate: {
        type: Number,
        required: true,
      },
      total_order_amount: {
        type: Number,
        required: true,
      },
      required_quantity: {
        type: Number,
        default: 0,
      },
      // required_quantity: {
      //   natural: {
      //     type: Number,
      //     default: 0,
      //   },
      //   smoked: {
      //     type: Number,
      //     default: 0,
      //   },
      //   dyed: {
      //     type: Number,
      //     default: 0,
      //   },
      //   total: {
      //     type: Number,
      //     default: 0,
      //   },
      // },
      dispatched_quantity: {
        type: Number,
        default: 0,
      },
      // dispatched_quantity: {
      //   natural: {
      //     type: Number,
      //     default: 0,
      //   },
      //   smoked: {
      //     type: Number,
      //     default: 0,
      //   },
      //   dyed: {
      //     type: Number,
      //     default: 0,
      //   },
      //   total: {
      //     type: Number,
      //     default: 0,
      //   },
      // },
      balance_quantity: {
        type: Number,
        default: 0,
      },
      // balance_quantity: {
      //   natural: {
      //     type: Number,
      //     default: 0,
      //   },
      //   smoked: {
      //     type: Number,
      //     default: 0,
      //   },
      //   dyed: {
      //     type: Number,
      //     default: 0,
      //   },
      //   total: {
      //     type: Number,
      //     default: 0,
      //   },
      // },
      order_status: {
        type: String,
        enum: ["pending", "open", "closed"],
      },
      item_remarks: {
        type: String,
      },
    },
  ],

  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    trim: true,
  },
  order_remarks: {
    type: String,
  },
  orderDate: { type: Date, required: true },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const OrderModel = mongoose.model("orders", OrderSchema);
LogSchemaFunction("orders", OrderModel);
