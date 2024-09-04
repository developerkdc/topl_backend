import mongoose from "mongoose";
import LogSchemaFunction from "../../LogsSchema/logs.schema.js";

const GroupHistorySchema = new mongoose.Schema({
  group_id: {
    type: Object,
    required: true,
  },
  cutting_item_details: [
    {
      item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "raw_materials",
        required: true,
      },
      cutting_quantity: {
        type: Number,
        default: 0,
        min: 0,
      },
      // cutting_quantity: {
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
      },
    },
  ],
  created_employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    trim: true,
  },
  group_history_remarks: {
    type: String,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

export const GroupHistoryModel = mongoose.model(
  "group_history",
  GroupHistorySchema
);
const lookup = [
  {
    $lookup: {
      from: "raw_materials",
      localField: "cutting_item_details.item_id",
      foreignField: "_id",
      as: "raw_materials_data",
    },
  },
  {
    $addFields: {
      cutting_item_details: {
        $map: {
          input: "$cutting_item_details",
          as: "detail",
          in: {
            $mergeObjects: [
              "$$detail",
              {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$raw_materials_data",
                      as: "material",
                      cond: { $eq: ["$$material._id", "$$detail.item_id"] },
                    },
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
    },
  },
  {
    $project: {
      raw_materials_data: 0,
    },
  },
];
LogSchemaFunction("grouphistory", GroupHistoryModel, lookup);
