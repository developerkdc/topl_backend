import mongoose from "mongoose";

const issue_for_tapping_wastage_schema = new mongoose.Schema({
    issue_for_tapping_item_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'issue for tapping id is required'],
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
    height: {
        type: Number,
        default: 0,
        required: [true, 'Height is required'],
    },
    thickness: {
        type: Number,
        default: 0,
        required: [true, 'Thickness is required'],
    },
    no_of_leaves: {
        type: Number,
        default: 0,
        required: [true, 'No of leaves is required'],
    },
    sqm: {
        type: Number,
        default: 0,
        required: [true, 'SQM is required'],
    },
    amount: {
        type: Number,
        default: 0,
        required: [true, 'Item Amount is required'],
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

issue_for_tapping_wastage_schema.index({ issue_for_tapping_item_id: -1 }, { unique: true })

const issue_for_tapping_wastage_model = mongoose.model("issue_for_tappings_wastage", issue_for_tapping_wastage_schema, "issue_for_tappings_wastage");
export default issue_for_tapping_wastage_model;