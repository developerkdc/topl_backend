import mongoose from 'mongoose';
import invoice_details, {
  approval_invoice_details,
} from '../../../Utils/invoiceDetails.schema.js';
import { inward_type, issues_for_status } from '../../../Utils/constants/constants.js';
import expensesSchema, {
  approvalExpensesSchema,
} from '../../masters/expenses.schema.js';
// import { otherGoods_invoice_schema, item_details_schema } from "./otherGoods.schema.js";
import approvalSchema from '../../../Utils/approval.schema.js';
import {
  item_details_schema,
  othergoods_invoice_schema,
} from './otherGoodsNew.schema.js';
import { approval_status } from '../../../Utils/approvalStatus.schema.js';

const otherGoods_approval_item_details_schema = new mongoose.Schema(
  {
    otherGoods_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items id is required'],
    },
    approval_invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items id is required'],
    },
    supplier_item_name: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items id is required'],
    },
    item_sr_no: {
      type: Number,
      required: [true, 'item Sr No is required'],
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
    item_sub_category_name: {
      type: String,
      required: [true, 'other goods sub category name is required'],
      trim: true,
      uppercase: true,
    },
    item_sub_category_id: {
      type: String,
      required: [true, 'other goods sub category id is required'],
      ref: 'item_subcategory',
    },
    department_id: {
      type: String,
      required: [true, 'department id is required'],
    },
    department_name: {
      type: String,
      required: [true, 'department name is required'],
      trim: true,
      uppercase: true,
    },
    machine_id: {
      type: String,
      required: [true, 'machine id is required'],
      ref: 'machine',
    },
    machine_name: {
      type: String,
      required: [true, 'machine name is required'],
      trim: true,
      uppercase: true,
    },
    brand_name: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    item_description: {
      type: String,
      required: [true, 'description is required'],
    },
    total_quantity: {
      type: Number,
      required: [true, 'total_quantity is required'],
    },
    rate_in_currency: {
      type: Number,
      required: [true, 'Rate in currency is required'],
    },
    exchange_rate: {
      type: Number,
      required: [true, 'exchange rate is required'],
    },
    rate_in_inr: {
      type: Number,
      required: [true, 'Rate in inr is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
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
      required: [true, 'Invioce Id is required'],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'created by is required field'],
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

otherGoods_approval_item_details_schema.index({ item_sr_no: 1 });
otherGoods_approval_item_details_schema.index({ item_sr_no: 1, invoice_id: 1 });

const otherGoods_approval_invoice_schema = new mongoose.Schema(
  {
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Invoice id is required'],
    },
    inward_sr_no: {
      type: Number,
      required: [true, 'Inwrad Sr No is required'],
    },
    inward_date: {
      type: Date,
      default: Date.now,
      required: [true, 'Inwrad Date is required'],
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
      required: [true, 'Inwrad Date is required']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
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
          required: [true, 'company id is required'],
        },
        branch_name: {
          type: String,
          required: [true, 'branch name is reqiured'],
          trim: true,
          uppercase: true,
        },
        contact_person: {
          type: [
            {
              name: {
                type: String,
                required: [true, 'contact person name is required'],
                trim: true,

                uppercase: true,
              },
              email: {
                type: String,
                // required: [true, "email id is required"],
                default: null,
                trim: true,
              },
              mobile_number: {
                type: String,
                // required: [true, "mobile number is required"],
                default: null,
              },
              designation: {
                type: String,
                // required: [true, "designation is required"],
                default: null,
                trim: true,
                uppercase: true,
              },
            },
          ],
          required: [true, 'at least one contact person is required'],
        },
        address: {
          type: String,
          required: [true, 'address is required'],
          trim: true,
          uppercase: true,
        },
        state: {
          type: String,
          required: [true, 'state is required'],
          trim: true,
          // uppercase: true
        },
        country: {
          type: String,
          required: [true, 'country is required'],
          trim: true,
          // uppercase: true
        },
        city: {
          type: String,
          required: [true, 'city is required'],
          trim: true,
          // uppercase: true
        },
        pincode: {
          type: String,
          required: [true, 'pincode is required'],
        },
        gst_number: {
          type: String,
          // required: [true, "gst number is required"],
          default: null,
        },
        web_url: {
          type: String,
          default: null,
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
      type: mongoose.Types.ObjectId,
      ref: 'users',
      // required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);
otherGoods_approval_invoice_schema.add(approvalSchema);

otherGoods_approval_invoice_schema.index({ inward_sr_no: 1 });
otherGoods_approval_invoice_schema.index({
  inward_sr_no: 1,
  'expensesSchema.expenseType': 1,
});

export const otherGoods_approval_inventory_items_model = mongoose.model(
  'otherGoods_approval_inventory_items_details',
  otherGoods_approval_item_details_schema
);
export const otherGoods_approval_inventory_invoice_model = mongoose.model(
  'otherGoods_approval_inventory_invoice_details',
  otherGoods_approval_invoice_schema
);
