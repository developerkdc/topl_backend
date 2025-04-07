import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const issues_for_grouping_schema = new mongoose.Schema({
  unique_identifier: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'unique identifier is required'],
  },
  process_done_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    required: [
      function () {
        return this.issued_from === issues_for_status.smoking_dying;
      },
      'process_done_id is required',
    ],
  },
  process_done_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    required: [
      function () {
        return this.issued_from === issues_for_status.smoking_dying;
      },
      'process_done_item_id is required',
    ],
  },
  dressing_done_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    required: [
      function () {
        return this.issued_from === issues_for_status.dressing;
      },
      'dressing_done_id is required',
    ],
  },
  dressing_done_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    required: [
      function () {
        return this.issued_from === issues_for_status.dressing;
      },
      'dressing_done_item_id is required',
    ],
  },
  veneer_inventory_invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    required: [
      function () {
        return this.issued_from === issues_for_status.veneer;
      },
      'veneer_inventory_invoice_id is required',
    ],
  },
  veneer_inventory_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    required: [
      function () {
        return this.issued_from === issues_for_status.veneer;
      },
      'veneer_inventory_item_id is required',
    ],
  },
  item_name: {
    type: String,
    uppercase: true,
    trim: true,
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
    uppercase: true,
    trim: true,
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
  color_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  color_name: {
    type: String,
    uppercase: true,
    trim: true,
    default: null,
  },
  character_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  character_name: {
    type: String,
    uppercase: true,
    trim: true,
    default: null,
  },
  pattern_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  pattern_name: {
    type: String,
    uppercase: true,
    trim: true,
    default: null,
  },
  series_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Series ID is required'],
  },
  series_name: {
    type: String,
    uppercase: true,
    trim: true,
    required: [true, 'Series Name is required'],
  },
  grade_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Grade ID is required'],
  },
  grade_name: {
    type: String,
    uppercase: true,
    trim: true,
    required: [true, 'Grade Name is required'],
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
  issued_from: {
    type: String,
    enum: {
      values: [issues_for_status?.smoking_dying, issues_for_status?.dressing, issues_for_status?.veneer],
      message: `Invalid issued from type {{VALUE}} it should be one of the ${issues_for_status?.smoking_dying}, ${issues_for_status?.dressing, issues_for_status?.veneer} `,
    },
    required: [true, 'Issued from is required'],
  },
  is_grouping_done: {
    type: Boolean,
    default: false,
  },
  remark: {
    type: String,
    default: null,
    trim: true,
    uppercase: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Created By is required.'],
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Updated By is required.'],
  },
},
  { timestamps: true }
);

export const issues_for_grouping_model = mongoose.model(
  'issues_for_groupings',
  issues_for_grouping_schema,
  'issues_for_groupings'
);

const issues_for_grouping_view_schema = new mongoose.Schema(
  {},
  {
    autoCreate: false,
    autoIndex: false,
    strict: false,
  }
);

export const issues_for_grouping_view_model = mongoose.model(
  'issues_for_grouping_views',
  issues_for_grouping_view_schema,
  'issues_for_grouping_views'
);

(async function () {
  await issues_for_grouping_view_model.createCollection({
    viewOn: 'issues_for_groupings',
    pipeline: [
      {
        $sort:{
          createdAt:-1
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
                user_name: 1,
                user_type: 1,
                dept_name: 1,
                first_name: 1,
                last_name: 1,
                email_id: 1,
                mobile_no: 1,
              },
            },
          ],
          as: 'created_by',
        },
      },
      {
        $unwind: {
          path: '$created_by',
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
                user_name: 1,
                user_type: 1,
                dept_name: 1,
                first_name: 1,
                last_name: 1,
                email_id: 1,
                mobile_no: 1,
              },
            },
          ],
          as: 'updated_by',
        },
      },
      {
        $unwind: {
          path: '$updated_by',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            unique_identifier: "$unique_identifier",
            pallet_number: "$pallet_number"
          },
          bundles_details: {
            $push: "$$ROOT"
          }
        }
      },
      {
        $addFields: {
          issued_from: { $first: '$bundles_details.issued_from' },
          is_grouping_done: { $first: '$bundles_details.is_grouping_done' },
          item_name_id: { $first: '$bundles_details.item_name_id' },
          item_name: { $first: '$bundles_details.item_name' },
          log_no_code: { $first: '$bundles_details.log_no_code' },
          pallet_number: { $first: '$bundles_details.pallet_number' },
          item_sub_category_name: {
            $first: '$bundles_details.item_sub_category_name',
          },
          item_sub_category_id: {
            $first: '$bundles_details.item_sub_category_id',
          },
          total_bundles: {
            $size: '$bundles_details',
          },
          total_sqm: { $sum: '$bundles_details.sqm' },
          total_amount: { $sum: '$bundles_details.amount' },
        },
      },
    ],
  });
})();
