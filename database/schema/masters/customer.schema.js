import mongoose from 'mongoose';

const contactPersonSchema = new mongoose.Schema({
  person_name: {
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
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    required: [true, 'Email Id is required'],
  },
});

const addressSchema = new mongoose.Schema({
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
        values: ['B2B', 'B2C'],
        message: 'Invalid supplier type {{VALUE}}, should be B2B, B2C',
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
    fax_number: {
      type: String,
      trim: true,
      default: null,
    },
    gst_number: {
      type: String,
      trim: true,
      required: [true, 'gst number is required'],
    },
    pan_number: {
      type: String,
      trim: true,
      required: [true, 'pan number is required'],
    },
    legal_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'legal name is required'],
    },
    ecc_number: {
      type: String,
      trim: true,
      default: null,
    },
    cst_tin_number: {
      type: String,
      trim: true,
      default: null,
    },
    gst_tin_number: {
      type: String,
      trim: true,
      default: null,
    },
    preferable_transport_for_part_load: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'transporters',
      required: [true, 'Preferable Transport for Part Load is required'],
    },
    remark: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    contact_person: {
      type: [contactPersonSchema],
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: 'Atleast one contact person is required',
      },
    },
    address: {
      billing_address: {
        type: addressSchema,
        required: [true, 'Billing address is required'],
      },
      delivery_address: {
        type: addressSchema,
        required: [true, 'Delivery address is required'],
      },
      alternate_delivery_address: {
        type: addressSchema,
        required: [true, 'Alternate delivery address is required'],
      },
      communication_address: {
        type: addressSchema,
        required: [true, 'Communication address is required'],
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
