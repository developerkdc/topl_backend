import mongoose from "mongoose";

const seriesSchema = new mongoose.Schema(
  {
    sr_no: Number,
    series_name: {
      type: String,
      required: [true, "Series name is required"],
      unique: [true, "Series Name already exist."],
      trim: true,
      uppercase: true
    },
    remark: {
      type: String,
      trim: true,
      uppercase: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      re: "user",
      default: null,
    },
  },
  { timestamps: true }
);

const seriesModel =
  mongoose.models.series_master ||
  mongoose.model("series_master", seriesSchema);
export default seriesModel;
