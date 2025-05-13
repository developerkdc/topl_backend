import mongoose from 'mongoose';
import { challan_status, item_issued_from, transaction_type } from '../../../Utils/constants/constants.js';
const issued_from_values = Object.values(item_issued_from);
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
        default: null
    }
}

const cnc_done_schema = new mongoose.Schema(
    {
        challan_date: {
            type: Date,
            required: [true, 'Challan Date is required.'],
        },
        challan_no: {
            type: String,
            required: [true, 'Challan number is required.'],
        },
        transport_document_date: {
            type: String,
            required: [true, 'Transport Document Date is required.'],
        },
        transport_document_no: {
            type: String,
            required: [true, 'Transport Document No is required.'],
        },
        customer_name: {
            type: String,
            uppercase: true,
            required: [true, 'Customer name is required.'],
        },
        customer_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Customer ID is required.'],
        },
        transporter_name: {
            type: String,
            uppercase: true,
            required: [true, 'Transporter name is required.'],
        },
        transporter_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Transporter ID is required.'],
        },
        vehicle_name: {
            type: String,
            uppercase: true,
            required: [true, 'Vehicle name is required.'],
        },
        vehicle_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Vehicle ID is required.'],
        },
        transaction_type: {
            type: String,
            required: [true, 'Transaction Type is required.'],
            enum: {
                values: transaction_type_values,
                message:
                    'Invalid transaction type -> {{VALUE}}. It must be one of the : ' +
                    transaction_type_values?.join(', '),
            }
        },
        address: {
            bill_from_address: address_schema,
            dispatch_from_address: address_schema,
            bill_to_address: address_schema,
            ship_to_address: address_schema,
        },
        address_of_buyer_id: {
            type: mongoose.Schema.Types.ObjectId,
            // required: [true, 'Address of buyer is required.'],
            default: null
        },
        address_of_seller_id: {
            type: mongoose.Schema.Types.ObjectId,
            // required: [true, 'Address of seller is required.'],
            default: null
        },
        address_of_buyer: {
            type: String,
            uppercase: true,
            // required: [true, 'Address of buyer is required.'],
            default: null
        },
        address_of_seller: {
            type: String,
            uppercase: true,
            // required: [true, 'Address of seller is required.'],
            default: null
        },
        approx_distance: {
            type: Number,
            // required: [true, 'Approx Distance is required.'],
            default: null
        },
        irn_number: {
            type: Number,
            // required: [true, 'IRN Number is required.'],
            default: null
        },
        acknowledgement_number: {
            type: Number,
            // required: [true, 'Acknowledgement Number is required.'],
            default: null
        },
        eway_bill_no: {
            type: Number,
            // required: [true, 'EWAY bill number is required.'],
            default: null
        },
        eway_bill_date: {
            type: Date,
            // required: [true, 'EWAY bill date is required.'],
            default: null
        },
        raw_material: {
            type: String,
            uppercase: true,
            enum: {
                values: issued_from_values,
                message:
                    'Invalid Issued from value -> {{VALUE}}. It must be one of the : ' +
                    issued_from_values?.join(', '),
            },
        },
        process_type: {
            type: String,
            uppercase: true,
            enum: {
                values: issued_from_values,
                message:
                    'Invalid Issued from value -> {{VALUE}}. It must be one of the : ' +
                    issued_from_values?.join(', '),
            },
        },
        raw_material_items: [
            {
                type: mongoose.Schema.Types.ObjectId,
                required: [true, 'Raw material items are required'],
            },
        ],
        total_sheets: {
            type: Number,
            required: [true, 'Total sheets is required.'],
        },
        total_sqm: {
            type: Number,
            required: [true, 'Total sqm is required.'],
        },
        base_amount: {
            type: Number,
            required: [true, 'Base amount is required.'],
        },
        igst: {
            type: Number,
            // required: [true, 'IGST is required.'],
            default: 0
        },
        cgst: {
            type: Number,
            // required: [true, 'CGST is required.'],
            default: 0
        },
        sgst: {
            type: Number,
            // required: [true, 'SGST is required.'],
            default: 0
        },
        gst_amount: {
            type: Number,
            required: [true, 'GST amount is required.'],
        },
        total_amount_with_gst: {
            type: Number,
            required: [true, 'total amount is required.'],
        },
        grand_total: {
            type: Number,
            required: [true, 'Grand total is required.'],
        },
        inward_challan_status: {
            type: String,
            default: challan_status?.not_received,
            enum: {
                values: [challan_status?.not_received, challan_status?.received],
                message: `Invalid Status -> {{VALUE}} it must be one of the ${(challan_status?.not_received, challan_status?.received)}`
            }
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Created By is required.'],
        },
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Updated By is required.'],
        },
    },
    { timestamps: true }
);

const indexed_fields = [
    [{ irn_number: 1 }],
    [{ acknowledgement_number: 1 }],
    [{ eway_bill_no: 1 }],
    [{ challan_no: 1 }],
    [{ transport_document_no: 1 }],
    [{ raw_material: 1 }],
];

indexed_fields.forEach((index) => cnc_done_schema.index(...index));
const challan_done_model = mongoose.model(
    'challan_done_details',
    cnc_done_schema,
    'challan_done_details'
);

export default challan_done_model;
