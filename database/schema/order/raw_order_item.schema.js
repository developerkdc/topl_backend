import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const OrderItemSchema = new mongoose.Schema(
  {
    item_no: {
      type: Number,
      required: [true, 'Item Number is required.'],
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'orders',
      required: [true, 'Order Id is required'],
    },

    raw_order_item_details: {
      type: {},
      default: null,
    },
    decorative_order_item_details: {
      type: {},
      default: null,
    },
    series_order_item_details: {
      type: {},
      default: null,
    },
    item_remarks: {
      type: String,
    },

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

const raw_order_item_details_schema = {};

export const OrderItemModel = mongoose.model('order_item', OrderItemSchema);
