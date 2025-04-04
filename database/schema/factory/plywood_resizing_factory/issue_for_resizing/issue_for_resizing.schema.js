import mongoose from 'mongoose';
import { item_issued_from } from '../../../../Utils/constants/constants.js';

const issue_for_resize_schema = new mongoose.Schema(
    {
        item_sr_no: {
            type: Number,
            required: [true, 'Item Sr. No is required'],
        },
        plywood_item_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Plywood Item ID is required'],
        },
        item_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Items id is required'],
        },
        item_name: {
            type: String,
            required: [true, 'Item Name is required'],
            trim: true,
            uppercase: true,
        },
        color: {
            color_id: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            color_name: {
                type: String,
                default: null,
            },
        },
        item_sub_category_name: {
            type: String,
            required: [true, 'item_sub_category_name is required'],
            trim: true,
            uppercase: true,
        },
        item_sub_category_id: {
            type: String,
            required: [true, 'item_sub_category_id is required'],
        },
        plywood_type: {
            type: String,
            required: [true, 'Plywood type is required'],
            trim: true,
            uppercase: true,
        },
        pallet_number: {
            type: Number,
            required: [true, 'pallet_number is required'],
        },
        length: {
            type: Number,
            required: [true, 'Length is required'],
        },
        width: {
            type: Number,
            required: [true, 'width is required'],
        },
        thickness: {
            type: Number,
            required: [true, 'thickness is required'],
        },
        no_of_sheets: {
            type: Number,
        },
        sqm: {
            type: Number,
            required: [true, 'total square meter is required'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
        },
        amount_factor: {
            type: Number,
            default: 0,
        },
        expense_amount: {
            type: Number,
            default: 0,
        },
        invoice_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        issued_from: {
            type: String,
            enum: {
                values: [item_issued_from?.plywood],
                message: `Invalid value -> {{VALUE}} it must be one of the ${item_issued_from?.plywood}`
            },
            required: [true, "Issued from is required."]
        },
        is_resizing_done: {
            type: Boolean,
            default: false
        },
        remark: {
            type: String,
            default: null,
        },

        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Created By is required'],
        },
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Updated By is required'],
        },
    },
    { timestamps: true }
);

issue_for_resize_schema.index({ plywood_item_id: 1})
issue_for_resize_schema.index({ item_sr_no: 1 });

const issue_for_plywood_resizing_model = mongoose.model('issued_for_plywood_resizing_items', issue_for_resize_schema, 'issued_for_plywood_resizing_items');
export default issue_for_plywood_resizing_model