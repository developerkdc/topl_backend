import mongoose, { Schema } from 'mongoose';

const photoSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required']
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
      trim: true,
      default:null
    },
    group_no: {
      type: String,
      trim: true,
      default:null
    },
    item_name: {
      type: String,
      trim: true,
      default:null
    },
    length: {
      type: Number,
      default:null,
    },
    width: {
      type: Number,
      default:null
    },
    thickness: {
      type: Number,
      default:null
    },
    no_sheet: {
      type: Number,
      default:null
    },
    timber_colour_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    timber_colour_name: {
      type: String,
      default: null,
    },
    process_id: {
      type: mongoose.Schema.Types.ObjectId,
      default:null,
    },
    process_name: {
      type: String,
      default:null,
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
    cut_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'cut id is required'],
    },
    cut_name: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'cut name is required'],
    },
    process_color_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    process_color_name: {
      type: String,
      default: null,
    },
    sales_item_name: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'Sales Item Name is required']
    },




    placement: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Placement is required']
    },
    collection_name: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Collection Name is required']
    },
    grain_direction: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Grain Direction is required']
    },
    dyed_color_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    dyed_color_name: {
      type: String,
      default: null,
    },
    remark: { 
      type: String,
      uppercase:true,
      trim: true,
      default:null 
    },
    type: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Type is required']
    },
    destination: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, 'Destination is required']
    },
    destination_pallet_no: {
      type: String,
      trim: true,
      required: [true, 'Destination Pallet No is required']
    },
    value_added_process_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'value added process id is required'],
    },
    value_added_process_name: {
      type: String,
      required: [true, 'value added process name is required'],
    },
    new_character_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    new_character_name: {
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
  },
  { timestamps: true }
);

photoSchema.index({ photo_number: 1 }, { unique: true });
photoSchema.index({ sr_no: 1 }, { unique: true });
photoSchema.index({ created_by: 1 });
photoSchema.index({ updated_by: 1 });

const photoModel = mongoose.model('photos', photoSchema, 'photos');
export default photoModel;
