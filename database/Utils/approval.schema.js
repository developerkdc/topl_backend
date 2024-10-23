import mongoose from "mongoose";

const approvalSchema = new mongoose.Schema({
    approvalPerson: {
        type: mongoose.Types.ObjectId,
        required: [true, "approval person is required"]
    },
    approvalBy: {
        user: {
            type: mongoose.Types.ObjectId,
            default:null,
        },
        remark: {
            type: String,
            default: null
        }
    },
    rejectedBy: {
        user: {
            type: mongoose.Types.ObjectId,
            default:null,
        },
        remark: {
            type: String,
            default: null
        }
    }
});

export default approvalSchema