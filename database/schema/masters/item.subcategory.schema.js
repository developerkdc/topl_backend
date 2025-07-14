import mongoose from 'mongoose';
import { sub_category } from '../../Utils/constants/constants.js';

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
    type: {
      type: String,
      enum: {
        values: [sub_category.natural, sub_category.hybrid],
        message: `Sub-category type {{VALUE}}, must be one of ${[sub_category.natural, sub_category.hybrid].join(",")}`
      },
      required: [true, 'Subcategory type is required'],
      trim: true,
      uppercase: true,
      default: sub_category.natural
    },
    category: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'item_subcategory',
      default: null,
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
