import mongoose from "mongoose";
import { item_issued_from } from "../../../Utils/constants/constants.js";

const issued_from_values = Object.values(item_issued_from)
const issue_for_order_schema = new mongoose.Schema({
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    order_item_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Order Item ID is required."]
    },
    issued_from: {
        type: String,
        required: [true, "Issued from is required"],
        enum: {
            values: issued_from_values,
            message: 'Invalid Issued from value -> {{VALUE}}. It must be one of the : ' + issued_from_values?.join(", ")
        }
    },
    item_details: {
        type: {},
        required: [true, "Item Details are required"]
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Created By is required"]
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Updated By is required"]
    }
}, { timestamps: true });

const issue_for_order_model = mongoose?.models.issue_for_order_model || mongoose.model('issued_for_order_items', issue_for_order_schema, 'issued_for_order_items');

export default issue_for_order_model