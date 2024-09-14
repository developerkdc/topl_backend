import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";

const item_details_schema = new mongoose.Schema(
  {
    supplier_item_name: {
      type: String,
      default: null,
    },
    supplier_flitch_no: {
      type: String,
      default: null,
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
    },
    log_no: {
      type: String,
      required: [true, "Log No is required"],
    },
    flitch_code: {
      type: String,
      required: [true, "Flitch Code is required"],
    },
    flitch_formula: {
      formula_type: {
        type: String,
        enum: {
          values: ["TQF", "FHF", "BF"],
          message: "Invalid formula type",
        },
        required: [true, "Formula type is required"],
      },
      formula: {
        type: String,
        required: [true, "Flitch formula is required"],
      },
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
      // required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

item_details_schema.index({ item_sr_no: 1 });
item_details_schema.index({ item_sr_no: 1, invoice_id: 1 }, { unique: true });

const flitch_invoice_schema = new mongoose.Schema(
  {
    inward_sr_no: {
      type: Number,
      unique: true,
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
          type: String,
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
          required: [true, "web url is required"],
        },
      },
    },
    invoice_Details: invoice_details,
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

flitch_invoice_schema.index({ inward_sr_no: 1 });

const flitch_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const flitch_inventory_items_view_model = mongoose.model(
  "flitch_inventory_items_view",
  flitch_inventory_items_view_schema
);

(async function () {
  await flitch_inventory_items_view_model.createCollection({
    viewOn: "flitch_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: 1,
          _id: 1,
        },
      },
      {
        $lookup: {
          from: "flitch_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "flitch_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$flitch_invoice_details",
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

export const flitch_inventory_items_model = mongoose.model(
  "flitch_inventory_items_details",
  item_details_schema
);
export const flitch_inventory_invoice_model = mongoose.model(
  "flitch_inventory_invoice_details",
  flitch_invoice_schema
);
