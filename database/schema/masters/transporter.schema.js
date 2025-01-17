import mongoose from "mongoose";

export const transporter_type = {
    part_load: "PART_LOAD",
    full_load: "FULL_LOAD",
    both: "BOTH"
}

const transporterSchema = new mongoose.Schema({
    name: {
        type: String,
        uppercase: true,
        trim: true,
        required: [true, "Transporter name is required"]
    },
    branch: {
        type: String,
        uppercase: true,
        trim: true,
        default: null
    },
    transport_id: {
        type: String,
        uppercase: true,
        trim: true,
        default: null
    },
    type: {
        type: String,
        enum: {
            values: [transporter_type.part_load, transporter_type.full_load, transporter_type.both],
            message: `Invalid type {{VALUE}}, type must either be one of ${[transporter_type.part_load, transporter_type.full_load, transporter_type.both].join(",")}`
        },
        uppercase: true,
        required: [true, "Transporter type is required"]
    },
    status:{
        type:Boolean,
        default:true
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

transporterSchema.index({ name: 1 }, { unique: true });

const transporterModel = mongoose.model("transporters", transporterSchema, "transporters");
export default transporterModel;