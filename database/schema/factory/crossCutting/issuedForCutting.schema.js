import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";

const issues_for_crosscutting_details_schema = new mongoose.Schema({
  log_inventory_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "log_inventory_items_details",
    required: [true, "Log Inventory Items Id is required"]
  },
  item_sr_no: {
    type: Number,
    required: [true, "Items Sr.No is required"],
  },
  supplier_item_name: {
    type: String,
    default: null,
  },
  supplier_log_no: {
    type: String,
    default: null,
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Items id is required"],
  },
  item_name: {
    type: String,
    required: [true, "Item Name is required"],
  },
  item_sub_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Items Sub-Category Id is required"],
  },
  item_sub_category_name: {
    type: String,
    required: [true, "Item Sub-Category Name is required"],
  },
  log_no: {
    type: String,
    required: [true, "Log No is required"],
  },
  log_formula: {
    type: String,
    required: [true, "Log formula is required"],
  },
  status: {
    type: String,
    enum: {
      values: [issues_for_status.crosscutting],
      message: `Invalid status {{VALUE}} Issue Status must either be one of ${issues_for_status.crosscutting}`
    },
    default: issues_for_status.crosscutting
  },
  invoice_length: {
    type: Number,
    required: [true, "Invoice length is required"],
  },
  invoice_diameter: {
    type: Number,
    required: [true, "Invoice diameter is required"],
  },
  invoice_cmt: {
    type: Number,
    required: [true, "Invoice CMT is required"],
  },
  indian_cmt: {
    type: Number,
    required: [true, "Indian CMT is required"],
  },
  physical_length: {
    type: Number,
    required: [true, "Physical length is required"],
  },
  physical_diameter: {
    type: Number,
    required: [true, "Physical diameter is required"],
  },
  physical_cmt: {
    type: Number,
    required: [true, "Physical CMT is required"],
  },
  crosscutting_completed: {
    type: Boolean,
    default: false
  },
  is_rejected: {
    type: Boolean,
    default: false
  },
  available_quantity: {
    physical_length: {
      type: Number,
      default: function () {
        return this.physical_length
      },
      required: [true, "Physical length is required"],
    },
    physical_diameter: {
      type: Number,
      default: function () {
        return this.physical_diameter
      },
      required: [true, "Physical diameter is required"],
    },
    physical_cmt: {
      type: Number,
      default: function () {
        return this.physical_cmt
      },
      required: [true, "Physical CMT is required"],
    },
    amount: {
      type: Number,
      default: function () {
        return this.amount
      },
      required: [true, "Amount is required"],
    },
    sqm_factor: {
      type: Number,
      default: 1
    },
    expense_amount: {
      type: Number,
      default: function () {
        return this.expense_amount
      },
      required: [true, "Expense Amount is required"],
    },
  },
  exchange_rate: {
    type: Number,
    default: null,
  },
  rate_in_currency: {
    type: Number,
    default: null,
  },
  rate_in_inr: {
    type: Number,
    required: [true, "Rate in currency is required"],
  },
  amount: {
    type: Number,
    required: [true, "Rate in Inr is required"],
  },
  amount_factor: {
    type: Number,
    default: 0,
  },
  expense_amount: {
    type: Number,
    default: 0,
  },
  remark: {
    type: String,
    default: null,
  },
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Invoice Id is required"],
  },
  created_by: {
    type: mongoose.Types.ObjectId,
    ref: "users",
    // required: [true, "Created By is required"],
    trim: true,
  },
}, {
  timestamps: true,
});

issues_for_crosscutting_details_schema.index({ item_sr_no: 1 });
issues_for_crosscutting_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

export const issues_for_crosscutting_model = mongoose.model(
  "issues_for_crosscutting",
  issues_for_crosscutting_details_schema
);

const issues_for_crosscutting_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const issues_for_crosscutting_view_model = mongoose.model(
  "issues_for_crosscutting_view",
  issues_for_crosscutting_view_schema
);

(async function () {
  await issues_for_crosscutting_view_model.createCollection({
    viewOn: "issues_for_crosscuttings",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "log_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "log_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$log_invoice_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "created_by",
          foreignField: "_id",
          as: "created_user",
        },
      },
      {
        $unwind: {
          path: "$created_user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ],
  });
})();

