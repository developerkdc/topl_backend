import mongoose from 'mongoose';
import approvalSchema from '../../../Utils/approval.schema.js';
import {
  inward_type,
  issues_for_status,
} from '../../../Utils/constants/constants.js';
import { approval_invoice_details } from '../../../Utils/invoiceDetails.schema.js';
import { approvalExpensesSchema } from '../../masters/expenses.schema.js';
import { approval_status } from '../../../Utils/approvalStatus.schema.js';

const log_approval_item_details_schema = new mongoose.Schema(
  {
    log_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items id is required'],
    },
    approval_invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'approval invoice id is required'],
    },
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
    },
    log_formula: {
      type: String,
      required: [true, 'Log formula is required'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [issues_for_status.crosscutting, issues_for_status.flitching],
        message: `Invalid status {{VALUE}} Issue Status must either be one of ${issues_for_status.crosscutting}, ${issues_for_status.flitching}`,
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

log_approval_item_details_schema.index({ item_sr_no: 1 });
log_approval_item_details_schema.index({ item_sr_no: 1, invoice_id: 1 });

const log_approval_invoice_schema = new mongoose.Schema(
  {
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Invoice id is required'],
    },
    inward_sr_no: {
      type: Number,
      default: null,
      required: [true, 'Inward Sr.No is required. '],
    },
    inward_date: {
      type: Date,
      default: Date.now,
      required: [true, 'Inward Date is required.'],
    },
    inward_type: {
      type: String,
      enum: {
        values: [
          inward_type.inventory,
          inward_type.job_work,
          inward_type.challan,
        ],
        message: `Invalid status {{VALUE}} Issue Status must either be one of ${inward_type.inventory}, ${inward_type.job_work}, ${inward_type.challan}`,
      },
      required: [true, 'Inward Type is required'],
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
log_approval_invoice_schema.add(approvalSchema);

log_approval_invoice_schema.index({ inward_sr_no: 1 });
log_approval_invoice_schema.index({
  inward_sr_no: 1,
  'expensesSchema.expenseType': 1,
});

export const log_approval_inventory_items_model = mongoose.model(
  'log_approval_inventory_items_details',
  log_approval_item_details_schema
);
export const log_approval_inventory_invoice_model = mongoose.model(
  'log_approval_inventory_invoice_details',
  log_approval_invoice_schema
);
