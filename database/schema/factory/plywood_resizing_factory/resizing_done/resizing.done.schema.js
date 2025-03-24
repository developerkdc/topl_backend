import mongoose from "mongoose";

const plywood_resizing_done_details_schema = new mongoose.Schema({
    issue_for_resizing_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Issue for resizing ID is required."]
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Items id is required'],
    },
    item_name: {
        type: String,
        required: [true, 'Item Name is required'],
        trim: true,
        uppercase: true,
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
    length: {
        type: Number,
        required: [true, "Length is required."]
    },
    width: {
        type: Number,
        required: [true, "Width is required."]
    },
    thickness: {
        type: Number,
        required: [true, "Thickness is required."]
    },
    no_of_sheets: {
        type: Number,
        required: [true, "No. of Sheets is required."]
    },
    amount: {
        type: Number,
        required: [true, "Amount is required."]
    },
    sqm: {
        type: Number,
        required: [true, "SQM is required."]
    },
    available_details: {
        no_of_sheets: {
            type: Number,
            default: function () {
                return this.no_of_sheets
            }
        },
        amount: {
            type: Number,
            default: function () {
                return this.amount
            }
        },
        sqm: {
            type: Number,
            default: function () {
                return this.sqm
            }
        },
    },
    face_item_details: {
        type: [{
            face_item_id: {
                type: mongoose.Schema.Types.ObjectId,
                required: [true, "Face Item ID is required."]
            },
            item_sr_no: {
                type: Number,
                required: [true, "Face Sr.No is required."]
            },
            item_id: {
                type: mongoose.Schema.Types.ObjectId,
                required: [true, 'Items id is required'],
            },
            item_sr_no: {
                type: Number,
                required: [true, 'item Sr No is required'],
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
            length: {
                type: Number,
                required: [true, 'Length is required'],
            },
            width: {
                type: Number,
                required: [true, 'width is required'],
            },
            thickness: {
                type: Number,
                required: [true, 'thickness is required'],
            },
            no_of_sheets: {
                type: Number,
                required: [true, 'Number of sheets is required'],
            },
            amount: {
                type: Number,
                required: [true, "Amount is required."]
            },
            sqm: {
                type: Number,
                required: [true, "SQM is required."]
            },
            available_details: {
                no_of_sheets: {
                    type: Number,
                    default: function () {
                        return this.no_of_sheets
                    }
                },
                amount: {
                    type: Number,
                    default: function () {
                        return this.amount
                    }
                },
                sqm: {
                    type: Number,
                    default: function () {
                        return this.sqm
                    }
                },
            },
        }],
        remark: {
            type: String,
            default: null
        },
        default: []
    },
    remark: {
        type: String,
        default: null,
        uppercase: true
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Created By is required."]
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Updated By is required."]
    }
}, { timestamps: true });

plywood_resizing_done_details_schema.index({ issue_for_resizing_id: 1 }, { unique: true });

export const plywood_resizing_done_details_model = mongoose.model("plywood_resizing_done_details", plywood_resizing_done_details_schema, "plywood_resizing_done_details");


