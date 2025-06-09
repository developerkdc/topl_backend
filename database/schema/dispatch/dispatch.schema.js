import mongoose from "mongoose";
import { order_category, transaction_type } from "../../Utils/constants/constants.js";
const transaction_type_values = Object.values(transaction_type);

const address_schema = {
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
  gst_no: {
    type: String,
    uppercase: true,
    trim: true,
    default: null,
  },
};

const dispatchSchema = new mongoose.Schema({
  invoice_no: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true,
    uppercase: true,
  },
  invoice_date_time: {
    type: Date,
    required: [true, 'Invoice date and time is required'],
  },
  removal_of_good_date_time: {
    type: Date,
    required: [true, 'Removal of goods date and time is required'],
  },
  trans_doc_date: {
    type: Date,
    required: [true, 'Trans Doc date is required'],
  },
  trans_doc_no: {
    type: String,
    required: [true, 'Trans doc number is required'],
    trim: true,
    uppercase: true,
  },
  customer_id: {
    type: mongoose.Types.ObjectId,
    required: [true, 'Customer ID is required'],
  },
  customer_details: {
    type: Object,
    required: [true, 'Customer details are required']
  },
  is_tcs_applicable: {
    type: Boolean,
    default: function () {
      return customer_details?.is_tcs_applicable || false;
    },
  },
  is_tds_applicable: {
    type: Boolean,
    default: function () {
      return customer_details?.is_tcs_applicable || false;
    },
  },
  is_turnover_based_tcs_applicable: {
    type: Boolean,
    default: function () {
      return customer_details?.is_tcs_applicable || false;
    },
  },
  order_category: {
    type: String,
    enum: {
      values: [
        order_category?.raw,
        order_category?.decorative,
        order_category?.series_product,
      ],
      message: `Invalid type {{VALUE}} it must be one of the ${order_category?.raw, order_category?.decorative, order_category?.series_product}`,
    },
    required: [true, 'Order category is required'],
    trim: true,
  },
  product_category: {
    type: String,
    default: null,
    trim: true,
    uppercase: true,
  },
  packing_done_ids: {
    type: [
      {
        packing_done_mongodb_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, "Packing Done Mongodb ID is required."],
        },
        packing_done_id: {
          type: String,
          required: [true, "Packing Done ID is required."],
        },
      }
    ],
    default: [],
    validate: {
      validator: (v) => v.length > 0,
      message: 'Packing Ids cannot be empty',
    },
    required: [true, 'Packing Ids is required'],
  },
  supp_type: {
    type: String,
    required: [true, 'supp type is required'],
    trim: true,
    uppercase: true,
  },
  transaction_type: {
    type: String,
    required: [true, 'Transaction Type is required.'],
    enum: {
      values: transaction_type_values,
      message:
        'Invalid transaction type -> {{VALUE}}. It must be one of the : ' +
        transaction_type_values?.join(', '),
    },
  },
  address: {
    bill_from_address: address_schema,
    dispatch_from_address: address_schema,
    bill_to_address: address_schema,
    ship_to_address: address_schema,
  },
  is_part_b: {
    type: Boolean,
    default: false,
  },
  transporter_id: {
    type: mongoose.Types.ObjectId,
    required: [true, 'Transporter ID is required'],
  },
  transporter_details: {
    type: Object,
    required: [true, 'Transporter details are required']
  },
  approx_distance: {
    type: Number,
    default: null,
  },
  vehicle_id: {
    type: mongoose.Types.ObjectId,
    required: [true, 'Vehicle ID is required'],
  },
  vehicle_details: {
    type: Object,
    required: [true, 'Vehicle details are required']
  },
  irn_number: {
    type: Number,
    default: null,
  },
  acknowledgement_number: {
    type: Number,
    default: null,
  },
  eway_bill_no: {
    type: Number,
    default: null,
  },
  eway_bill_date: {
    type: Date,
    default: null,
  },
  qr_code_link: {
    type: [{
      name: String,
      url: String,
    }],
    default: null,
  },
  total_no_of_sheets: {
    type: Number,
    default: 0,
  },
  total_sqm: {
    type: Number,
    default: 0,
  },
  total_base_amount: {
    type: Number,
    default: 0,
  },
  insurance_percentage: {
    type: Number,
    default: 0,
  },
  insurance_amount: {
    type: Number,
    default: 0,
  },
  total_amount_with_insurance: {
    type: Number,
    default: 0,
  },
  freight_amount: {
    type: Number,
    default: 0,
  },
  other_amount: {
    type: Number,
    default: 0,
  },
  total_amount_with_expenses: {
    type: Number,
    default: 0,
  },
  gst_details: {
    gst_percentage: {
      type: Number,
      default: 0,
    },
    gst_amount: {
      type: Number,
      default: 0,
    },
    igst_percentage: {
      type: Number,
      default: 0,
    },
    igst_amount: {
      type: Number,
      default: 0,
    },
    cgst_percentage: {
      type: Number,
      default: 0,
    },
    cgst_amount: {
      type: Number,
      default: 0,
    },
    sgst_percentage: {
      type: Number,
      default: 0,
    },
    sgst_amount: {
      type: Number,
      default: 0,
    },
  },
  total_amount_with_gst: {
    type: Number,
    default: 0,
  },
  final_total_amount: {
    type: Number,
    default: 0,
  },
  remark: {
    type: String,
    default: null,
    trim: true,
    uppercase: true,
  },
  created_by: {
    type: mongoose.Types.ObjectId,
    ref: 'users',
    required: [true, 'Created By is required'],
    trim: true,
  },
  updated_by: {
    type: mongoose.Types.ObjectId,
    ref: 'users',
    required: [true, 'Updated By is required'],
    trim: true,
  },
}, {
  timestamps: true,
});

const diapatchModel = mongoose.model('dispatches', dispatchSchema, "dispatches");
export default diapatchModel;