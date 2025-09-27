import mongoose, { Schema } from 'mongoose';
import { sub_category } from '../../Utils/constants/constants.js';

const photoSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
    },
    photo_number: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Pattern Name is required'],
    },
    banner_image: {
      type: Schema.Types.Mixed,
      required: [true, 'Banner Images is required'],
    },
    images: {
      type: [Schema.Types.Mixed],
      default: null,
    },
    status: {
      type: Boolean,
      default: true,
    },
    current_stage: {
      type: String,
      uppercase: true,
      uppercase: true,
      trim: true,
      default: null,
    },
    group_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    group_no: {
      type: String,
      uppercase: true,
      uppercase: true,
      trim: true,
      default: null,
    },
    item_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    item_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    sub_category_type: {
      type: String,
      enum: {
        values: [sub_category.natural, sub_category.hybrid],
        message: `Sub-category type {{VALUE}}, must be one of ${[sub_category.natural, sub_category.hybrid].join(",")}`
      },
      required: [true, 'Subcategory type is required'],
      trim: true,
      uppercase: true,
    },
    hybrid_group_no: {
      type: [
        {
          type: {
            _id: {
              type: mongoose.Schema.Types.ObjectId,
              default: null,
            },
            group_no: {
              type: String,
              uppercase: true,
              trim: true,
              required: [true, 'Group No is required'],
            },
          },
        },
      ],
      default: []
    },
    length: {
      type: Number,
      default: null,
    },
    width: {
      type: Number,
      default: null,
    },
    thickness: {
      type: Number,
      default: null,
    },
    no_of_sheets: {
      type: Number,
      default: 0,
    },
    available_no_of_sheets: {
      type: Number,
      default: function () {
        return this.no_of_sheets;
      },
    },
    timber_colour_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    timber_colour_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    process_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    process_name: {
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
      default: null,
    },
    series_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    grade_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    cut_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    cut_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    process_color_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    process_color_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    sales_item_name: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    value_added_process: {
      type: [
        {
          type: {
            process_id: {
              type: mongoose.Schema.Types.ObjectId,
              default: null,
            },
            process_name: {
              type: String,
              uppercase: true,
              trim: true,
              default: null,
            },
          },
        },
      ],
      default: [],
    },
    additional_character: {
      type: [
        {
          type: {
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
          },
        },
      ],
      default: [],
    },
    placement: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    collection_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    grain_direction: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    type: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    destination: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    destination_pallet_no: {
      type: String,
      default: null,
    },
    min_rate: {
      type: Number,
      default: 0,
    },
    max_rate: {
      type: Number,
      default: 0,
    },
    remark: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'created by is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'updated by is required'],
    },
  },
  { timestamps: true }
);

photoSchema.index({ photo_number: 1 }, { unique: true });
photoSchema.index({ sr_no: 1 }, { unique: true });
photoSchema.index({ sales_item_name: 1 });
photoSchema.index({ item_name: 1 });
photoSchema.index({ created_by: 1 });
photoSchema.index({ updated_by: 1 });
photoSchema.index({ createdAt: -1 });
photoSchema.index({ updatedAt: -1 });

const photoModel = mongoose.model('photos', photoSchema, 'photos');
export default photoModel;
