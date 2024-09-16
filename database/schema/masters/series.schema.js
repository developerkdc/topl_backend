import mongoose from "mongoose";

const seriesSchema = new mongoose.Schema(
  {
    sr_no: Number,
    series_name: {
      type: String,
      required: [true, "series name is required"],
    },
    remark: {
      type: String,
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
