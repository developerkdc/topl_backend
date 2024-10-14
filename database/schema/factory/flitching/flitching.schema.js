import mongoose from "mongoose";

const flitchingSchema = new mongoose.Schema(
  {
    // sr_no: Number,

    machine_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "machine id is required"],
    },
    machine_name: {
      type: String,
      required: [true, "machine name is required"],
    },
    // item_id: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   required: [true, "item id is required"],
    // },
    // item_name: {
    //   type: String,
    //   required: [true, "item name is required"],
    // },
    log_no: {
      type: String,
      required: [true, "log number is required"],
    },
    flitch_code: {
      type: String,
      required: [true, "flitch code is required"],
    },
    length: {
      type: Number,
      required: [true, "length is required"],
    },
    width1: {
      type: Number,
      required: [true, "width1 is required"],
    },
    width2: {
      type: Number,
      required: [true, "width2 is required"],
    },
    width3: {
      type: Number,
      required: [true, "width3 is required"],
    },
    height: {
      type: Number,
      required: [true, "height is required"],
    },
    flitch_cmt: {
      type: Number,
      required: [true, "crosscut cmt is required"],
    },
    sqm_factor: {
      type: Number,
      required: [true, "sqm factor is required"]
    },
    wastage_info: {
      wastage_sqm: {
        type: Number,
        required: [true, "wastage sqm is required"]
      },
      wastage_length: {
        type: Number,
        required: [true, "wastage length is required "]
      }
    },
    worker_details: {
      flitching_date: {
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
    },
    per_cmt_cost: {
      type: Number,
      required: [true, "per_cmt_cost is required"],
    },
    cost_amount: {
      type: Number,
      required: [true, "cost_amount is required"],
    },
    required_hours: {
      type: Number,
      required: [true, "required hours is required"]
    },
    required_workers: {
      type: Number,
      required: [true, "required workers is required"]
    },
    flitching_completed: {
      type: Boolean,
      required: [true, "flitching completed status is required "],
      default: false
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

export const flitching_done_model =
  mongoose.models.flitchings || mongoose.model("flitching", flitchingSchema);

const flitching_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const flitching_view_modal = mongoose.model(
  "flitchings",
  flitching_view_schema
);

(async function () {
  await flitching_view_modal.createCollection({
    viewOn: "flitchings",
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
