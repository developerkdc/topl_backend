import mongoose from 'mongoose';
import { issues_for_status } from '../../../../Utils/constants/constants';

const issue_for_plywood_production_schema = new mongoose.Schema({
  face_inventory_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'face_inventory_items_details',
    default: null,
  },
  core_inventory_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'core_inventory_items_details',
    default: null,
  },
  item_sr_no: {
    type: Number,
    required: [true, 'Item Sr No is required'],
  },
  supplier_item_name: {
    type: String,
    required: [true, 'Supplier Item Name is required'],
  },
  item_name: {
    type: String,
    required: [true, 'Item Name is required'],
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Item Id is required'],
  },
  length: {
    type: Number,
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
    type: Number,
    required: [true, 'Number of Sheets are required'],
  },
  available_sheets: {
    type: Number,
    default: function () {
      return this.number_of_sheets;
    },
  },
  total_sq_meter: {
    type: Number,
    required: [true, 'Total sqm is required'],
  },
  grade_name: {
    type: String,
    required: [true, 'Grade name is required'],
  },
  grade_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Grade Id is required'],
  },
  issued_from:{
    type:String,
    required:[true,'Issued from is required'],
    enum:{
        values:[
            issues_for_status?.face,
            issues_for_status?.core
        ],
        message:`Invalid issued from type {{VALUE}} it should be one of the ${issues_for_status.face}, ${issues_for_status.core} or ${issues_for_status.reflitching}`
    }
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
  available_amount: {
    type: Number,
    default: function () {
      return this.amount;
    },
  },
  amount_factor: {
    type: Number,
    default: 0,
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
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Invioce Id is required'],
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'created by is required field'],
  },
},{timestamps:true}
);

export const issue_for_plywood_production_model=mongoose.model("issues_for_plywood_production",issue_for_plywood_production_schema)

