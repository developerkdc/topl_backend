import mongoose from 'mongoose';

const itemSubCategorySchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      default: null,
    },
    remark: {
      type: String,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Subcategory name is required'],
      unique: [true, 'Subcategory Name already exist.'],
      trim: true,
      uppercase: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

const itemSubCategoryModel =
  mongoose.models.item_subcategories ||
  mongoose.model('item_subcategory', itemSubCategorySchema);

export default itemSubCategoryModel;
