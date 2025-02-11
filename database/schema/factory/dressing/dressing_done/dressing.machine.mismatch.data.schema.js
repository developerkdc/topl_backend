import mongoose from "mongoose";

const dressing_miss_match_data_schema = new mongoose.Schema({
    dressing_date: {
        type: Date,
    },
    log_no_code: {
        type: String,
        required: [true, "Log No Code is required."]
    },
    item_name: {
        type: String,
        required: [true, "Item Name is required."],
        uppercase: true,
        trim: true
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Item ID is required."]
    },
    length: {
        type: Number,
        required: [true, "Length is required. "]
    },
    width: {
        type: Number,
        required: [true, "Width is required"]
    },
    thickness: {
        type: Number,
        required: [true, "Thickness is required."]
    },
    no_of_leaves: {
        type: Number,
        required: [true, "No of Leaves is required."]
    },
    sqm: {
        type: Number,
        required: [true, "SQM is required"]
    },
    bundle_number: {
        type: Number,
        required: [true, "Bundle Number is required"]
    },
    pallet_number: {
        type: Number,
        required: [true, "Pallet Number is required."]
    },
    process_status: {
        type: String,
        default: ""
    }

})