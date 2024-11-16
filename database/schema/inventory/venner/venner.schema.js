import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import expensesSchema from "../../masters/expenses.schema.js";
import { approval_status } from "../../../Utils/approvalStatus.schema.js";

export const veneer_item_details_schema = new mongoose.Schema({
  supplier_item_name: {
    type: String,
    default: null,
    trim: true,
    uppercase: true
  },
  supplier_code: {
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
  item_sub_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Items Sub-Category Id is required"],
  },
  item_sub_category_name: {
    type: String,
    required: [true, "Item Sub-Category Name is required"],
    trim: true,
    uppercase: true
  },
  log_code: {
    type: String,
    required: [true, "log code is required"],
    trim: true,
    uppercase: true
  },
  bundle_number: {
    type: Number,
    required: [true, "bundle number is required"],
  },
  pallet_number: {
    type: String,
    unique: [true, "pallet number must be unique"],
    required: [true, "pallet_number is required"], //auto increment
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
  number_of_leaves: {
    type: Number,
    required: [true, "Number of leaves   is required"],
  },
  total_sq_meter: {
    type: Number,
    required: [true, "total square meter is required"],
  },
  cut_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "cut id is required"],
  },
  cut_name: {
    type: String,
    required: [true, "cut name is required"],
    trim: true,
    uppercase: true
  },
  series_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "series id is required"],
  },
  series_name: {
    type: String,
    required: [true, "series name is required"],
    trim: true,
    uppercase: true
  },
  grades_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "grades id is required"],
  },
  grades_name: {
    type: String,
    required: [true, "grades name is required"],
    trim: true,
    uppercase: true
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
    type: mongoose.Types.ObjectId,
    ref: "users",
    required: [true, "Created By is required"],
    trim: true,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
},
  { timestamps: true }
);

veneer_item_details_schema.index({ item_sr_no: 1 });
veneer_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

export const veneer_invoice_schema = new mongoose.Schema(
  {
    inward_sr_no: {
      type: Number,
      unique: true,
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
        trim: true,
        uppercase: true
      },
      working_hours: {
        type: Number,
        required: [true, "Working hours is required"],
      },
      total_hours:{
        type:Number,
        default:0,
        required:[true,"Total hours required"]
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
          required: [true, "Company id is required"],
        },
        branch_name: {
          type: String,
          required: [true, "Branch name is required"],
          trim: true,
          uppercase: true
        },
        contact_person: {
          type: [
            {
              name: {
                type: String,
                required: [true, "Contact person name is required"],
                trim: true,

                uppercase: true
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
                trim: true,
                uppercase: true
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
          trim: true,
          // uppercase: true
        },
        country: {
          type: String,
          required: [true, "Country is required"],
          trim: true,
          // uppercase: true
        },
        city: {
          type: String,
          required: [true, "City is required"],
          trim: true,
          // uppercase: true
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

veneer_invoice_schema.index({ inward_sr_no: 1 });
veneer_invoice_schema.index({ inward_sr_no: 1, "expensesSchema.expenseType": 1 }, { unique: true });

export const veneer_inventory_items_model = mongoose.model(
  "veneer_inventory_items_details",
  veneer_item_details_schema
);
export const veneer_inventory_invoice_model = mongoose.model(
  "veneer_inventory_invoice_details",
  veneer_invoice_schema
);

const veneer_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const veneer_inventory_items_view_modal = mongoose.model(
  "veneer_inventory_items_view",
  veneer_inventory_items_view_schema
);

(async function () {
  await veneer_inventory_items_view_modal.createCollection({
    viewOn: "veneer_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: 1,
          _id: 1,
        },
      },
      {
        $lookup: {
          from: "veneer_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "veneer_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$veneer_invoice_details",
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
