import mongoose from "mongoose";
import { issues_for_status } from "../../../Utils/constants/constants.js";

const validate_dressing_required_field = function(){
    return this.dressing_done_id || this.issued_from === issues_for_status.dressing
}

const issues_for_smoking_dying_schema = new mongoose.Schema({
    veneer_inventory_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        required: [function () {
            return this.issued_from === issues_for_status.veneer
        }, "Veneer inventory id is required"]
    },
    dressing_done_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        required: [function () {
            return this.issued_from === issues_for_status.dressing
        }, "Dressing done id is required"]
    },
    item_name: {
        type: String,
        required: [true, 'Item Name is required'],
    },
    item_name_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Item Name ID is required'],
    },
    log_no_code: {
        type: String,
        required: [true, 'Log No Code is required'],
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
    bundle_number: {
        type: Number,
        required: [true, 'bundle number is required'],
    },
    pallet_number: {
        type: String,
        trim: true,
        uppercase: true,
        required: [true, 'pallet_number is required'],
    },
    color_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    color_name: {
        type: String,
        default: null,
    },
    character_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [validate_dressing_required_field, 'Charcter ID is required'],
    },
    character_name: {
        type: String,
        required: [validate_dressing_required_field, 'Charcter Name is required'],
    },
    pattern_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [validate_dressing_required_field, 'Pattern ID is required'],
    },
    pattern_name: {
        type: String,
        required: [validate_dressing_required_field, 'Pattern Name is required'],
    },
    series_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Series ID is required'],
    },
    series_name: {
        type: String,
        required: [true, 'Series Name is required'],
    },
    grade_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Grade ID is required'],
    },
    grade_name: {
        type: String,
        required: [true, 'Grade Name is required'],
    },
    amount: {
        type: Number,
        default: 0,
        required: [true, 'Item Amount is required'],
    },
    amount_factor: {
        type: Number,
        default: 1,
    },
    expense_amount: {
        type: Number,
        default: 0,
    },
    issued_from: {
        type: String,
        enum: {
            values: [issues_for_status?.veneer, issues_for_status?.dressing],
            message: `Invalid issued from type {{VALUE}} it should be one of the ${issues_for_status?.veneer}, ${issues_for_status?.dressing} `,
        },
        required: [true, 'Issued from is required'],
    },
    is_smoking_dying_done: {
        type: Boolean,
        default: false,
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
        required: [true, 'Created By is required'],
        trim: true,
    },
}, {
    timestamps: true,
})

issues_for_smoking_dying_schema.index({ item_name: -1 });
issues_for_smoking_dying_schema.index({ bundle_number: -1 });
issues_for_smoking_dying_schema.index({ pallet_number: -1 });
issues_for_smoking_dying_schema.index({ pallet_number: -1, bundle_number: -1 }, { unique: true });

export const issues_for_smoking_dying_model = mongoose.model("issues_for_smoking_dyings", issues_for_smoking_dying_schema, "issues_for_smoking_dyings")
