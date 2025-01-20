import mongoose from "mongoose";

const dispatchAddressSchema = new mongoose.Schema({
    address: {
        type: String,
        uppercase: true,
        trim: true,
        required: [true, "Address is required"]
    },
    country: {
        type: String,
        trim: true,
        required: [true, "country is required"]
    },
    state: {
        type: String,
        trim: true,
        required: [true, "state is required"]
    },
    city: {
        type: String,
        trim: true,
        required: [true, "city is required"]
    },
    pincode: {
        type: String,
        trim: true,
        required: [true, "pincode is required"]
    },
    gst_number: {
        type: String,
        trim: true,
        required: [true, "gst number is required"]
    },
    status: {
        type: Boolean,
        default: true
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "created by is required"]
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "updated by is required"]
    }
}, {
    timestamps: true
})

const dispatchAddressModel = mongoose.model("dispathAddresses", dispatchAddressSchema, "dispathAddresses")
export default dispatchAddressModel;