import mongoose from "mongoose";
import { order_category } from "../../Utils/constants/constants.js";

const dispatch_items_schema = new mongoose.Schema({
    packing_done_mongodb_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Packing Done Mongodb ID is required."],
    },
    packing_done_id: {
        type: String,
        required: [true, "Packing Done ID is required."],
    },
    dispatch_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Dispatch ID is required."],
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        required: [true, 'order_id is required'],
    },
    order_item_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        required: [true, 'order_item_id is required'],
    },
    invoice_no: {
        type: String,
        required: [true, 'Invoice number is required'],
        trim: true,
        uppercase: true,
    },
    order_no: {
        type: String,
        required: [true, 'Order number is required'],
        trim: true,
        uppercase: true,
    },
    order_item_no: {
        type: String,
        required: [true, 'Order item number is required'],
        trim: true,
        uppercase: true,
    },
    order_category: {
        type: String,
        enum: {
            values: [
                order_category?.raw,
                order_category?.decorative,
                order_category?.series_product,
            ],
            message: `Invalid type {{VALUE}} it must be one of the ${[
                order_category?.raw,
                order_category?.decorative,
                order_category?.series_product,
            ]?.join(', ')}`,
        },
        uppercase: true,
        required: [true, 'Order category is required'],
        trim: true,
    },
    product_category: {
        type: String,
        default: null,
        trim: true,
        uppercase: true,
    },
    length: {
        type: Number,
        default: 0,
        required: [true, 'Length is required'],
    },
    width: {
        type: Number,
        default: 0,
        required: [true, 'Width is required'],
    },
    no_of_sheets: {
        type: Number,
        default: 0,
        required: [true, 'No of leaves is required'],
    },
    sqm: {
        type: Number,
        default: 0,
        required: [true, 'SQM is required'],
    },
    rate: {
        type: Number,
        default: 0,
        required: [true, 'Rate is required'],
    },
    amount: {
        type: Number,
        default: 0,
        required: [true, 'Item Amount is required'],
    },
    discount_percentage: {
        type: Number,
        default: 0,
        required: [true, 'Item Amount is required'],
    },
    amount_with_discount: {
        type: Number,
        default: 0,
        required: [true, 'Item Amount with discount is required'],
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

const dispatchItemsModel = mongoose.model('dispatch_items', dispatch_items_schema, "dispatch_items");
export default dispatchItemsModel;