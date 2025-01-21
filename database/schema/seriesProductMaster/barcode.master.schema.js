import mongoose from "mongoose";

const barcodeSchema = new mongoose.Schema({
    code: {
        type: String,
        uppercase: true,
        trim: true,
        required: [true, "Color Name is required"]
    },
    base: {
        type: String,
        uppercase: true,
        trim: true,
        required: [true, "base is required"]
    },
    size: {
        type: [
            {
                length: {
                    type: Number,
                    required: [true, "length is required in size"],
                    trim: true
                },
                width: {
                    type: Number,
                    required: [true, "width is required in size"],
                    trim: true
                },
                time: {
                    type: Number,
                    required: [true, "time is required in size"],
                    trim: true
                },
            }


        ]
    },
    category: {
        type: String,
        required: [true, "venner category is required"],
        trim: true
    },
    // timing: {
    //     type: String,
    //     required: [true, "timing is required"],
    //     trim: true,
    //     uppercase: true
    // },
    instructions: {
        type: String,
        default: null,
        trim: true,
        uppercase: true
    },
    status: {
        type: Boolean,
        default: true
    },
    remark: {
        type: String,
        default: null,
        trim: true,
        uppercase: true
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
});

barcodeSchema.index({ code: 1 }, { unique: true });

const barcodeModel = mongoose.model("barcode", barcodeSchema);
export default barcodeModel