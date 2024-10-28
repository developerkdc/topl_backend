import mongoose from "mongoose";
import approvalSchema from "../../../Utils/approval.schema.js";
import { approval_status } from "../../../Utils/approvalStatus.schema.js";
import { approval_invoice_details } from "../../../Utils/invoiceDetails.schema.js";
import { approvalExpensesSchema } from "../../masters/expenses.schema.js";

const core_approval_item_details_schema = new mongoose.Schema(
  {
    core_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Items id is required"],
    },
    approval_invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "approval invoice id is required"],
    },
    supplier_item_name: {
      type: String,
      default: null,
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
    number_of_sheets: {
      type: Number,
      required: [true, "number of sheets   is required"],
    },
    total_sq_meter: {
      type: Number,
      required: [true, "total square meter is required"],
    },
    grade_name: {
      type: String,
      required: [true, "grade name is required"],
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "grade_id is required"],
    },
    rate_in_currency: {
      type: Number,
      required: [true, "Rate in currency is required"],
    },
    exchange_rate: {
      type: String || Number,
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

core_approval_item_details_schema.index({ item_sr_no: 1 });
core_approval_item_details_schema.index({ item_sr_no: 1, invoice_id: 1 });

const core_approval_invoice_schema = new mongoose.Schema(
  {
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Invoice id is required"]
    },
    inward_sr_no: {
      type: Number,
      default: null,
      required: [true, "Inward Sr.No is required. "],
    },
    inward_date: {
      type: Date,
      default: Date.now,
      required: [true, "Inward Date is required."],
    },
    currency: {
      type: String,
      required: [true, "currency is required"],
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
          required: [true, "Company id is required"],
        },
        branch_name: {
          type: String,
          required: [true, "Branch name is required"],
        },
        contact_person: {
          type: [
            {
              name: {
                type: String,
                required: [true, "Contact person name is required"],
                trim: true,
              },
              email: {
                type: String,
                required: [true, "Email id is required"],
                trim: true,
              },
              mobile_number: {
                type: String,
                required: [true, "Mobile number is required"],
              },
              designation: {
                type: String,
                required: [true, "Designation is required"],
              },
            },
          ],
          required: [true, "At least one contact person is required"],
        },
        address: {
          type: String,
          required: [true, "Address is required"],
        },
        state: {
          type: String,
          required: [true, "State is required"],
        },
        country: {
          type: String,
          required: [true, "Country is required"],
        },
        city: {
          type: String,
          required: [true, "City is required"],
        },
        pincode: {
          type: String,
          required: [true, "Pincode is required"],
        },
        gst_number: {
          type: String,
          required: [true, "Gst number is required"],
        },
        web_url: {
          type: String,
          default: null
        },
      },
    },
    isEditable: {
      type: Boolean,
      default: true
    },
    approval_status: approval_status,
    invoice_Details: approval_invoice_details,
    expenses: {
      type: [approvalExpensesSchema],
      default: null
    },
    totalExpenseAmount: {
      type: Number,
      default: 0
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: [true, "Created By is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);
core_approval_invoice_schema.add(approvalSchema)

core_approval_invoice_schema.index({ inward_sr_no: 1 });
core_approval_invoice_schema.index({ inward_sr_no: 1, "expensesSchema.expenseType": 1 });

export const core_approval_inventory_items_model = mongoose.model(
  "core_approval_inventory_items_details",
  core_approval_item_details_schema
);
export const core_approval_inventory_invoice_model = mongoose.model(
  "core_approval_inventory_invoice_details",
  core_approval_invoice_schema
);

const core_approval_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const core_approval_inventory_items_view_model = mongoose.model(
  "core_approval_inventory_items_view",
  core_approval_inventory_items_view_schema
);

(async function () {
  await core_approval_inventory_items_view_model.createCollection({
    viewOn: "core_approval_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "core_approval_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "core_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$core_invoice_details",
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
