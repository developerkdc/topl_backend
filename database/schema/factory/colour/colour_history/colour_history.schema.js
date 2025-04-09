import mongoose from 'mongoose';
import { item_issued_from } from '../../../../Utils/constants/constants.js';


const color_history_schema = new mongoose.Schema(
    {
        sr_no: Number,
        color_item_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Plywood Item ID is required.'],
        },
        issued_for_order_id: {
            type: mongoose.Schema.Types.ObjectId,
            // required: [true, 'Issued for order ID is required.'],
            default: null
        },
        issue_status: {
            type: String,
            enum: {
                values: [item_issued_from?.pressing_factory, item_issued_from?.cnc_factory, item_issued_from?.color_factory, item_issued_from?.bunito_factory, item_issued_from?.polishing_factory],
                message: `Invalid Type -> {{VALUE}} , it must be one of the ${(item_issued_from?.pressing_factory, item_issued_from?.cnc_factory, item_issued_from?.color_factory, item_issued_from?.bunito_factory, item_issued_from?.polishing_factory)}`
            },
            default: issues_for_status?.order,
        },
        no_of_sheets: {
            type: Number,
            required: [true, 'Issued sheets are required.'],
        },
        sqm: {
            type: Number,
            required: [true, 'Issued SQM are required.'],
        },
        amount: {
            type: Number,
            required: [true, 'Issued Amount is required.'],
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

const indexed_fields = [[{ issue_status: 1 }], [{ sr_no: 1 }, { unique: true }], [{ color_item_id: 1 }]]
indexed_fields?.forEach((field) => color_history_schema.index(...field))
const color_history_model = mongoose.model(
    'color_history_details',
    color_history_schema,
    'color_history_details'
);

export default color_history_model;
