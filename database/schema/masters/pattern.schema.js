import mongoose from "mongoose";

const patternSchema = new mongoose.Schema({
    name: {
        type: String,
        uppercase:true,
        trim:true,
        required:[true,"Pattern Name is required"]
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

patternSchema.index({name:1},{unique:true});

const patternModel = mongoose.model("patterns",patternSchema);
export default patternModel