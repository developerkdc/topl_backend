import mongoose from 'mongoose';
import {
  branding_type,
  credit_schedule_type,
  customer_supplier_type,
} from '../../Utils/constants/constants.js';

const contactPersonSchema = new mongoose.Schema({
  person_name: {
    type: String,
    uppercase: true,
    trim: true,
    required: [true, 'Person name is required'],
    // default: null
  },
  mobile_no: {
    type: String,
    trim: true,
    required: [true, 'Mobile No is required'],
    // default: null
  },
  email_id: {
    type: String,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    required: [true, 'Email Id is required'],
    // default: null
  },
});

const addressSchema = new mongoose.Schema({
  address: {
    type: String,
    uppercase: true,
    trim: true,
    // required: [true, 'Address is required'],
    default: null
  },
  country: {
    type: String,
    trim: true,
    // required: [true, 'country is required'],
    default: null
  },
  state: {
    type: String,
    trim: true,
    // required: [true, 'state is required'],
    default: null
  },
  city: {
    type: String,
    trim: true,
    // required: [true, 'city is required'],
    default: null
  },
  pincode: {
    type: String,
    trim: true,
    // required: [true, 'pincode is required'],
    default: null
  },
  gst_number: {
    type: String,
    uppercase: true,
    trim: true,
    default: null,
  },
  gst_no: {
    type: String,
    uppercase: true,
    trim: true,
    default: null,
  },
});

const customerSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
      // unique: [true, "Sr.No must be unique"]
    },
    company_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Company name is required'],
    },
    customer_type: {
      type: [String],
      uppercase: true,
      enum: {
        values: ['REGULAR', 'JOB WORK'],
        message: 'Invalid customer type {{VALUE}}, should be REGULAR, JOB WORK',
      },
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: 'Customer type is required',
      },
      trim: true,
    },
    owner_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Owner name is required'],
    },
    supplier_type: {
      type: String,
      uppercase: true,
      enum: {
        values: [
          customer_supplier_type.b2b,
          customer_supplier_type.b2c,
          customer_supplier_type.sezwp,
          customer_supplier_type.sezwop,
          customer_supplier_type.expwp,
          customer_supplier_type.expwop,
          customer_supplier_type.dexp,
          customer_supplier_type.merchant_export,
        ],
        message:
          'Invalid supplier type {{VALUE}}, should be B2B, B2C, SEZWP, SEZWOP, EXPWP, EXPWOP, DEXP, MERCHANT EXPORT',
      },
      trim: true,
      required: [true, 'Supplier type is required'],
    },
    dob: {
      type: Date,
      required: [true, 'DOB is required'],
    },
    email_id: {
      type: String,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address',
      ],
      required: [true, 'Email Id is required'],
    },
    web_url: {
      type: String,
      trim: true,
      default: null,
    },
    gst_number: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'gst number is required'],
    },
    pan_number: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'pan number is required'],
    },
    legal_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'legal name is required'],
    },
    preferable_transport_for_part_load: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'transporters',
      required: [true, 'Preferable Transport for Part Load is required'],
    },
    is_tcs_applicable: {
      type: Boolean,
      default: false,
    },
    is_tds_applicable: {
      type: Boolean,
      default: false,
    },
    is_turnover_based_tcs_applicable: {
      type: Boolean,
      default: true,
    },
    remark: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    contact_person: {
      type: [contactPersonSchema],
      // validate: {
      //   validator: function (value) {
      //     return value.length > 0;
      //   },
      //   message: 'Atleast one contact person is required',
      // },
      default: []
    },
    address: {
      billing_address: {
        type: addressSchema,
        // required: [true, 'Billing address is required'],
        default: null
      },
      delivery_address: {
        type: addressSchema,
        // required: [true, 'Delivery address is required'],
        default: null
      },
      alternate_delivery_address: {
        type: addressSchema,
        // required: [true, 'Alternate delivery address is required'],
        default: null
      },
      communication_address: {
        type: addressSchema,
        // required: [true, 'Communication address is required'],
      },
    },
    photo_type: {
      photo_type_a: {
        type: Number,
        default: null,
      },
      photo_type_b: {
        type: Number,
        default: null,
      },
      photo_type_c: {
        type: Number,
        default: null,
      },
    },
    is_insurance_applicable: {
      type: Boolean,
      default: false,
    },
    branding_type: {
      type: String,
      uppercase: true,
      trim: true,
      enum: {
        values: [branding_type.with_branding, branding_type.without_branding],
        message:
          'Invalid branding type {{VALUE}}, should be WITH BRANDING, WITHOUT BRANDING',
      },
      required: [true, 'Branding type is required'],
    },
    credit_schedule: {
      type: String,
      uppercase: true,
      trim: true,
      enum: {
        values: [
          credit_schedule_type.advance,
          credit_schedule_type.against_dispatch,
          credit_schedule_type['15_days'],
          credit_schedule_type['30_days'],
          credit_schedule_type['45_days'],
          credit_schedule_type['60_days'],
        ],
        message:
          'Invalid credit schedule type {{VALUE}}, should be ADVANCE, AGAINST DISPATCH, 15 DAYS, 30 DAYS, 45 DAYS, 60 DAYS',
      },
      default: null,
    },
    freight: {
      type: Number,
      default: 0,
    },
    local_freight: {
      type: Number,
      default: 0,
    },
    status: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'created by is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'updated by is required'],
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ company_name: 1 }, { unique: true });
customerSchema.index({ gst_number: 1 }, { unique: true });
customerSchema.index({ pan_number: 1 }, { unique: true });
customerSchema.index({ sr_no: 1 }, { unique: true });
customerSchema.index({ created_by: 1 });
customerSchema.index({ updated_by: 1 });

//customer client
const customerClientSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'customer id is required'],
    },
    client_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Person name is required'],
    },
    mobile_no: {
      type: String,
      trim: true,
      required: [true, 'Mobile No is required'],
    },
    email_id: {
      type: String,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address',
      ],
      required: [true, 'Email Id is required'],
    },
    gst_number: {
      type: String,
      trim: true,
      required: [true, 'gst number is required'],
    },
    address: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Address is required'],
    },
    country: {
      type: String,
      trim: true,
      required: [true, 'country is required'],
    },
    state: {
      type: String,
      trim: true,
      required: [true, 'state is required'],
    },
    city: {
      type: String,
      trim: true,
      required: [true, 'city is required'],
    },
    pincode: {
      type: String,
      trim: true,
      required: [true, 'pincode is required'],
    },
  },
  {
    timestamps: true,
  }
);

customerClientSchema.index({ customer_id: 1, email_id: 1 }, { unique: true });
customerClientSchema.index({ customer_id: 1, gst_number: 1 }, { unique: true });

export const customer_model = mongoose.model(
  'customers',
  customerSchema,
  'customers'
);
export const customer_client_model = mongoose.model(
  'customer_clients',
  customerClientSchema,
  'customer_clients'
);
