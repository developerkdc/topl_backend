import mongoose from "mongoose"

const departMentSchema = new mongoose.Schema({
    sr_no: Number,
    dept_name: {
        type: String,
        required: [true, "department name is required"]
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },
    deleted_at: {
        type: Date,
    }
}, { timestamps: true });

const departMentModel = mongoose.models.department || mongoose.model('department', departMentSchema);
export default departMentModel;