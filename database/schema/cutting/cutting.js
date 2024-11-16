import mongoose from "mongoose";
import LogSchemaFunction from "../LogsSchema/logs.schema.js";

const CuttingSchema = new mongoose.Schema({
  issued_for_cutting_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "issued_for_cutting",
    required: true,
  },
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "group",
    required: true,
  },
  group_history_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "group_history",
    required: true,
  },

  item_details: [
    {
      item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "raw_material",
      },
      final_cutting_quantity: {
        type: Number,
        default: 0,
        min: 0,
      },
      // final_cutting_quantity: {
      //   natural: {
      //     type: Number,
      //     default: 0,
      //     min: 0,
      //   },
      //   dyed: {
      //     type: Number,
      //     default: 0,
      //     min: 0,
      //   },
      //   smoked: {
      //     type: Number,
      //     default: 0,
      //     min: 0,
      //   },
      //   total: {
      //     type: Number,
      //     default: 0,
      //     min: 0,
      //   },
      // },
      waste_cutting_quantity: {
        waste_pattas: {
          type: Number,
          default: 0,
        },
        length: {
          type: Number,
          default: 0,
        },
        width: {
          type: Number,
          default: 0,
        },
        waste_sqm: {
          type: Number,
          default: 0,
        },
        waste_sqm_percentage: {
          type: Number,
          default: 0,
        },
      },
      cutting_length: {
        type: Number,
        required: true,
      },
      cutting_width: {
        type: Number,
        required: true,
      },
      cutting_sqm: {
        type: Number,
        required: true,
      },
      cutting_no_of_pattas: {
        type: Number,
        required: true,
      },
    },
  ], //in this i want same schema like raw_material schema
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    trim: true,
  },
  cutting_remarks: {
    type: String,
    uppercase: true,
    trim: true
  },

  issued_for_cutting_date: { type: Date, default: Date.now },
  cutting_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: () => new Date().setUTCHours(0, 0, 0, 0) },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const CuttingModel = mongoose.model("cutting", CuttingSchema);
LogSchemaFunction("cutting", CuttingModel);
