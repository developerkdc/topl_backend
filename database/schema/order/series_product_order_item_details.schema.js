import mongoose from "mongoose";

const series_product_order_item_details_schema = new mongoose.Schema({
    sr_no: {
        type: Number,
        required: [true, 'Sr no is required']
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'orders',
        required: [true, 'Order Id is required'],
    },
    dispatch_schedule: {
        type: String,
        trim: true,
        uppercase: true,
        required: [true, 'Dispatch Schedule is required']
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Product Id is required']
    },
    product_code: {
        type: String,
        trim: true,
        uppercase: true,
        required: [true, 'Code is required']
    },
    photo_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Photo Id is required']
    },
    photo_no: {
        type: String,
        trim: true,
        uppercase: true,
        required: [true, 'Photo No is required']
    },
    base_size: {
        type: String,
        trim: true,
        uppercase: true,
        required: [true, 'Base Size is required']
    },
    base_length: {
        type: Number,
        required: [true, 'Base Length is required']
    },
    base_width: {
        type: Number,
        required: [true, 'Base Width is required']
    },
    no_of_hours: {
        type: Number,
        default: null
    },
    required_sheet: {
        type: Number,
        required: [true, 'Required sheet is required']
    },
    sqm: {
        type: Number,
        required: [true, 'SQM is required']
    },
    sq_feet: {
        type: Number,
        required: [true, 'SQF is required']
    },
    previous_rate: {
        type: Number,
        default: null
    },
    rate_per_sq_feet: {
        type: Number,
        required: [true, 'Rate per SQF is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required']
    },
    sub_category_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    sub_category_name: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
    },
    base_sub_category_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    base_sub_category_name: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    item_name: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
    },
    pressing_instruction: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
    },
    base_type: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
    },
    base_required_sheet: {
        type: Number,
        default: null
    },
    flow_process: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
    },
    remark: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Created By Id is required'],
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Updated By Id is required'],
    },
}, {
    timestamps: true,
})