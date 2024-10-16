import mongoose from "mongoose"

const expensesSchema = new mongoose.Schema({
    expenseType:{
        type:String,
        required:[true,"expense type is required"]
    },
    expenseTypeId:{
        type:mongoose.Schema.Types.ObjectId,
        required:[true,"expense type Id is required"]
    },
    invoiceDate:{
        type:String,
        default:Date.now
    },
    invoiceNo:{
        type:String,
        default:null
    },
    serviceProviderName:{
        type:String,
        default:null
    },
    serviceProviderDetails:{
        type:{},
        default:null
    },
    amount:{
        type:Number,
        required:[true,"Amount is required"]
    },
})

export default expensesSchema