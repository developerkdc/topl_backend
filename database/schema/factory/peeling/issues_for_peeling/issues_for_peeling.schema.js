import mongoose from 'mongoose';
import {
  issue_for_peeling,
  issues_for_status,
} from '../../../../Utils/constants/constants.js';

const issues_for_peeling_schema = new mongoose.Schema(
  {
    log_inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    crosscut_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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
    color: {
      color_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      color_name: {
        type: String,
        uppercase: true,
        trim: true,
        default: null,
      },
    },
    item_sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Items Sub-Category Id is required'],
    },
    item_sub_category_name: {
      type: String,
      required: [true, 'Item Sub-Category Name is required'],
      trim: true,
      uppercase: true,
    },
    log_no: {
      type: String,
      required: [true, 'Log No is required'],
      trim: true,
      uppercase: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    log_no_code: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    length: {
      type: Number,
      required: [true, 'Length is required'],
    },
    diameter: {
      type: Number,
      required: [true, 'Diameter is required'],
    },
    cmt: {
      type: Number,
      required: [true, 'CMT is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    amount_factor: {
      type: Number,
      default: 1,
    },
    expense_amount: {
      type: Number,
      default: 0,
    },
    issued_from: {
      type: String,
      enum: {
        values: [issues_for_status?.log, issues_for_status?.crosscut_done],
        message: `Invalid issued from type {{VALUE}} it should be one of the ${issues_for_status?.log}, ${issues_for_status?.crosscut_done} `,
      },
      required: [true, 'Issued from is required'],
    },
    type: {
      type: String,
      enum: {
        values: [issue_for_peeling.rest_roller, issue_for_peeling.wastage],
        message: `Invalid type {{VALUE}} it must be one of the ${issue_for_peeling.rest_roller} or ${issue_for_peeling.wastage} `,
      },
      default: null,
    },
    is_peeling_done: {
      type: Boolean,
      default: false,
    },
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
    updated_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

issues_for_peeling_schema.index({ log_inventory_item_id: 1 });
issues_for_peeling_schema.index({ crosscut_done_id: 1 });

export const issues_for_peeling_model = mongoose.model(
  'issues_for_peelings',
  issues_for_peeling_schema,
  'issues_for_peelings'
);

// const issue_for_peeling_view_schema = new mongoose.Schema({},{
//     strict: false,
//     autoCreate:false,
//     autoIndex:false,
// })

// export const issue_for_peeling_view_model = mongoose.model("issue_for_peelings_views", issue_for_peeling_view_schema,"issue_for_peelings_views");

// (async function () {
//     await issue_for_peeling_view_model.createCollection({
//         viewOn: "issues_for_peelings",
//         pipeline: [
//             {
//                 $sort: {
//                     updatedAt: -1,
//                     _id: -1
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "log_inventory_items_details",
//                     localField: "log_inventory_item_id",
//                     foreignField: "_id",
//                     as: "log_item_details"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "crosscutting_dones",
//                     localField: "crosscut_done_id",
//                     foreignField: "_id",
//                     as: "crosscut_done_details"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "created_by",
//                     foreignField: "_id",
//                     pipeline: [
//                         {
//                             $project: {
//                                 user_name: 1,
//                                 user_type: 1,
//                                 dept_name: 1,
//                                 first_name: 1,
//                                 last_name: 1,
//                                 email_id: 1,
//                                 mobile_no: 1,
//                             }
//                         }
//                     ],
//                     as: "created_user_details",
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "updated_by",
//                     foreignField: "_id",
//                     pipeline: [
//                         {
//                             $project: {
//                                 user_name: 1,
//                                 user_type: 1,
//                                 dept_name: 1,
//                                 first_name: 1,
//                                 last_name: 1,
//                                 email_id: 1,
//                                 mobile_no: 1,
//                             }
//                         }
//                     ],
//                     as: "updated_user_details",
//                 }
//             },
//             ...(["log_item_details","crosscut_done_details","created_user_details","updated_user_details"].map((ele)=>{
//                 return {
//                     $unwind: {
//                         path: `$${ele}`,
//                         preserveNullAndEmptyArrays: true
//                     }
//                 }
//             }))
//         ]
//     })
// })()
