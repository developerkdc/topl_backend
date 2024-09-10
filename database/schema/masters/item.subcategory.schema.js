import mongoose from "mongoose";


const itemSubCategorySchema = new mongoose.Schema({
    sr_no: {
        type: Number,
        default: null
    },
    name: {
        type: String,
        required: [true, "subcategory name is required"]
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    }
}, { timestamps: true });

const itemSubCategoryModel = mongoose.models.item_subcategories || mongoose.model('item_subcategory', itemSubCategorySchema);

export default itemSubCategoryModel