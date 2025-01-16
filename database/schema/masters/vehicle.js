import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
    vehicle_number: {
        type: String,
        uppercase:true,
        trim:true,
        required:[true,"Vehicle No is required"]
    },
    status:{
        type:Boolean,
        default:true
    },
    created_by:{
        type:mongoose.Schema.Types.ObjectId,
        required:[true,"created by is required"]
    },
    updated_by:{
        type:mongoose.Schema.Types.ObjectId,
        required:[true,"updated by is required"]
    }
},{
    timestamps:true
});

vehicleSchema.index({vehicle_number:1},{unique:true});

const vehicleModel = mongoose.model("vehicles",vehicleSchema);
export default vehicleModel