import mongoose from "mongoose";
import { order_category } from "../../../Utils/constants/constants.js";

const validate_order_category = () => {
    return this.order_category !== order_category?.raw ? true : false;
}
const packing_done_other_details_schema = new mongoose.Schema({
    packing_id: {
        type: String,
        required: [true, "Packing ID is required."],
        trim: true,
        uppercase: true
    },
    packing_date: {
        type: Date,
        required: [true, "Packing date is required."],
        default: Date.now
    },
    customer_name: {
        type: String,
        required: [true, "Customer name is required."],
        trim: true,
        uppercase: true
    },
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Customer ID is required."],
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
    product_type: {
        type: String,
        required: [true, 'Product Type is required'],
        trim: true,
    },
    isEditable: {
        type: Boolean,
        default: true,
    },
    is_dispatch_done: {
        type: Boolean,
        default: false,
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Created by is required."],
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Updated by is required."],
    },
}, {
    timestamps: true,
});

const packing_done_items_schema = new mongoose.Schema({
    packing_done_other_details_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Packing done other details ID is required."],
    },
    issue_for_packing_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Issue for packing ID is required."],
    },
    pressing_id: {
        type: String,
        // required: [validate_order_category, "Pressing ID is required."],
        default: null,
        trim: true,
        uppercase: true
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Order ID is required.']
    },
    order_item_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Order Item ID is required.']
    },
    order_number: {
        type: Number,
        required: [true, 'Order Number is required.'],
    },
    order_item_no: {
        type: Number,
        required: [true, 'Order Item Number is required.'],
    },
    group_no: {
        type: String,
        // required: [true, 'Group Number is required.'],
        default: null,
        trim: true,
        uppercase: true
    },
    group_no_id: {
        type: mongoose.Schema.Types.ObjectId,
        // required: [true, 'Group Number ID is required.'],
        default: null,
    },
    log_no: {
        type: String,
        // required: [true, 'Log Number is required.'],
        default: null,
        trim: true,
        uppercase: true
    },
    item_name: {
        type: String,
        default: null,
        trim: true,
        uppercase: true
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    item_sub_category_name: {
        type: String,
        default: null,
        trim: true,
        uppercase: true
    },
    item_sub_category_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    length: {
        type: Number,
        default: null
    },
    new_length: {
        type: Number,
        default: null
    },
    width: {
        type: Number,
        default: null
    },
    diameter: {
        type: Number,
        default: null
    },
    new_width: {
        type: Number,
        default: null
    },
    thickness: {
        type: Number,
        // required: [true, 'Thickness is required.'],
        default: null
    },
    no_of_sheets: {
        type: Number,
        // required: [true, 'Issued Sheets are required.'],
        default: null
    },
    no_of_leaves: {
        type: Number,
        default: null
    },
    girth: {
        type: Number,
        default: null
    },
    cmt: {
        type: Number,
        default: null
    },
    quantity: {
        type: Number,
        // required: [true, 'Issued Quantity is required.'],
        default: null
    },
    number_of_rolls: {
        type: Number,
        default: null
    },
    sqm: {
        type: Number,
        default: null,
    },
    cbm: {
        type: Number,
        default: null,
    },
    new_sqm: {
        type: Number,
        default: null
    },
    amount: {
        type: Number,
        required: [true, 'Issued Amount is required.'],
    },
    product_type: {
        type: String,
        required: [true, 'Product Type is required'],
        trim: true,
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Created by is required."],
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Updated by is required."],
    }

}, {
    timestamps: true,
});

export const packing_done_other_details_model = mongoose.model(
    'packing_done_other_details',
    packing_done_other_details_schema, 'packing_done_other_details'
);
export const packing_done_items_model = mongoose.model(
    'packing_done_items',
    packing_done_items_schema, 'packing_done_items'
);