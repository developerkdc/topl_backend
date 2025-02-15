import mongoose from "mongoose";

const smoking_dying_done_history_schema = new mongoose.Schema({
    process_done_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Process Done ID is required."]
    },
    bundles: {
        type: [mongoose.Schema.Types.ObjectId],
        required: [true, "Bundles Array is required"]
    },
    status: {
        type: Boolean,
        default: true
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

const smoking_dying_done_history_model = mongoose.model('smoking_dying_done_history', smoking_dying_done_history_schema, "smoking_dying_done_history");

export default smoking_dying_done_history_model;