import mongoose from "mongoose";

export const approval_status = new mongoose.Schema({
    sendForApproval: {
        status: {
            type: Boolean,
            default: false
        },
        remark: {
            type: String,
            default: null
        }
    },
    approved: {
        status: {
            type: Boolean,
            default: false
        },
        remark: {
            type: String,
            default: null
        }
    },
    rejected: {
        status: {
            type: Boolean,
            default: false
        },
        remark: {
            type: String,
            default: null
        }
    },
})