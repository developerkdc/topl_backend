import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

const alternateItemNameObjectSchema = {
  process_name: {
    type: String,
    uppercase: true,
    trim: true,
    // unique: [true, 'Process Name already exists.'],
    required: [true, 'Process Name is required.'],
  },
  alternate_item_name: {
    type: String,
    uppercase: true,
    trim: true,
    required: [true, 'Alternate Item Name is required.'],
  },
};

const ItemNameSchema = new mongoose.Schema(
  {
    sr_no: Number,
    item_name: {
      type: String,
      required: [true, 'Item Name is required.'],
      trim: true,
      unique: [true, 'Item Name already exists.'],
      uppercase: true,
    },
    item_name_code: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    color: {
      color_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      color_name: {
        type: String,
        default: null,
      },
    },
    category: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'item_category',
      required: [true, 'category id is required'],
    },
    item_subcategory: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'item_subcategory',
      required: [true, 'subcategory id is required'],
    },
    alternate_item_name_details: {
      type: [alternateItemNameObjectSchema],
      default: null,
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const ItemNameModel = mongoose.model('item_name', ItemNameSchema);
// LogSchemaFunction("itemName", ItemNameModel, []);

export default ItemNameModel;
