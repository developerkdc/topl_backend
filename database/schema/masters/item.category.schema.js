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
    gst_percentage: {
      type: Number,
      default: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

// indexing
const indexingFields = [
  [{ sr_no: -1 }, { unique: true }],
  [{ category: 1 }],
  [{ product_hsn_code: 1 }],
  [{ gst_percentage: 1 }],
  [{ created_by: 1 }],
  [{ updatedAt: 1 }],
];

// indexingFields.forEach((index) => pressing_done_details_schema.index(...index));
indexingFields.forEach((index) => {
  if (index.length === 2) {
    itemCategorySchema.index(index[0], index[1]); // fields, options
  } else {
    itemCategorySchema.index(index[0]); // only fields
  }
});

const itemCategoryModel =
  mongoose.models.item_categories ||
  mongoose.model('item_category', itemCategorySchema);

export default itemCategoryModel;
