import mongoose from 'mongoose';
import invoice_details from '../../../Utils/invoiceDetails.schema.js';
import expensesSchema from '../../masters/expenses.schema.js';
import { approval_status } from '../../../Utils/approvalStatus.schema.js';
import { issues_for_status } from '../../../Utils/constants/constants.js';

export const item_details_schema = new mongoose.Schema(
  {
    supplier_item_name: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    supplier_flitch_no: {
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
      required: [true, 'Invoice Sr No is required'],
    },
    item_name: {
      type: String,
      required: [true, 'Item Name is required'],
      trim: true,
      uppercase: true,
    },
    item_sub_category_name: {
      type: String,
      required: [true, 'item_sub_category_name is required'],
      trim: true,
      uppercase: true,
    },
    item_sub_category_id: {
      type: String,
      required: [true, 'item_sub_category_id is required'],
    },
    log_no: {
      type: String,
      required: [true, 'Log No is required'],
      trim: true,
      uppercase: true,
    },
    flitch_code: {
      type: String,
      required: [true, 'Flitch Code is required'],
      trim: true,
      uppercase: true,
    },
    flitch_formula: {
      type: String,
      required: [true, 'Flitch formula is required'],
    },
    length: {
      type: Number,
      required: [true, 'Length is required'],
    },
    width1: {
      type: Number,
      required: [true, 'width1 is required'],
    },
    width2: {
      type: Number,
      required: [true, 'width2 is required'],
    },
    width3: {
      type: Number,
      required: [true, 'width3 is required'],
    },
    height: {
      type: Number,
      required: [true, 'height is required'],
    },
    flitch_cmt: {
      type: Number,
      required: [true, 'Flitch Cmt is required'],
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
    color: {
      color_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        // required: [true, 'color id is required'],
      },
      color_name: {
        type: String,
        default: null,
        // required: [true, 'color name is required'],
      },
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          issues_for_status?.slicing,
          issues_for_status?.slicing_peeling,
          issues_for_status?.order,
          issues_for_status?.chalan,
        ],
        message: `Invalid status {{VALUE}} Issue Status must either be one of ${issues_for_status?.slicing}, ${issues_for_status?.slicing_peeling}, ${issues_for_status?.order}}, ${issues_for_status?.chalan}`,
      },
      default: null,
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

item_details_schema.index({ item_sr_no: 1 });
item_details_schema.index({ item_sr_no: 1, invoice_id: 1 }, { unique: true });

export const flitch_invoice_schema = new mongoose.Schema(
  {
    inward_sr_no: {
      type: Number,
      unique: true,
      required: [true, 'Inwrad Sr No is required'],
    },
    inward_date: {
      type: Date,
      default: Date.now,
      required: [true, 'Inwrad Date is required'],
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
                trim: true,
                default: null,
              },
              mobile_number: {
                type: String,
                // required: [true, "mobile number is required"],
                default: null,
              },
              designation: {
                type: String,
                // required: [true, "designation is required"],

                trim: true,
                uppercase: true,
                default: null,
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
      // required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

flitch_invoice_schema.index({ inward_sr_no: 1 });
flitch_invoice_schema.index(
  { inward_sr_no: 1, 'expensesSchema.expenseType': 1 },
  { unique: true }
);

const flitch_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const flitch_inventory_items_view_model = mongoose.model(
  'flitch_inventory_items_view',
  flitch_inventory_items_view_schema
);

(async function () {
  await flitch_inventory_items_view_model.createCollection({
    viewOn: 'flitch_inventory_items_details',
    pipeline: [
      {
        $sort: {
          updatedAt: 1,
          _id: 1,
        },
      },
      {
        $lookup: {
          from: 'flitch_inventory_invoice_details',
          localField: 'invoice_id',
          foreignField: '_id',
          as: 'flitch_invoice_details',
        },
      },
      {
        $unwind: {
          path: '$flitch_invoice_details',
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

export const flitch_inventory_items_model = mongoose.model(
  'flitch_inventory_items_details',
  item_details_schema
);
export const flitch_inventory_invoice_model = mongoose.model(
  'flitch_inventory_invoice_details',
  flitch_invoice_schema
);
