import mongoose from "mongoose";

const GroupImagesSchema = new mongoose.Schema({
  group_no: {
    type: Number,
    unique: true,
    required: true,
  },
  group_images: {
    type: Array,
    default: [],
  },
  smoke_images: {
    type: Array,
    default: [],
  },
  dying_images: {
    type: Array,
    default: [],
  },
  cutting_images: {
    type: Array,
    default: [],
  },
  tapping_images: {
    type: Array,
    default: [],
  },
  finishing_images: {
    type: Array,
    default: [],
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const GroupImagesModel = mongoose.model("group_images", GroupImagesSchema);
export default GroupImagesModel;
