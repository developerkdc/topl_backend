import mongoose from "mongoose";


const cnc_damage_schema = new mongoose.Schema({
    issue_for_resizing_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Issue for resizing ID is required."]
    },
    no_of_sheets: {
        type: Number,
        required: [true, "No. of Sheets is required."]
    },
    sqm: {
        type: Number,
        required: [true, "SQM is required."]
    },
    remark: {
        type: String,
        default: null
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Created By is required."]
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Updated By is required."]
    }

}, { timestamps: true });

cnc_damage_schema.index({ issue_for_resizing_id: 1 }, { unique: true })

const cnc_damage_model = mongoose.model('cnc_damage_details', cnc_damage_schema, 'cnc_damage_details');

export default cnc_damage_model;