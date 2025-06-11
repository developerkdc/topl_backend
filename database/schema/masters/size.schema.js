import mongoose from 'mongoose';
import { item_issued_from } from '../../Utils/constants/constants.js';

const LengthSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
    },
    length: {
      type: Number,
      uppercase: true,
      trim: true,
      required: [true, 'Length is required'],
    },
    remark: {
      type: String,
      trim: true,
      uppercase: true,
    },
    status: {
      type: Boolean,
      default: true,
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

LengthSchema.index({ length: 1 }, { unique: true });
LengthSchema.index({ sr_no: -1 }, { unique: true });
LengthSchema.index({ created_by: 1 });
LengthSchema.index({ updated_by: 1 });

export const lengthModel = mongoose.model('length', LengthSchema,"length");

// width schema
const WidthSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
    },
    width: {
      type: Number,
      uppercase: true,
      trim: true,
      required: [true, 'Width is required'],
    },
    remark: {
      type: String,
      trim: true,
      uppercase: true,
    },
    status: {
      type: Boolean,
      default: true,
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

WidthSchema.index({ width: 1 }, { unique: true });
WidthSchema.index({ sr_no: -1 }, { unique: true });
WidthSchema.index({ created_by: 1 });
WidthSchema.index({ updated_by: 1 });

export const widthModel = mongoose.model('width', WidthSchema,"width");

// thickness schema
const ThicknessSchema = new mongoose.Schema(
  {
    sr_no: {
      type: Number,
      required: [true, 'Sr.No is required'],
    },
    thickness: {
      type: Number,
      uppercase: true,
      trim: true,
      required: [true, 'Thickness is required'],
    },
    category: {
      type: [String],
      required: [true, 'Category is required'],
      enum: [
        item_issued_from.veneer,
        item_issued_from.plywood,
        item_issued_from.mdf,
        item_issued_from.fleece_paper,
      ],
      uppercase: true,
    },
    remark: {
      type: String,
      trim: true,
      uppercase: true,
    },
    status: {
      type: Boolean,
      default: true,
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

ThicknessSchema.index({ thickness: 1 }, { unique: true });
ThicknessSchema.index({ sr_no: -1 }, { unique: true });
ThicknessSchema.index({ category: 1 });
ThicknessSchema.index({ created_by: 1 });
ThicknessSchema.index({ updated_by: 1 });

export const thicknessModel = mongoose.model('thickness', ThicknessSchema,"thickness");
