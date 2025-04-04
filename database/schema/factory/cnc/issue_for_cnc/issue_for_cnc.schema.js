import mongoose from 'mongoose';
import { item_issued_from } from '../../../../Utils/constants/constants.js';

const issue_for_cnc_schema = new mongoose.Schema(
    {
        sr_no: Number,
        pressing_details_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Pressing Details ID is required."]
        },
        issued_sheets: {
            type: Number,
            required: [true, "Issued Sheets are required."]
        },
        issued_sqm: {
            type: Number,
            required: [true, "Issued SQM is required."]
        },
        issued_amount: {
            type: Number,
            required: [true, "Issued Amount is required."]
        },
        is_cnc_done: {
            type: Boolean,
            default: false
        },
        issued_from: {
            type: String,
            enum: {
                values: [item_issued_from?.pressing_factory],
                message: `Invalid Type -> {{VALUE}} , it must be one of the ${item_issued_from?.pressing_factory}`
            },
            default: item_issued_from?.pressing_factory
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

// issue_for_resize_schema.index({ plywood_item_id: 1 }, { unique: true })
// issue_for_resize_schema.index({ item_sr_no: 1 });
issue_for_cnc_schema.index({ sr_no: 1 }, { unique: true })

const issue_for_cnc_model = mongoose.model('issued_for_cnc', issue_for_cnc_schema, 'issued_for_cnc');
export default issue_for_cnc_model