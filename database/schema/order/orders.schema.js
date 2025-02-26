import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';
import {
  branding_type,
  order_category,
  order_status,
  order_type,
} from '../../Utils/constants/constants.js';

const OrderSchema = new mongoose.Schema(
  {
    order_no: {
      type: Number,
      required: true,
      unique: true,
    },
    order_category: {
      type: String,
      enum: [
        order_category.raw,
        order_category.plain,
        order_category.series_product,
      ],
      required: true,
    },
    orderDate: { type: Date, required: true },
    customer_name: {
      type: String,
      required: true,
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      trim: true,
    },
    order_type: {
      type: String,
      enum: [order_type.job_work, order_type.regular],
      required: true,
      default: order_type.regular,
    },
    order_received_from: {
      type: String, //ONLINE, FACTORY, MOBILE
      // required: true,
      default: '',
    },
    credit_schedule: {
      type: String, //ADVANCE, AGAINST DISPATCH, 15 DAYS, 30 DAYS, 45 DAYS, 60 DAYS
      // required: true,
      default: '',
    },
    freight: {
      type: Number,
      default: 0,
    },
    local_freight: {
      type: Number,
      default: 0,
    },
    trade_discount_percentage: {
      type: Number,
      default: 0,
    },
    branding_type: {
      type: String,
      enum: [branding_type.with_branding, branding_type.without_branding],
      required: true,
      default: '',
    },
    common_instructions: {
      type: [Sting],
      default: null,
    },
    order_remarks: {
      type: String,
      uppercase: true,
      trim: true,
    },
    order_status: {
      type: String,
      enum: [
        order_status.complete,
        order_status.pending,
        order_status.partial_complete,
      ],
    },

    group_order_details: [
      {
        item_no: {
          type: Number,
          required: true,
        },
        // units: {
        //   type: String,
        //   required: true,
        // },
        order_group_no: {
          type: Number,
          default: null,
        },
        order_item_name: {
          type: String,
          required: true,
        },
        order_item_code: {
          type: String,
          required: true,
        },
        order_length: {
          type: Number,
          required: true,
        },
        order_width: {
          type: Number,
          required: true,
        },
        order_required_pcs: {
          type: Number,
          required: true,
          min: 1,
        },
        order_required_sqm: {
          type: Number,
          required: true,
        },
        order_rate: {
          type: Number,
          required: true,
        },
        total_order_amount: {
          type: Number,
          required: true,
        },
        order_dispatched_pcs_qty: {
          type: Number,
          default: 0,
        },
        order_balance_pcs_qty: {
          type: Number,
          default: 0,
        },
        order_status: {
          type: String,
          enum: ['pending', 'open', 'closed'],
        },
        item_remarks: {
          type: String,
        },
      },
    ],

    raw_order_details: [
      {
        item_no: {
          type: Number,
          required: true,
        },
        // units: {
        //   type: String,
        //   required: true,
        // },
        order_item_name: {
          type: String,
          required: true,
        },
        order_item_code: {
          type: String,
          required: true,
        },
        order_length: {
          type: Number,
          // required: true,
        },
        order_width: {
          type: Number,
          // required: true,
        },
        order_sqm: {
          type: Number,
          required: true,
        },
        order_rate: {
          type: Number,
          required: true,
        },
        total_order_amount: {
          type: Number,
          required: true,
        },
        required_quantity: {
          type: Number,
          default: 0,
        },
        // required_quantity: {
        //   natural: {
        //     type: Number,
        //     default: 0,
        //   },
        //   smoked: {
        //     type: Number,
        //     default: 0,
        //   },
        //   dyed: {
        //     type: Number,
        //     default: 0,
        //   },
        //   total: {
        //     type: Number,
        //     default: 0,
        //   },
        // },
        dispatched_quantity: {
          type: Number,
          default: 0,
        },
        // dispatched_quantity: {
        //   natural: {
        //     type: Number,
        //     default: 0,
        //   },
        //   smoked: {
        //     type: Number,
        //     default: 0,
        //   },
        //   dyed: {
        //     type: Number,
        //     default: 0,
        //   },
        //   total: {
        //     type: Number,
        //     default: 0,
        //   },
        // },
        balance_quantity: {
          type: Number,
          default: 0,
        },
        // balance_quantity: {
        //   natural: {
        //     type: Number,
        //     default: 0,
        //   },
        //   smoked: {
        //     type: Number,
        //     default: 0,
        //   },
        //   dyed: {
        //     type: Number,
        //     default: 0,
        //   },
        //   total: {
        //     type: Number,
        //     default: 0,
        //   },
        // },
        order_status: {
          type: String,
          enum: ['pending', 'open', 'closed'],
        },
        item_remarks: {
          type: String,
        },
      },
    ],

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

export const OrderModel = mongoose.model('orders', OrderSchema);
LogSchemaFunction('orders', OrderModel);
