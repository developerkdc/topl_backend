import mongoose from 'mongoose';

const plywood_production_schema = new mongoose.Schema(
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
    available_no_of_sheets:{
      type: Number,
      required: [true, 'Available Number of Sheets are required'],
      default:function(){
        return this.no_of_sheets
      }
    },
    total_sqm: {
      type: Number,
      required: [true, 'Total SQM is required'],
    },
    available_total_sqm:{
      type: Number,
      required: [true, 'Available Total SQM is required'],
      default:function(){
        return this.total_sqm
      }
    },
    is_added_to_damage:{
      type:Boolean,
      default:false
    },
    // remarks: {
    //   type: String,
    //   default: null,
    //   trim: true,
    //   uppercase: true,
    // },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

const plywood_production_consumed_items_schema = new mongoose.Schema(
  {
    core_inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      default:null
    },
    face_inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      default:null
    },
    item_sr_no: {
      type: Number,
      required: [true, 'Item Sr No is required'],
    },
    supplier_item_name: {
      type: String,
      required: [true, 'Supplier name is required'],
    },
    item_name: {
      type: String,
      required: [true, 'item name is required'],
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'item Id is required'],
    },
    length: {
      type:Number,
      required: [true, 'Length is required'],
    },
    width: {
      type: Number,
      required: [true, 'Width is required'],
    },
    thickness: {
      type: Number,
      required: [true, 'Thickness is required'],
    },
    number_of_sheets: {
      type:Number,
      required: [true, 'Number of Sheets are required'],
    },
    status: {
      type: String,
      // required:[true,'Status is required']
    },
    issued_from: {
      type: String,
      // required:[true,"Issue from is required"],
    },
    total_sq_meter: {
      type: Number,
      required: [true, 'Total Sq meter is required'],
    },

    grade_name: {
      type: String,
      required: [true, 'Grade name is required'],
    },
    grade_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Grade Id is required'],
    },
    rate_in_currency: {
      type: Number,
      required: [true, 'Rate in currency is required'],
    },
    exchange_rate: {
      type: Number,
      required: [true, 'exchange rate is required'],
    },
    rate_in_inr: {
      type: Number,
      required: [true, 'Rate in inr is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    amount_factor: {
      type: Number,
      default: 0,
    },
    expense_amount: {
      type: Number,
      default: 0,
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Invoice Id is required'],
    },
    plywood_production_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'plywood production schema Id is required'],
    },
    remark: {
      type: String,
    },
  },
  { timestamps: true }
);

export const plywood_production_model = mongoose.model(
  'plywood_production',
  plywood_production_schema,
  'plywood_production'
);

export const plywood_production_consumed_items_model = mongoose.model(
  'plywood_production_consumed_item',
  plywood_production_consumed_items_schema
);
