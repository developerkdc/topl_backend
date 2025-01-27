import mongoose from 'mongoose';
import LogSchemaFunction from '../LogsSchema/logs.schema.js';

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
    color: {
      color_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'color id is required'],
      },
      color_name: {
        type: String,
        required: [true, 'color name is required'],
      },
    },
    category: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'item_category',
      required: [true, 'category id is required'],
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
