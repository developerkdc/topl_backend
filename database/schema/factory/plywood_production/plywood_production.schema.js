import mongoose from 'mongoose';

const plywood_production_schema=new mongoose.Schema({
    iscompleted:{
        type:Boolean,
    },
    item_name:{
        type:String,
        required:[true,'Item Name is required'],
    },
    sub_category:{
        type:String,
        required:[true,'Sub Category is required'],
    },
    new_length:{
        type:Number,
        required:[true,'New Lenght is required']
    },
    new_width:{
        type:Number,
        required:[true,'New Width is required']
    },
    new_thickness:{
        type:Number,
        required:[true,"New Thickness is required"],
    },
    no_of_sheets:{
        type:Number,
        required:[true,"Number of Sheets are required"]
    },
    total_sqm:{
        type:Number,
        required:[true,'Total SQM is required']
    },
    face_details:{
        type:Object,
        required:[true,"Face Details is required"]
    },
    core_details:{
        type:Object,
        required:[true,'Core Details is required']
    },
    remarks: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    created_by:{
        type:mongoose.Schema.Types.ObjectId
    },
    
},
{timestamps:true}
);


const plywood_production_model=mongoose.model('plywood_production_detail',plywood_production_schema);