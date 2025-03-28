import mongoose from 'mongoose';
import { item_issued_from } from '../../../../Utils/constants/constants.js';

const issue_for_cnc_schema = new mongoose.Schema(
    {
        sr_no:Number,

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
issue_for_cnc_schema.index({sr_no : 1 },{ unique : true})

const issue_for_cnc_model = mongoose.model('issued_for_cnc_items', issue_for_cnc_schema, 'issued_for_cnc_items');
export default issue_for_cnc_model