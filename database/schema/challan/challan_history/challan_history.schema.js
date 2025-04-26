import mongoose from "mongoose";

const challan_history_schema = new mongoose.Schema({
    issued_for: {
        type: String,
        required: [true, "Issued for is required."],
        //add enum 
    },
    challan_done_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Challan done ID is required."]
    },
    issued_for_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Issued for ID is required."]
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Created By is required."]
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Updated By is required."]
    },
}, { timestamps: true });

const challan_history_model = mongoose.model('challan_history_details', challan_history_schema, 'challan_history_details');

export default challan_history_model;