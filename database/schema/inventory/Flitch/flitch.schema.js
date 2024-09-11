import mongoose from 'mongoose';
import invoice_details from '../../../Utils/invoiceDetails.schema';

const item_details_schema = new mongoose.Schema({
    supplier_item_name: {
        type: String,
        default: null
    },
    supplier_flitch_no: {
        type: String,
        default: null
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Items id is required"]
    },
    item_sr_no:{
        type:Number,
        unique:true,
        required:[true,"Invoice Sr No is required"],
    },
    item_name: {
        type: String,
        required: [true, "Item Name is required"]
    },
    log_no: {
        type: String,
        required: [true, "Log No is required"]
    },
    flitch_code: {
        type: String,
        required: [true, "Flitch Code is required"]
    },
    flitch_formula: {
        formula_type: {
            type: {
                enum: {
                    values: ["TQF", "FHF", "BF"],
                    message: "Invalid formula type"
                },
                required: [true, "Formula type is required"]
            }
        },
        formula: {
            type: String,
            required: [true, "Flitch formula is required"]
        }
    },
    length: {
        type: Number,
        required: [true, "Length is required"]
    },
    width1: {
        type: Number,
        required: [true, "width1 is required"]
    },
    width2: {
        type: Number,
        required: [true, "width2 is required"]
    },
    width3: {
        type: Number,
        required: [true, "width3 is required"]
    },
    height: {
        type: Number,
        required: [true, "height is required"]
    },
    flitch_cmt: {
        type: Number,
        required: [true, "Flitch Cmt is required"]
    },
    rate_in_currency: {
        type: Number,
        required: [true, "Rate in currency is required"]
    },
    rate_in_inr: {
        type: Number,
        required: [true, "Rate in currency is required"]
    },
    amount: {
        type: Number,
        required: [true, "Rate in Inr is required"]
    },
    remark: {
        type: String,
        default: null
    },
    invoice_id:{
        type: mongoose.Schema.Types.ObjectId,
        required:[true,"Invioce Id is required"],
    }
})

const flitch_invoice_schema = new mongoose.Schema({
    inward_sr_no:{
        type:Number,
        unique:true,
        required:[true,"Invoice Sr No is required"],
    },
    inward_date: {
        type: Date,
        default: Date.now,
        required: [true, "Inwrad Date is required"]
    },
    currency: {
        type: String,
        required: [true, "Currency is required"]
    },
    workers_details: {
        no_of_workers: {
            type: Number,
            required: [true, "No of worker is required"]
        },
        shift: {
            type: String,
            required: [true, "Shift is required"]
        },
        working_hours: {
            type: Number,
            required: [true, "Working hours is required"]
        }
    },
    supplier_details: {
        company_details: {
            supplier_company_id: {
                type: mongoose.Schema.Types.ObjectId,
                required: [true, "company id is required"]
            },
            supplier_name: {
                type: String,
                required: [true, "Supplier Name is required."],
                trim: true,
            },
            supplier_type: {
                type: String,
                required: [true, "Supplier Name is required."],
                trim: true,
            },
        },
        branch_detail: {
            branch_id: {
                type: mongoose.Schema.Types.ObjectId,
                required: [true, "company id is required"]
            },
            branch_name: {
                type: String,
                required: [true, "branch name is reqiured"]
            },
            contact_person: {
                type: [{
                    name: {
                        type: String,
                        required: [true, "contact person name is required"],
                        unique: [true, "contact person name is required"],
                        trim: true
                    },
                    email: {
                        type: String,
                        required: [true, "email id is required"],
                        trim: true
                    },
                    mobile_number: {
                        type: String,
                        required: [true, "mobile number is required"]
                    },
                    designation: {
                        type: String,
                        required: [true, "designation is required"]
                    }
                }],
                required: [true, "at least one contact person is required"]
            },
            address: {
                type: String,
                required: [true, "address is required"]
            },
            state: {
                type: String,
                required: [true, "state is required"]
            },
            country: {
                type: String,
                required: [true, "country is required"]
            },
            city: {
                type: String,
                required: [true, "city is required"]
            },
            pincode: {
                type: String,
                required: [true, "pincode is required"]
            },
            gst_number: {
                type: String,
                required: [true, "gst number is required"]
            },
            web_url: {
                type: String,
                required: [true, "web url is required"]
            },
        }
    },
    invoice_Details:invoice_details
},{
    timestamps:true
})

export const flitch_inventory_items_details = mongoose.model("flitch_inventory_items_details",item_details_schema)
export const flitch_inventory_invoice_details = mongoose.model("flitch_inventory_invoice_details",flitch_invoice_schema)