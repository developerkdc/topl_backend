import mongoose from "mongoose";

const cuttingSchema = new mongoose.Schema(
  {
    sr_no: Number,
    crosscut_date: {
      type: Date,
      required: [true, "flicthing date is required"],
    },
    workers: {
      type: Number,
      required: [true, "workers are required"],
    },
    shift: {
      type: String,
      required: [true, "shift is required"],
    },
    working_hours: {
      type: Number,
      required: [true, "working hours are required"],
    },
    machine_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "machine id is required"],
    },
    machine_name: {
      type: String,
      required: [true, "machine name is required"],
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "item id is required"],
    },
    item_name: {
      type: String,
      required: [true, "item name is required"],
    },
    log_no: {
      type: String,
      required: [true, "log number is required"],
    },
    code: {
      type: String,
      required: [true, "code is required"],
    },
    length: {
      type: Number,
      required: [true, "length is required"],
    },
    girth: {
      type: Number,
      required: [true, "girth is required"],
    },
    crosscut_cmt: {
      type: Number,
      required: [true, "crosscut cmt is required"],
    },
    cost_amount: {
      type: Number,
      required: [true, "cost_amount is required"],
    },
    per_cmt_cost: {
      type: Number,
      required: [true, "per_cmt_cost is required"],
    },
    remarks: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "created by is required"],
    },
    deleted_at: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const crossCuttingModel =
  mongoose.models.cross_cuttings ||
  mongoose.model("cross_cutting", cuttingSchema);

const crossCuttings_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const crossCuttings_view_modal = mongoose.model(
  "cross_cuttings",
  crossCuttings_view_schema
);

(async function () {
  await crossCuttings_view_modal.createCollection({
    viewOn: "cross_cuttings",
    pipeline: [
      {
        $sort: {
          updatedAt: 1,
          _id: 1,
        },
      },
      {
        $lookup: {
          from: "machines",
          localField: "machine_id",
          foreignField: "_id",
          as: "machineDetails",
        },
      },

      {
        $lookup: {
          from: "item_names",
          localField: "item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $unwind: {
          path: "$machineDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$itemDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "created_by",
          foreignField: "_id",
          as: "created_user",
        },
      },
      {
        $unwind: {
          path: "$created_user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ],
  });
})();
