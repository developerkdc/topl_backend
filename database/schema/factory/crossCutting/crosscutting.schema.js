import mongoose from "mongoose";

const crosscutting_done_schema = new mongoose.Schema(
  {
    issue_for_croscutting_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "issues_for_crosscutting",
      required: [true, "issue for croscutting id is required"],
    },
    log_inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "log_inventory_items_details",
      required: [true, "Log Inventory Items Id is required"],
    },
    machine_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "machine id is required"],
    },
    machine_name: {
      type: String,
      required: [true, "machine name is required"],
    },
    log_no: {
      type: String,
      required: [true, "log number is required"],
    },
    code: {
      type: String,
      trim: true,
      required: [true, "code is required"],
    },
    log_no_code: {
      type: String,
      trim: true,
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
    factor: {
      type: Number,
      required: [true, "factor is required"]
    },
    wastage_info: {
      wastage_sqm: {
        type: Number,
        required: [true, "wastage_sqm is required"]
      },
      wastage_length: {
        type: Number,
        required: [true, "wastage_length is required"]
      }
    },
    worker_details: {
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
    },
    required_hours: {
      type: Number,
      required: [true, "Required hours is required"]
    },
    required_workers: {
      type: Number,
      required: [true, "Required workers is required"]
    },
    remarks: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, "created by is required"],
    },
    deleted_at: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

crosscutting_done_schema.index({ issue_for_croscutting_id: -1 });
crosscutting_done_schema.index({ code: -1 });
crosscutting_done_schema.index(
  { issue_for_croscutting_id: -1, code: -1 },
  { unique: true }
);

export const crosscutting_done_model = mongoose.model(
  "crosscutting_done",
  crosscutting_done_schema
);

const crossCuttingsDone_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const crossCuttingsDone_view_modal = mongoose.model(
  "cross_cuttings_done_view",
  crossCuttingsDone_view_schema
);

(async function () {
  await crossCuttingsDone_view_modal.createCollection({
    viewOn: "crosscutting_dones",
    pipeline: [
      {
        $sort: {
          updatedAt: 1,
          _id: 1,
        },
      },
      {
        $lookup: {
          from: "issues_for_crosscuttings",
          localField: "issue_for_croscutting_id",
          foreignField: "_id",
          as: "issuedCrossCuttingDetails",
        },
      },

      // {
      //   $lookup: {
      //     from: "log_inventory_items_details",
      //     localField: "log_inventory_item_id",
      //     foreignField: "_id",
      //     as: "logInventoryItemDetails",
      //   },
      // },
      {
        $unwind: {
          path: "$issuedCrossCuttingDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //   $unwind: {
      //     path: "$logInventoryItemDetails",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
    ],
  });
})();
