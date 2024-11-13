import mongoose from "mongoose";
import approvalSchema from "../../../Utils/approval.schema.js";
import { approval_status } from "../../../Utils/approvalStatus.schema.js";
import { approval_invoice_details } from "../../../Utils/invoiceDetails.schema.js";
import { approvalExpensesSchema } from "../../masters/expenses.schema.js";

const plywood_approval_item_details_schema = new mongoose.Schema(
  {
    plywood_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Plywood Items id is required"],
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
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Items id is required"],
    },
    item_sr_no: {
      type: Number,
      required: [true, "item Sr No is required"],
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
    plywood_type: {
      type: String,
      required: [true, "Plywood type is required"],
      trim: true,
      uppercase: true
    },
    // plywood_sub_type: {
    //   type: String,
    //   required: [true, "Plywood-sub type is required"],
    // },
    pallet_number: {
      type: Number,
      default: null, //auto increment
    },
    length: {
      type: Number,
      required: [true, "Length is required"],
    },
    width: {
      type: Number,
      required: [true, "width is required"],
    },
    thickness: {
      type: Number,
      required: [true, "thickness is required"],
    },
    sheets: {
      type: Number,
      required: [true, "sheets  is required"],
    },
    total_sq_meter: {
      type: Number,
      required: [true, "total square meter is required"],
    },
    rate_in_currency: {
      type: Number,
      required: [true, "Rate in currency is required"],
    },
    exchange_rate: {
      type: Number,
      required: [true, "exchange rate is required"],
    },
    rate_in_inr: {
      type: Number,
      required: [true, "Rate in inr is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
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
      required: [true, "Invioce Id is required"],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "created by is required field"],
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

plywood_approval_item_details_schema.index({ item_sr_no: 1 });
plywood_approval_item_details_schema.index({ item_sr_no: 1, invoice_id: 1 });

const plywood_approval_invoice_schema = new mongoose.Schema(
  {
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Invoice id is required"]
    },
    inward_sr_no: {
      type: Number,
      required: [true, "Invoice Sr No is required"],
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

          uppercase: true,
          trim: true,
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
                uppercase: true
              },
              email: {
                type: String,
                required: [true, "email id is required"],
                trim: true,
              },
              mobile_number: {
                type: String,
                required: [true, "mobile number is required"],
              },
              designation: {
                type: String,
                required: [true, "designation is required"],
              },
            },
          ],
          required: [true, "at least one contact person is required"],
        },
        address: {
          type: String,
          required: [true, "address is required"],
        },
        state: {
          type: String,
          required: [true, "state is required"],
          trim: true,
          uppercase: true
        },
        country: {
          type: String,
          required: [true, "country is required"],
          trim: true,
          uppercase: true
        },
        city: {
          type: String,
          required: [true, "city is required"],
          trim: true,
          uppercase: true
        },
        pincode: {
          type: String,
          required: [true, "pincode is required"],
        },
        gst_number: {
          type: String,
          required: [true, "gst number is required"],
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
      default: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "created by is required field"],
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
plywood_approval_invoice_schema.add(approvalSchema)

plywood_approval_invoice_schema.index({ inward_sr_no: 1 });
plywood_approval_invoice_schema.index({ inward_sr_no: 1, "expensesSchema.expenseType": 1 });

export const plywood_approval_inventory_items_model = mongoose.model(
  "plywood_approval_inventory_items_details",
  plywood_approval_item_details_schema
);
export const plywood_approval_inventory_invoice_model = mongoose.model(
  "plywood_approval_inventory_invoice_details",
  plywood_approval_invoice_schema
);
