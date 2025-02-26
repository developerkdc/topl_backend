import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const process_done_details_schema = new mongoose.Schema(
  {
    process_done_date: {
      type: Date,
      required: [true, 'Peeling Date is required'],
    },
    issue_for_smoking_dying_unique_identifier: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issues for smoking unique identifier is required'],
    },
    issue_for_smoking_dying_pallet_number: {
      type: String,
      required: [true, 'Issues for smoking pallet number is required'],
    },
    no_of_workers: {
      type: Number,
      required: [true, 'No.of Workers is required '],
    },
    no_of_working_hours: {
      type: Number,
      required: [true, 'No. of Working hours is required'],
    },
    no_of_total_hours: {
      type: Number,
      required: [true, 'No. of Total hours is required'],
    },
    shift: {
      type: String,
      required: [true, 'Shift is required'],
      trim: true,
      uppercase: true,
    },
    pallet_number: {
      type: String,
      required: [true, 'pallet number is required'],
    },
    process_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'process id is required'],
    },
    process_name: {
      type: String,
      required: [true, 'process name is required'],
    },
    color_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    color_name: {
      type: String,
      default: null,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By Id is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By Id is required'],
    },
  },
  {
    timestamps: true,
  }
);

process_done_details_schema.index({ pallet_number: 1 }, { unique: true });

export const process_done_details_model = mongoose.model(
  'process_done_details',
  process_done_details_schema,
  'process_done_details'
);

const process_done_items_details_schema = new mongoose.Schema(
  {
    process_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Process done id is required'],
    },
    issue_for_smoking_dying_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Issues for smoking id is required'],
    },
    item_name: {
      type: String,
      required: [true, 'Item Name is required'],
    },
    item_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Item Name ID is required'],
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items Sub-Category Id is required'],
    },
    item_sub_category_name: {
      type: String,
      required: [true, 'Item Sub-Category Name is required'],
      trim: true,
      uppercase: true,
    },
    log_no_code: {
      type: String,
      required: [true, 'Log No Code is required'],
    },
    length: {
      type: Number,
      default: 0,
      required: [true, 'Length is required'],
    },
    width: {
      type: Number,
      default: 0,
      required: [true, 'Width is required'],
    },
    height: {
      type: Number,
      default: 0,
      required: [true, 'Height is required'],
    },
    thickness: {
      type: Number,
      default: 0,
      required: [true, 'Thickness is required'],
    },
    no_of_leaves: {
      type: Number,
      default: 0,
      required: [true, 'No of leaves is required'],
    },
    sqm: {
      type: Number,
      default: 0,
      required: [true, 'SQM is required'],
    },
    bundle_number: {
      type: Number,
      required: [true, 'bundle number is required'],
    },
    pallet_number: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'pallet_number is required'],
    },
    process_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'process id is required'],
    },
    process_name: {
      type: String,
      required: [true, 'process name is required'],
    },
    color_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    color_name: {
      type: String,
      default: null,
    },
    character_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    character_name: {
      type: String,
      default: null,
    },
    pattern_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    pattern_name: {
      type: String,
      default: null,
    },
    series_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Series ID is required'],
    },
    series_name: {
      type: String,
      required: [true, 'Series Name is required'],
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Grade ID is required'],
    },
    grade_name: {
      type: String,
      required: [true, 'Grade Name is required'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [issues_for_status.grouping],
        message: `Invalid type {{VALUE}} it must be one of the ${issues_for_status.grouping}`,
      },
      default: null,
    },
    amount: {
      type: Number,
      default: 0,
      required: [true, 'Item Amount is required'],
    },
    amount_factor: {
      type: Number,
      default: 1,
    },
    expense_amount: {
      type: Number,
      default: 0,
    },
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
    updated_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);
export const process_done_items_details_model = mongoose.model(
  'process_done_items_details',
  process_done_items_details_schema,
  'process_done_items_details'
);

const process_done_details_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const process_done_details_view_model = mongoose.model("process_done_details_views", process_done_details_view_schema, "process_done_details_views");

(
  async function () {
    await process_done_details_view_model.createCollection({
      viewOn: "process_done_details",
      pipeline: [
        {
          $lookup: {
            from: 'process_done_items_details',
            localField: '_id',
            foreignField: 'process_done_id',
            as: 'process_done_items_details',
          },
        },
        {
          $addFields: {
            item_name: { $first: "$process_done_items_details.item_name" },
            item_sub_category_name: { $first: "$process_done_items_details.item_sub_category_name" },
            total_bundles: {
              $size: "$process_done_items_details"
            },
            available_bundles: {
              $size: {
                $filter: {
                  input: "$process_done_items_details",
                  as: "item",
                  cond: {
                    $eq: ["$$item.issue_status", null]
                  }
                }
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  first_name: 1,
                  last_name: 1,
                  user_name: 1,
                  user_type: 1,
                  email_id: 1,
                },
              },
            ],
            as: 'created_user_details',
          },
        },
        {
          $unwind: {
            path: '$created_user_details',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'updated_by',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  first_name: 1,
                  last_name: 1,
                  user_name: 1,
                  user_type: 1,
                  email_id: 1,
                },
              },
            ],
            as: 'updated_user_details',
          },
        },
        {
          $unwind: {
            path: '$updated_user_details',
            preserveNullAndEmptyArrays: true,
          },
        }
      ]
    })
  }
)()
