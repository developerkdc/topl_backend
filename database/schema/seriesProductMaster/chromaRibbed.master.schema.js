import mongoose from "mongoose";

const chromaRibbedSchema = new mongoose.Schema({
    code: {
        type: String,
        uppercase: true,
        trim: true,
        required: [true, "Code is required"]
    },
    base: {
        type: [String],
        uppercase: true,
        trim: true,
        required: [true, "Base is required"]
    },
     default_item_name: {
            type: String,
            uppercase: true,
            trim: true,
            default: null
        },
        default_item_name_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "item_name",
            default: null
        },
    size: {
         type: [
            {
                length: {
                    type: Number,
                    required: [true, "Length is required in size"],
                    trim: true
                },
                width: {
                    type: Number,
                    required: [true, "Width is required in size"],
                    trim: true
                },
                time: {
                    type: Number,
                    // required: [true, "Time is required in size"],
                    trim: true,
                    default: null
                },
            }
        ]
    },
    sub_category:  {
           type: [
               {
                sub_category_name: {
                       type: String,
                       required: [true, "Sub-Category Name is required"],
                       trim: true,
                       uppercase: true
                   },
                   sub_category_id: {
                       type: mongoose.Schema.Types.ObjectId,
                       required: [true, "Sub-Category ID is required"]
                   }
               }
           ]
       },
       base_min_thickness: {
        type: Number,
        default: 0
    },
    veneer_min_thickness: {
        type: Number,
        default: 0
    },
    instructions: {
        type: [String],
        default: null,
        trim: true,
        uppercase: true
    },
    process_flow: {
        type: [String],
        default: null,
        trim: true,
        uppercase: true,
    },
    status: {
        type: Boolean,
        default: true
    },
    remark: {
        type: String,
        default: null,
        trim: true,
        uppercase: true
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Created by is required"]
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Updated by is required"]
    }
}, {
    timestamps: true
});

chromaRibbedSchema.index({ code: 1 }, { unique: true });

const chromaRibbedModel = mongoose.model("chroma_ribbed", chromaRibbedSchema);
export default chromaRibbedModel