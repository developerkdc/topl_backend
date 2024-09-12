import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema";

const log_item_details_schema = new mongoose.Schema({
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
  log_no: {
    type: String,
    required: [true, "Log No is required"],
  },
  log_formula: {
    formula_type: {
      type: {
        enum: {
          values: ["A", "B"],
          message: "Invalid formula type",
        },
        required: [true, "Formula type is required"],
      },
    },
    formula: {
      type: String,
      required: [true, "Log formula is required"],
    },
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
  remark: {
    type: String,
    default: null,
  },
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Invoice Id is required"],
  },
});

const log_invoice_schema = new mongoose.Schema(
  {
    inward_sr_no: {
      type: Number,
      default: null,
      required: [true, "Inward Sr.No is required. "],
    },
    inward_date: {
      type: Date,
      default: Date.now,
      required: [true, ""],
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
          type: String,
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
          required: [true, "Branch name is reqiured"],
        },
        contact_person: {
          type: [
            {
              name: {
                type: String,
                required: [true, "Contact person name is required"],
                unique: [true, "Contact person name is required"],
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
          required: [true, "Web url is required"],
        },
      },
    },
    invoice_Details: invoice_details,
  },
  {
    timestamps: true,
  }
);

const log_inventory_items_details = mongoose.model(
  "log_inventory_items_details",
  log_item_details_schema
);
const log_inventory_invoice_details = mongoose.model(
  "log_inventory_invoice_details",
  log_invoice_schema
);

export default {
  log_inventory_items_details,
  log_inventory_invoice_details,
};
