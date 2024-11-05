import mongoose from "mongoose";
import approvalSchema from "../../../Utils/approval.schema.js";
import { approval_status } from "../../../Utils/approvalStatus.schema.js";
import { approval_invoice_details } from "../../../Utils/invoiceDetails.schema.js";
import { approvalExpensesSchema } from "../../masters/expenses.schema.js";

const mdf_approval_item_details_schema = new mongoose.Schema(
  {
    mdf_item_id: {
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
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "item_name",
      required: [true, "Items id is required"],
    },
    item_sr_no: {
      type: Number,
      required: [true, "item Sr No is required"],
    },
    item_name: {
      type: String,
      required: [true, "Item Name is required"],
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "item_subcategory",
      required: [true, "Items Sub-Category Id is required"],
    },
    item_sub_category_name: {
      type: String,
      required: [true, "Item Sub-Category Name is required"],
    },
    mdf_type: {
      type: String,
      required: [true, "MDF Type is required"],
    },
    pallet_number: {
      type: Number,
      default: null
    },
    length: {
      type: Number,
      required: [true, "Length is required"],
    },
    width: {
      type: Number,
      required: [true, "Width is required"],
    },
    thickness: {
      type: Number,
      required: [true, "Thickness is required"],
    },
    no_of_sheet: {
      type: Number,
      required: [true, "Number of Sheets  is required"],
    },
    total_sq_meter: {
      type: Number,
      required: [true, "Total square meter is required"],
    },
    rate_in_currency: {
      type: Number,
      required: [true, "Rate in currency is required"],
    },
    exchange_rate: {
      type: Number,
      required: [true, "Exchange rate is required"],
    },
    rate_in_inr: {
      type: Number,
      required: [true, "Rate in INR is required"],
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
      ref: "mdf_inventory_invoice_details",
      required: [true, "Invoice Id is required"],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "created by is required field"],
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

mdf_approval_item_details_schema.index({ item_sr_no: 1 });
mdf_approval_item_details_schema.index({ item_sr_no: 1, invoice_id: 1 });

const mdf_approval_invoice_schema = new mongoose.Schema(
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
    },
    workers_details: {
      no_of_workers: {
        type: Number,
        required: [true, "No of worker is required"],
      },
      shift: {
        type: String,
        required: [true, "Shift is required"],
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
          trim: true,
        },
        supplier_type: {
          type: [String],
          required: [true, "Supplier Name is required."],
          trim: true,
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
        },
        contact_person: {
          type: [
            {
              name: {
                type: String,
                required: [true, "contact person name is required"],
                trim: true,
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
        },
        country: {
          type: String,
          required: [true, "country is required"],
        },
        city: {
          type: String,
          required: [true, "city is required"],
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
mdf_approval_invoice_schema.add(approvalSchema)

mdf_approval_invoice_schema.index({ inward_sr_no: 1 });
mdf_approval_invoice_schema.index({ inward_sr_no: 1, "expensesSchema.expenseType": 1 });

export const mdf_approval_inventory_items_model = mongoose.model(
  "mdf_approval_inventory_items_details",
  mdf_approval_item_details_schema
);
export const mdf_approval_inventory_invoice_model = mongoose.model(
  "mdf_approval_inventory_invoice_details",
  mdf_approval_invoice_schema
);
