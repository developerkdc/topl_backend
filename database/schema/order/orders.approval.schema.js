import mongoose from 'mongoose';
import {
  approval_for_type,
  branding_type,
  order_category,
  order_status,
  order_type,
} from '../../Utils/constants/constants.js';
import { approval_status } from '../../Utils/approvalStatus.schema.js';
import approvalSchema from '../../Utils/approval.schema.js';

const order_approval_schema = new mongoose.Schema(
  {
    order_no: {
      type: Number,
      required: true,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Order Id is required'],
    },
    order_category: {
      type: String,
      enum: [
        order_category.raw,
        order_category.decorative,
        order_category.series_product,
      ],
      required: true,
      uppercase: true,
      trim: true,
    },
    orderDate: { type: Date, required: true },

    owner_name: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    order_type: {
      type: String,
      enum: [order_type.job_work, order_type.regular],
      required: true,
      default: order_type.regular,
      uppercase: true,
      trim: true,
    },
    order_received_from: {
      type: String, //ONLINE, FACTORY, MOBILE
      // required: true,
      default: null,
      uppercase: true,
      trim: true,
    },
    credit_schedule: {
      type: String, //ADVANCE, AGAINST DISPATCH, 15 DAYS, 30 DAYS, 45 DAYS, 60 DAYS
      // required: true,
      default: null,
      uppercase: true,
      trim: true,
    },
    freight: {
      type: Number,
      default: 0,
    },
    local_freight: {
      type: Number,
      default: 0,
    },
    // trade_discount_percentage: {
    //   type: Number,
    //   default: 0,
    // },
    branding_type: {
      type: String,
      enum: [branding_type.with_branding, branding_type.without_branding],
      // required: true,
      default: null,
      uppercase: true,
      trim: true,
    },
    common_instructions: {
      type: [
        {
          type: String,
          trim: true,
          uppercase: true,
        },
      ],
      default: null,
    },
    order_remarks: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    order_status: {
      type: String,
      enum: [
        order_status.complete,
        order_status.pending,
        order_status.partial_complete,
        order_status.cancelled,
        order_status.closed,
      ],
      uppercase: true,
      trim: true,
      default: null,
    },

    raw_materials: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
      default: null,
    },

    series_product: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
      default: null,
    },
    product_category: {
      type: String,
      default: function () {
        const product_category = {
          [order_category.raw]: this.order_category.raw_materials,
          [order_category.decorative]: 'DECORATIVE',
          [order_category.series_product]:
            this.order_category.series_product_materials,
        };
        return product_category[this.order_category] || null;
      },
      uppercase: true,
      trim: true,
      required: [true, 'Product category is required'],
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    approval_for: {
      type: String,
      uppercase: true,
      trim: true,
      enum: {
        values: [approval_for_type.order_update, approval_for_type.order_cancellation, approval_for_type.order_item_cancellation],
        message: '{VALUE} is not supported',
      },
      default: approval_for_type.order_update,
    },
    approval_status: approval_status,

    // is_close: {
    //   type: String,
    //   uppercase: true,
    //   trim: true,
    //   default: null,
    // },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By Id is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Updated By Id is required'],
    },
  },
  {
    timestamps: true,
  }
);

order_approval_schema.add(approvalSchema)

// indexing
const indexingFields = [
  [{ order_no: 1 }],
  [{ order_category: 1 }],
  [{ orderDate: 1 }],
  [{ owner_name: 1 }],
  [{ customer_id: 1 }],
  [{ order_type: 1 }],
  [{ order_status: 1 }],
  [{ raw_materials: 1 }],
  [{ series_product: 1 }],
  [{ created_by: 1 }],
  [{ updatedAt: 1 }],
  [{ createdAt: 1 }],
];

indexingFields.forEach((index) => order_approval_schema.index(...index));

export const orders_approval_model = mongoose.model('orders_approval', order_approval_schema, 'orders_approval');
