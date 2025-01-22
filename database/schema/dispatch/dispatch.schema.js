import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const DispatchSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'order',
    trim: true,
  },
  invoice_no: {
    type: String,
    required: true,
    trim: true,
  },
  group_dispatch_details: [
    {
      item_no: { type: Number, required: true },
      dispatch: [
        {
          qc_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'qc_done_inventories',
            trim: true,
          },
          total_item_amount: { type: Number, required: true },
          qc_dispatched_qty: { type: Number, required: true },
          dispatch_sqm: { type: Number, required: true },
        },
      ],
      total_pcs: { type: Number, required: true },
      group_sqm: { type: Number, required: true },
      total_amount: { type: Number, required: true },
      item_remarks: { type: String },
    },
  ],
  raw_dispatch_details: [
    {
      item_no: { type: Number, required: true },
      dispatch: [
        {
          raw_material_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'raw_materials',
            trim: true,
          },
          dispatched_quantity: {
            type: Number,
            default: 0,
          },
          // natural: {
          //   type: Number,
          //   default: 0,
          // },
          // smoked: {
          //   type: Number,
          //   default: 0,
          // },
          // dyed: {
          //   type: Number,
          //   default: 0,
          // },
          // total: {
          //   type: Number,
          //   default: 0,
          // },
          dispatch_sqm: { type: Number, required: true },
          total_item_amount: { type: Number, required: true },
        },
      ],
      total_pattas: {
        type: Number,
        default: 0,
      },
      // total_pattas: {
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
      item_sqm: { type: Number, required: true },
      total_amount: { type: Number, required: true },
      item_remarks: { type: String },
    },
  ],
  main_remarks: { type: String },
  total_amount: { type: Number, required: true },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    trim: true,
  },
  dispatch_remarks: {
    type: String,
  },
  dispatched_date: {
    type: Date,
    required: true,
  },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const DispatchModel = mongoose.model('dispatch', DispatchSchema);
LogSchemaFunction('dispatch', DispatchModel);
