import mongoose from 'mongoose';

const plywood_production_damage_schema = new mongoose.Schema(
  {
    iscompleted: {
      type: Boolean,
      default:true
    },
    item_name: {
      type: String,
      required: [true, 'Item Name is required'],
    },
    sub_category: {
      type: String,
      required: [true, 'Sub Category is required'],
    },
    length: {
      type: Number,
      required: [true, 'New Lenght is required'],
    },
    width: {
      type: Number,
      required: [true, 'New Width is required'],
    },
    thickness: {
      type: Number,
      required: [true, 'New Thickness is required'],
    },
    no_of_sheets: {
      type: Number,
      required: [true, 'Number of Sheets are required'],
    },
    total_sqm: {
      type: Number,
      required: [true, 'Total SQM is required'],
    },
    damage_sheets:{
      type:Number,
      required: [true, 'Damage sheets are required'],
    },
    plywood_production_id:{
      type:mongoose.Schema.Types.ObjectId,
      require:[true, "Plywood production Id is required"]
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

export const plywood_production_damage_model = mongoose.model(
  'plywood_production_damage',
  plywood_production_damage_schema,
  'plywood_production_damage'
);

