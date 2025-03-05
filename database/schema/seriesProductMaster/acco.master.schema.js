import mongoose, { Schema } from 'mongoose';

const accoSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
      // unique: [true, "Sr.No must be unique"]
    },
    image: {
      type: Schema.Types.Mixed,
      default: null,
    },
    default_item_name: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    default_item_name_id: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'item_name',
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
          base_size: {
            type: String,
            required: [true, 'Base size is required in size'],
            trim: true,
            default:function(){
              return `${this.length}'${this.width}`
            }
          },
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
    veneer_sub_category: {
      type: [
        {
          sub_category_name: {
            type: String,
            default: null,
            trim: true,
            uppercase: true,
          },
          sub_category_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
          },
        },
      ],
      default: [],
      set: (val) => (Array.isArray(val) ? val : []),
    },
    base_sub_category: {
      type: [
        {
          sub_category_name: {
            type: String,
            default: null,
            trim: true,
            uppercase: true,
          },
          sub_category_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
          },
        },
      ],
      default: [],
      set: (val) => (Array.isArray(val) ? val : []),
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

accoSchema.index({ code: 1 }, { unique: true });
accoSchema.index({ sr_no: 1 }, { unique: true });
accoSchema.index({ created_by: 1 });
accoSchema.index({ updated_by: 1 });

const accoModel = mongoose.model('acco', accoSchema);
export default accoModel;
