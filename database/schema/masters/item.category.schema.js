import mongoose from 'mongoose';

const itemCategorySchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      unique: [true, 'Category Name already exist.'],
      trim: true,
      // uppercase: true,
    },
    calculate_unit: {
      type: String,
      required: [true, 'calculate unit is required'],
      trim: true,
      // uppercase: true,
    },
    product_hsn_code: {
      type: String,
      required: [true, 'hsn code is required'],
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

const itemCategoryModel =
  mongoose.models.item_categories ||
  mongoose.model('item_category', itemCategorySchema);

export default itemCategoryModel;
