import mongoose from "mongoose";


const cnc_damage_schema = new mongoose.Schema({
    sr_no: Number,
    cnc_done_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "CNC Done ID is required."]
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

cnc_damage_schema.index({ cnc_done_id: 1 })
cnc_damage_schema.index({ sr_no: 1 })

const cnc_damage_model = mongoose.model('cnc_damage_details', cnc_damage_schema, 'cnc_damage_details');

export default cnc_damage_model;