import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import expensesSchema from "../../masters/expenses.schema.js";
import { approval_status } from "../../../Utils/approvalStatus.schema.js";

export const item_details_schema = new mongoose.Schema(
  {
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
      //   unique: true,
      required: [true, "item Sr No is required"],
    },
    item_name: {
      type: String,
      required: [true, "Item Name is required"],
      trim: true,
      uppercase: true
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
      trim: true,
      uppercase: true
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
      trim: true,
      uppercase: true
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

export const core_invoice_schema = new mongoose.Schema(
  {
    inward_sr_no: {
      type: Number,
      unique: true,
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
                // unique: [true, "contact person name is required"],
                trim: true,
                uppercase: true
              },
              email: {
                type: String,
                // required: [true, "email id is required"],
                default: null,
                trim: true,
              },
              mobile_number: {
                type: String,
                default: null
                // required: [true, "mobile number is required"],
              },
              designation: {
                type: String,
                trim: true,
                uppercase: true,
                // required: [true, "designation is required"],
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
        },
        city: {
          type: String,
          required: [true, "city is required"],
          // uppercase: true
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
    invoice_Details: invoice_details,
    expenses: {
      type: [expensesSchema],
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

export const core_inventory_items_details = mongoose.model("core_inventory_items_details", item_details_schema);
export const core_inventory_invoice_details = mongoose.model("core_inventory_invoice_details", core_invoice_schema);

const core_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const core_inventory_items_view_modal = mongoose.model("core_inventory_items_view", core_inventory_items_view_schema);

(async function () {
  await core_inventory_items_view_modal.createCollection({
    viewOn: "core_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: 1,
          _id: 1,
        },
      },
      {
        $lookup: {
          from: "core_inventory_invoice_details",
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
