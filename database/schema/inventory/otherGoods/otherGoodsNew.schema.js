import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import expensesSchema from "../../masters/expenses.schema.js";

const item_details_schema = new mongoose.Schema(
  {
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
      //   unique: true,
      required: [true, "item Sr No is required"],
    },
    item_name: {
      type: String,
      required: [true, "Item Name is required"],
    },
    item_sub_category_name: {
      type: String,
      required: [true, "other goods sub category name is required"],
    },
    item_sub_category_id: {
      type: String,
      required: [true, "other goods sub category id is required"],
      ref: "item_subcategory",
    },
    department_id: {
      type: String,
      required: [true, "department id is required"],
    },
    department_name: {
      type: String,
      required: [true, "department name is required"],
    },
    machine_id: {
      type: String,
      required: [true, "machine id is required"],
      ref: "machine",
    },
    machine_name: {
      type: String,
      required: [true, "machine name is required"],
    },
    brand_name: {
      type: String,
      default: null,
    },
    item_description: {
      type: String,
      required: [true, "description is required"],
    },
    total_quantity: {
      type: Number,
      required: [true, "total_quantity is required"],
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

const othergoods_invoice_schema = new mongoose.Schema(
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
                // unique: [true, "contact person name is required"],
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
          required: [true, "web url is required"],
        },
      },
    },
    invoice_Details: invoice_details,
    expenses: {
      type: [expensesSchema],
      default: null
    },
    totalExpenseAmount:{
      type: Number,
      default:0
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

export const othergoods_inventory_items_details = mongoose.model(
  "othergoods_inventory_items_details",
  item_details_schema
);
export const othergoods_inventory_invoice_details = mongoose.model(
  "othergoods_inventory_invoice_details",
  othergoods_invoice_schema
);

const othergoods_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const othergoods_inventory_items_view_modal = mongoose.model(
  "othergoods_inventory_items_view",
  othergoods_inventory_items_view_schema
);

(async function () {
  await othergoods_inventory_items_view_modal.createCollection({
    viewOn: "othergoods_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: 1,
          _id: 1,
        },
      },
      {
        $lookup: {
          from: "othergoods_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "othergoods_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$othergoods_invoice_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "created_by",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                // "_id" : 1,
                "user_name": 1,
              },
            },
          ],
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
