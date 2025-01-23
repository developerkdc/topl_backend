import mongoose from 'mongoose';

const novelSchema = new mongoose.Schema(
  {
    default_item_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    default_item_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'item_name',
      default: null,
    },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Code  is required'],
    },
    base: {
      type: [String],
      uppercase: true,
      trim: true,
      required: [true, 'Base is required'],
    },
    size: {
      type: [
        {
          length: {
            type: Number,
            required: [true, 'Length is required in size'],
            trim: true,
          },
          width: {
            type: Number,
            required: [true, 'Width is required in size'],
            trim: true,
          },
          time: {
            type: Number,
            default: null,
            trim: true,
          },
        },
      ],
    },
    sub_category: {
      type: [
        {
          sub_category_name: {
            type: String,
            required: [true, 'Sub Category Name is required'],
            trim: true,
            uppercase: true,
          },
          sub_category_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Sub Category ID is required'],
          },
        },
      ],
    },

    base_min_thickness: {
      type: Number,
      default: 0,
    },
    veneer_min_thickness: {
      type: Number,
      default: 0,
    },
    instructions: {
      type: [String],
      default: null,
      trim: true,
      set: (values) => {
        return Array.isArray(values)
          ? values?.map((val) => val?.toUpperCase())
          : values;
      },
    },
    process_flow: {
      type: [String],
      default: null,
      trim: true,
      set: (values) => {
        return Array.isArray(values)
          ? values?.map((val) => val?.toUpperCase())
          : values;
      },
    },
    status: {
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
      required: [true, 'created by is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'updated by is required'],
    },
  },
  {
    timestamps: true,
  }
);

novelSchema.index({ code: 1 }, { unique: true });

const novelModel = mongoose.model('novel', novelSchema);
export default novelModel;
