import mongoose from "mongoose";
import invoice_details, { approval_invoice_details } from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import expensesSchema, { approvalExpensesSchema } from "../../masters/expenses.schema.js";
import { flitch_invoice_schema, item_details_schema } from "./flitch.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";
import { approval_status } from "../../../Utils/approvalStatus.schema.js";

const flitch_approval_item_details_schema = new mongoose.Schema(
  {
    flitch_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Items id is required"],
    },
    approval_invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Items id is required"],
    },
    supplier_item_name: {
      type: String,
      default: null,
      trim: true,
      uppercase: true
    },
    supplier_flitch_no: {
      type: String,
      default: null,
      trim: true,
      uppercase: true
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Items id is required"],
    },
    item_sr_no: {
      type: Number,
      required: [true, "Invoice Sr No is required"],
    },
    item_name: {
      type: String,
      required: [true, "Item Name is required"],
      trim: true,
      uppercase: true
    },
    item_sub_category_name: {
      type: String,
      required: [true, "item_sub_category_name is required"],
      trim: true,
      uppercase: true
    },
    item_sub_category_id: {
      type: String,
      required: [true, "item_sub_category_id is required"],
    },
    log_no: {
      type: String,
      required: [true, "Log No is required"],
      trim: true,
      uppercase: true
    },
    flitch_code: {
      type: String,
      required: [true, "Flitch Code is required"],
      trim: true,
      uppercase: true
    },
    flitch_formula: {
      type: String,
      required: [true, "Flitch formula is required"],
    },
    length: {
      type: Number,
      required: [true, "Length is required"],
    },
    width1: {
      type: Number,
      required: [true, "width1 is required"],
    },
    width2: {
      type: Number,
      required: [true, "width2 is required"],
    },
    width3: {
      type: Number,
      required: [true, "width3 is required"],
    },
    height: {
      type: Number,
      required: [true, "height is required"],
    },
    flitch_cmt: {
      type: Number,
      required: [true, "Flitch Cmt is required"],
    },
    rate_in_currency: {
      type: Number,
      // required: [true, "Rate in currency is required"],
      default: null,
    },
    exchange_rate: {
      type: Number,
      // required: [true, "Rate in currency is required"],
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
      trim: true,
      uppercase: true
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Invioce Id is required"],
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      // required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

flitch_approval_item_details_schema.index({ item_sr_no: 1 });
flitch_approval_item_details_schema.index({ item_sr_no: 1, invoice_id: 1 });

const flitch_approval_invoice_schema = new mongoose.Schema(
  {
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Invoice id is required"]
    },
    inward_sr_no: {
      type: Number,
      required: [true, "Inwrad Sr No is required"],
    },
    inward_date: {
      type: Date,
      default: Date.now,
      required: [true, "Inwrad Date is required"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      trim: true,
      uppercase: true
    },
    workers_details: {
      no_of_workers: {
        type: Number,
        required: [true, "No of worker is required"],
      },
      shift: {
        type: String,
        required: [true, "Shift is required"],
        trim: true,
        uppercase: true
      },
      working_hours: {
        type: Number,
        required: [true, "Working hours is required"],
      },
      total_hours: {
        type: Number,
        default: 0,
        required: [true, "Total hours required"]
      }
    },
    supplier_details: {
      company_details: {
        supplier_company_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, "company id is required"],
        },
        supplier_name: {
          type: String,
          required: [true, "Supplier Name is required."],
          trim: true,

          uppercase: true
        },
        supplier_type: {
          type: [String],
          required: [true, "Supplier Name is required."],
          trim: true,

          uppercase: true
        },
      },
      branch_detail: {
        branch_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, "company id is required"],
        },
        branch_name: {
          type: String,
          required: [true, "branch name is reqiured"],
          trim: true,
          uppercase: true
        },
        contact_person: {
          type: [
            {
              name: {
                type: String,
                required: [true, "contact person name is required"],
                trim: true,
                // trim: true,
                uppercase: true
              },
              email: {
                type: String,
                // required: [true, "email id is required"],
                trim: true,
                default: null
              },
              mobile_number: {
                type: String,
                // required: [true, "mobile number is required"],
                default: null
              },
              designation: {
                type: String,
                // required: [true, "designation is required"],
                trim: true,
                uppercase: true,
                default: null
              },
            },
          ],
          required: [true, "at least one contact person is required"],
        },
        address: {
          type: String,
          required: [true, "address is required"],
          trim: true,
          uppercase: true
        },
        state: {
          type: String,
          required: [true, "state is required"],
          trim: true,
          // uppercase: true
        },
        country: {
          type: String,
          required: [true, "country is required"],
          trim: true,
          // uppercase: true
        },
        city: {
          type: String,
          required: [true, "city is required"],
          trim: true,
          // uppercase: true
        },
        pincode: {
          type: String,
          required: [true, "pincode is required"],
        },
        gst_number: {
          type: String,
          // required: [true, "gst number is required"],
          default: null
        },
        web_url: {
          type: String,
          default: null
        },
      },
    },
    approval_status: approval_status,
    invoice_Details: approval_invoice_details,
    expenses: {
      type: [approvalExpensesSchema],
      default: null,
    },
    totalExpenseAmount: {
      type: Number,
      default: 0
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      // required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);
flitch_approval_invoice_schema.add(approvalSchema)

flitch_approval_invoice_schema.index({ inward_sr_no: 1 });
flitch_approval_invoice_schema.index({ inward_sr_no: 1, "expensesSchema.expenseType": 1 });

export const flitch_approval_inventory_items_model = mongoose.model(
  "flitch_approval_inventory_items_details",
  flitch_approval_item_details_schema
);
export const flitch_approval_inventory_invoice_model = mongoose.model(
  "flitch_approval_inventory_invoice_details",
  flitch_approval_invoice_schema
);
