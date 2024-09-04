import mongoose from "mongoose";

const RawImagesSchema = new mongoose.Schema({
  item_details: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "raw_material",
    required: [true, "Item ID is required"],
  },
  smoke_images: {
    type: Array,
    default: [],
  },
  dying_images: {
    type: Array,
    default: [],
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const RawImagesModel = mongoose.model("raw_images", RawImagesSchema);
export default RawImagesModel;
