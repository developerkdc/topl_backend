import mongoose from 'mongoose';
import LogSchemaFunction from '../../LogsSchema/logs.schema.js';

const RawMaterialSchema = new mongoose.Schema({
  invoice_no: {
    type: String,
    required: [true, 'Invoice No is required.'],
    trim: true,
  },
  invoice_date: {
    type: Date,
    trim: true,
  },
  date_of_inward: {
    type: Date,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: [
      'available',
      'not available',
      'issued for grouping',
      'issued for smoking',
      'grouped',
      'smoked',
    ],
    default: 'available',
  },
  item_name: {
    type: String,
    required: [true, 'Item Name is required.'],
    trim: true,
  },
  item_code: {
    type: String,
    required: [true, 'Item Code is required.'],
    trim: true,
  },
  item_log_no: {
    type: String,
    required: [true, 'Item Log No is required.'],
    trim: true,
  },
  item_bundle_no: {
    type: String,
    required: [true, 'Item Bundle No is required.'],
    trim: true,
  },
  item_length: {
    type: Number,
    required: [true, 'Item Length is required.'],
    trim: true,
  },
  item_width: {
    type: Number,
    required: [true, 'Item Width is required.'],
    trim: true,
  },
  // item_received_quantities: {
  //   natural: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   dyed: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   smoked: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   total: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  // },
  item_received_pattas: {
    type: Number,
    trim: true,
    required: true,
    min: 0,
  },
  item_received_sqm: {
    type: Number,
    required: true,
    trim: true,
    min: 0,
  },
  // item_available_quantities: {
  //   natural: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   dyed: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   smoked: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   total: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  // },
  item_available_pattas: {
    type: Number,
    trim: true,
    required: true,
    min: 0,
  },
  item_available_sqm: {
    type: Number,
    trim: true,
    required: true,
    min: 0,
  },

  // item_rejected_quantities: {
  //   natural: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   dyed: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   smoked: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  //   total: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //   },
  // },
  item_rejected_pattas: {
    type: Number,
    default: 0,
    min: 0,
  },
  item_rejected_sqm: {
    type: Number,
    default: 0,
    min: 0,
  },

  item_pallete_no: {
    type: String,
    required: [true, 'Item Pallete No is required.'],
    trim: true,
  },
  item_physical_location: {
    type: String,
    required: [true, 'Item Physical Location is required.'],
    trim: true,
  },
  item_grade: {
    type: String,
    required: [true, 'Item Grade is required.'],
    trim: true,
  },
  item_rate_per_sqm: {
    type: Number,
    required: [true, 'Item Rate Per SQM required.'],
    trim: true,
  },
  item_remark: {
    type: String,
    trim: true,
  },
  supplier_details: {
    supplier_name: {
      type: String,
      required: [true, 'Supplier Name is required.'],
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      minlength: 6,
      required: true,
      maxlength: 6,
      trim: true,
    },
    bill_address: {
      type: String,
      required: true,
      trim: true,
    },
    delivery_address: {
      type: String,
      required: true,
      trim: true,
    },
    contact_Person_name: {
      type: String,
      required: true,
      trim: true,
    },
    contact_Person_number: {
      type: String,
      required: true,
      trim: true,
    },
    country_code: {
      type: String,
      required: true,
      trim: true,
    },
    email_id: {
      type: String,
      trim: true,
    },
    pan_no: {
      type: String,
      trim: true,
      // required: [true, "PAN NO is Required"],
    },
    gst_no: {
      type: String,
      // required: [true, "GST NO is Required"],
      trim: true,
    },
  },
  raw_remarks: {
    type: String,
  },
  currency: {
    type: String,
    default: '',
  },
  conversion_rate: {
    type: Number,
    default: 0,
  },
  item_rate_per_sqm_for_currency: {
    type: Number,
    default: 0,
  },
  gst: {
    type: Number,
    default: 0,
  },
  igst: {
    type: Number,
    default: 0,
  },
  cgst: {
    type: Number,
    default: 0,
  },
  sgst: {
    type: Number,
    default: 0,
  },
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    trim: true,
  },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const RawMaterialModel = mongoose.model(
  'raw_material',
  RawMaterialSchema
);
export const RawHistoryModel = mongoose.model(
  'raw_material_history',
  RawMaterialSchema
);
LogSchemaFunction('rawMaterial', RawMaterialModel, []);
LogSchemaFunction('rawMaterialHistory', RawHistoryModel, []);
