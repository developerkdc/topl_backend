import mongoose from "mongoose";

const re_flitching_schema = new mongoose.Schema(
    {
        issue_for_peeling_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'issue for peeling id is required'],
        },
        item_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Items id is required'],
        },
        item_sr_no: {
            type: Number,
            required: [true, 'Invoice Sr No is required'],
        },
        item_name: {
            type: String,
            required: [true, 'Item Name is required'],
            trim: true,
            uppercase: true,
        },
        color: {
            color_id: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            color_name: {
                type: String,
                default: null,
            },
        },
        item_sub_category_name: {
            type: String,
            required: [true, 'item_sub_category_name is required'],
            trim: true,
            uppercase: true,
        },
        item_sub_category_id: {
            type: String,
            required: [true, 'item_sub_category_id is required'],
        },
        log_no: {
            type: String,
            required: [true, 'Log Number is required'],
            trim: true,
            uppercase: true,
        },
        log_no_code: {
            type: String,
            default: null,
            trim: true,
            uppercase: true,
        },
        flitch_code: {
            type: String,
            required: [true, 'Log Number is required'],
            trim: true,
            uppercase: true,
        },
        flitch_formula: {
            type: String,
            default: "BF",
        },
        length: {
            type: Number,
            required: [true, 'Length is required'],
        },
        width1: {
            type: Number,
            required: [true, 'width1 is required'],
        },
        width2: {
            type: Number,
            required: [true, 'width2 is required'],
        },
        width3: {
            type: Number,
            required: [true, 'width3 is required'],
        },
        height: {
            type: Number,
            required: [true, 'height is required'],
        },
        flitch_cmt: {
            type: Number,
            required: [true, 'Flitch Cmt is required'],
        },
        amount: {
            type: Number,
            required: [true, 'Rate in Inr is required'],
        },
        amount_factor: {
            type: Number,
            default: 1,
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
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Created By Id is required'],
        },
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Updated By Id is required'],
        },
    },
    {
        timestamps: true,
    }
);

re_flitching_schema.index({ issue_for_peeling_id: 1 }, { unique: true })

const re_flitching_model = mongoose.model("re_flitchings", re_flitching_schema, "re_flitchings");
export default re_flitching_model;