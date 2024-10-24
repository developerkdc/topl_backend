import mongoose from "mongoose";

const approvalSchema = new mongoose.Schema({
    approval: {
        editedBy: {
            type: mongoose.Types.ObjectId,
            required: [true, "Edited by Person is required"]
        },
        approvalPerson: {
            type: mongoose.Types.ObjectId,
            required: [true, "Approval person is required"]
        },
        approvalBy: {
            user: {
                type: mongoose.Types.ObjectId,
                default: null,
            },
            remark: {
                type: String,
                default: null
            }
        },
        rejectedBy: {
            user: {
                type: mongoose.Types.ObjectId,
                default: null,
            },
            remark: {
                type: String,
                default: null
            }
        }
    }
});

export default approvalSchema