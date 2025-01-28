import mongoose from 'mongoose';
import invoice_details from '../../../Utils/invoiceDetails.schema.js';
import { issues_for_status } from '../../../Utils/constants/constants.js';
import expensesSchema from '../../masters/expenses.schema.js';
import { approval_status } from '../../../Utils/approvalStatus.schema.js';

export const log_item_details_schema = new mongoose.Schema(
  {
    item_sr_no: {
      type: Number,
      required: [true, 'Items Sr.No is required'],
    },
    supplier_item_name: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    supplier_log_no: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items id is required'],
    },
    item_name: {
      type: String,
      required: [true, 'Item Name is required'],
      trim: true,
      uppercase: true,
    },
    color: {
      color_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      color_name: {
        type: String,
        default: null,
      },
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items Sub-Category Id is required'],
    },
    item_sub_category_name: {
      type: String,
      required: [true, 'Item Sub-Category Name is required'],
      trim: true,
      uppercase: true,
    },
    log_no: {
      type: String,
      required: [true, 'Log No is required'],
      trim: true,
      uppercase: true,
      unique: [true, 'Log Number must be unique'],
    },
    log_formula: {
      type: String,
      required: [true, 'Log formula is required'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          issues_for_status?.crosscutting,
          issues_for_status?.flitching,
          issues_for_status?.peeling,
        ],
        message: `Invalid status {{VALUE}} Issue Status must either be one of ${issues_for_status?.crosscutting}, ${issues_for_status?.flitching}, ${issues_for_status?.peeling}`,
      },
      default: null,
    },
    invoice_length: {
      type: Number,
      required: [true, 'Invoice length is required'],
    },
    invoice_diameter: {
      type: Number,
      required: [true, 'Invoice diameter is required'],
    },
    invoice_cmt: {
      type: Number,
      required: [true, 'Invoice CMT is required'],
    },
    indian_cmt: {
      type: Number,
      required: [true, 'Indian CMT is required'],
    },
    physical_length: {
      type: Number,
      required: [true, 'Physical length is required'],
    },
    physical_diameter: {
      type: Number,
      required: [true, 'Physical diameter is required'],
    },
    physical_cmt: {
      type: Number,
      required: [true, 'Physical CMT is required'],
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
      required: [true, 'Rate in currency is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Rate in Inr is required'],
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
      uppercase: true,
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Invoice Id is required'],
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

log_item_details_schema.index({ item_sr_no: 1 });
log_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

export const log_invoice_schema = new mongoose.Schema(
  {
    inward_sr_no: {
      type: Number,
      unique: true,
      required: [true, 'Inward Sr.No is required. '],
    },
    inward_date: {
      type: Date,
      default: Date.now,
      required: [true, 'Inward Date is required.'],
    },
    currency: {
      type: String,
      required: [true, 'currency is required'],
      trim: true,
      uppercase: true,
    },
    workers_details: {
      no_of_workers: {
        type: Number,
        required: [true, 'No of worker is required'],
      },
      shift: {
        type: String,
        required: [true, 'Shift is required'],
        trim: true,
        uppercase: true,
      },
      working_hours: {
        type: Number,
        required: [true, 'Working hours is required'],
      },
      total_hours: {
        type: Number,
        default: 0,
        required: [true, 'Total hours required'],
      },
    },
    supplier_details: {
      company_details: {
        supplier_company_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'company id is required'],
        },
        supplier_name: {
          type: String,
          required: [true, 'Supplier Name is required.'],
          trim: true,

          uppercase: true,
        },
        supplier_type: {
          type: [String],
          required: [true, 'Supplier Name is required.'],
          trim: true,

          uppercase: true,
        },
      },
      branch_detail: {
        branch_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Company id is required'],
        },
        branch_name: {
          type: String,
          required: [true, 'Branch name is required'],
          trim: true,
          uppercase: true,
        },
        contact_person: {
          type: [
            {
              name: {
                type: String,
                required: [true, 'Contact person name is required'],
                trim: true,

                uppercase: true,
              },
              email: {
                type: String,
                // required: [true, "Email id is required"],
                trim: true,
                default: null,
              },
              mobile_number: {
                type: String,
                // required: [true, "Mobile number is required"],
                default: null,
              },
              designation: {
                type: String,
                // required: [true, "Designation is required"],
                trim: true,
                uppercase: true,
                default: null,
              },
            },
          ],
          required: [true, 'At least one contact person is required'],
        },
        address: {
          type: String,
          required: [true, 'Address is required'],
          trim: true,
          uppercase: true,
        },
        state: {
          type: String,
          required: [true, 'State is required'],
          trim: true,
          // uppercase: true
        },
        country: {
          type: String,
          required: [true, 'Country is required'],
          trim: true,
          // uppercase: true
        },
        city: {
          type: String,
          required: [true, 'City is required'],
          trim: true,
          // uppercase: true
        },
        pincode: {
          type: String,
          required: [true, 'Pincode is required'],
        },
        gst_number: {
          type: String,
          // required: [true, "Gst number is required"],
          default: null,
        },
        web_url: {
          type: String,
          default: null,
        },
      },
    },
    isEditable: {
      type: Boolean,
      default: true,
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
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

log_invoice_schema.index({ inward_sr_no: 1 });
log_invoice_schema.index(
  { inward_sr_no: 1, 'expensesSchema.expenseType': 1 },
  { unique: true }
);

export const log_inventory_items_model = mongoose.model(
  'log_inventory_items_details',
  log_item_details_schema
);
export const log_inventory_invoice_model = mongoose.model(
  'log_inventory_invoice_details',
  log_invoice_schema
);

const log_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const log_inventory_items_view_model = mongoose.model(
  'log_inventory_items_view',
  log_inventory_items_view_schema
);

(async function () {
  await log_inventory_items_view_model.createCollection({
    viewOn: 'log_inventory_items_details',
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: 'log_inventory_invoice_details',
          localField: 'invoice_id',
          foreignField: '_id',
          as: 'log_invoice_details',
        },
      },
      {
        $unwind: {
          path: '$log_invoice_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'created_user',
        },
      },
      {
        $unwind: {
          path: '$created_user',
          preserveNullAndEmptyArrays: true,
        },
      },
    ],
  });
})();
