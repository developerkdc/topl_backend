import mongoose from 'mongoose';
import {
  item_issued_for,
  item_issued_from,
} from '../../../../Utils/constants/constants.js';

const validate_order_field = function () {
  return this.issued_for === item_issued_for?.order ? true : false;
};

const issue_for_cnc_schema = new mongoose.Schema(
  {
    sr_no: Number,
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [validate_order_field, 'Order ID is required.'],
      default: null,
    },
    order_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [validate_order_field, 'Order Item ID is required.'],
      default: null,
    },
    issued_from_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issued From ID is required.'],
    },
    pressing_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Pressing Details ID is required"]
    },
    issued_sheets: {
      type: Number,
      required: [true, 'Issued Sheets are required.'],
    },
    issued_sqm: {
      type: Number,
      required: [true, 'Issued SQM is required.'],
    },
    issued_amount: {
      type: Number,
      required: [true, 'Issued Amount is required.'],
    },
    is_cnc_done: {
      type: Boolean,
      default: false,
    },
    available_details: {
      no_of_sheets: {
        type: Number,
        default: function () {
          return this.issued_sheets;
        },
      },
      sqm: {
        type: Number,
        default: function () {
          return this.issued_sqm;
        },
      },
      amount: {
        type: Number,
        default: function () {
          return this.issued_amount;
        },
      },
    },

    issued_from: {
      type: String,
      enum: {
        values: [
          item_issued_from?.pressing_factory,
          item_issued_from?.cnc_factory,
          item_issued_from?.color_factory,
          item_issued_from?.bunito_factory,
          item_issued_from?.polishing_factory,
        ],
        message: `Invalid Type -> {{VALUE}} , it must be one of the ${(item_issued_from?.pressing_factory, item_issued_from?.cnc_factory, item_issued_from?.color_factory, item_issued_from?.bunito_factory, item_issued_from?.polishing_factory)}`,
      },
      required: [true, 'Issued from is required.'],
    },
    issued_for: {
      type: String,
      enum: {
        values: [
          item_issued_for?.order,
          item_issued_for?.sample,
          item_issued_for?.stock,
        ],
        message: `Invalid type -> {{VALUE}}, it must be one of the ${(item_issued_for?.order, item_issued_for?.sample, item_issued_for?.stock)}`,
      },
      required: [true, 'Item Issued for is required.'],
    },
    remark: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By is required'],
    },
  },
  { timestamps: true }
);
const indexed_fields = [
  [{ sr_no: 1 }, { unique: true }],
  [{ 'available_details.no_of_sheets': 1 }],
  [{ 'available_details.sqm': 1 }],
  [{ 'available_details.amount': 1 }],
];
indexed_fields?.forEach((field) => issue_for_cnc_schema.index(...field));

const issue_for_cnc_model = mongoose.model(
  'issued_for_cnc_details',
  issue_for_cnc_schema,
  'issued_for_cnc_details'
);
export default issue_for_cnc_model;
