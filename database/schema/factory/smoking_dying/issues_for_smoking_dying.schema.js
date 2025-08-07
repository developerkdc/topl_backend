import mongoose from 'mongoose';
import { issues_for_status } from '../../../Utils/constants/constants.js';

const validate_dressing_required_field = function () {
  return (
    this.dressing_done_id || this.issued_from === issues_for_status.dressing
  );
};

const issues_for_smoking_dying_schema = new mongoose.Schema(
  {
    unique_identifier: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'unique identifier is required'],
    },
    veneer_inventory_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: [
        function () {
          return this.issued_from === issues_for_status.veneer;
        },
        'Veneer inventory id is required',
      ],
    },
    dressing_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: [
        function () {
          return this.issued_from === issues_for_status.dressing;
        },
        'Dressing done id is required',
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
      required: [validate_dressing_required_field, 'Charcter ID is required'],
    },
    character_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
      required: [validate_dressing_required_field, 'Charcter Name is required'],
    },
    pattern_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: [validate_dressing_required_field, 'Pattern ID is required'],
    },
    pattern_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
      required: [validate_dressing_required_field, 'Pattern Name is required'],
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
        values: [issues_for_status?.veneer, issues_for_status?.dressing],
        message: `Invalid issued from type {{VALUE}} it should be one of the ${issues_for_status?.veneer}, ${issues_for_status?.dressing} `,
      },
      required: [true, 'Issued from is required'],
    },
    is_smoking_dying_done: {
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
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
    updated_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Updated By is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

issues_for_smoking_dying_schema.index({ item_name: -1 });
issues_for_smoking_dying_schema.index({ bundle_number: -1 });
issues_for_smoking_dying_schema.index({ pallet_number: -1 });
issues_for_smoking_dying_schema.index({
  item_name: -1,
  pallet_number: -1,
  bundle_number: -1,
});

export const issues_for_smoking_dying_model = mongoose.model(
  'issues_for_smoking_dyings',
  issues_for_smoking_dying_schema,
  'issues_for_smoking_dyings'
);

const issues_for_smoking_dying_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const issues_for_smoking_dying_view_model = mongoose.model(
  'issues_for_smoking_dying_views',
  issues_for_smoking_dying_view_schema,
  'issues_for_smoking_dying_views'
);

(async function () {
  await issues_for_smoking_dying_view_model.createCollection({
    viewOn: 'issues_for_smoking_dyings',
    pipeline: [
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
            unique_identifier: '$unique_identifier',
            pallet_number: '$pallet_number',
          },
          issued_from: {
            $first: '$issued_from',
          },
          item_name: {
            $first: '$item_name',
          },
          item_sub_category_name: {
            $first: '$item_sub_category_name',
          },
          is_smoking_dying_done: {
            $first: '$is_smoking_dying_done',
          },
          bundles: {
            $push: '$$ROOT',
          },
          total_bundles: {
            $sum: 1,
          },
        },
      },
    ],
  });
})();
