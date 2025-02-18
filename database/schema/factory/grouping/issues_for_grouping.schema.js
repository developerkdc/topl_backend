import mongoose from "mongoose";
import { issues_for_status } from "../../../Utils/constants/constants.js";

const issues_for_grouping_schema = new mongoose.Schema({
    process_done_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    dressing_done_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    bundles: {
        type: [mongoose.Schema.Types.ObjectId],
        required: [true, 'Bundles Array is required'],
    },
    issued_from: {
        type: String,
        enum: {
            values: [issues_for_status?.smoking_dying, issues_for_status?.dressing],
            message: `Invalid issued from type {{VALUE}} it should be one of the ${issues_for_status?.smoking_dying}, ${issues_for_status?.dressing} `,
        },
        required: [true, 'Issued from is required'],
    },
    is_grouping_done: {
        type: Boolean,
        default: false
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Created By is required.'],
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Updated By is required.'],
    },
},
    { timestamps: true }
);

export const issues_for_grouping_model = mongoose.model("issues_for_groupings", issues_for_grouping_schema, "issues_for_groupings");

const issues_for_grouping_view_schema = new mongoose.Schema({}, {
    autoCreate: false,
    autoIndex: false,
    strict: false
});

export const issues_for_grouping_view_model = mongoose.model("issues_for_grouping_views", issues_for_grouping_view_schema, "issues_for_grouping_views");

(async function () {
    await issues_for_grouping_view_model.createCollection({
        viewOn: "issues_for_groupings",
        pipeline: [
            {
                $lookup: {
                    from: 'users',
                    localField: 'created_by',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                user_name: 1,
                                user_type: 1,
                                dept_name: 1,
                                first_name: 1,
                                last_name: 1,
                                email_id: 1,
                                mobile_no: 1,
                            },
                        },
                    ],
                    as: 'created_by',
                },
            },
            {
                $unwind: {
                    path: '$created_by',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'updated_by',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                user_name: 1,
                                user_type: 1,
                                dept_name: 1,
                                first_name: 1,
                                last_name: 1,
                                email_id: 1,
                                mobile_no: 1,
                            },
                        },
                    ],
                    as: 'updated_by',
                },
            },
            {
                $unwind: {
                    path: '$updated_by',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'process_done_details',
                    localField: 'process_done_id',
                    foreignField: '_id',
                    as: 'process_done_details',
                },
            },
            {
                $lookup: {
                    from: 'dressing_done_other_details',
                    localField: 'dressing_done_id',
                    foreignField: '_id',
                    as: 'dressing_done_details',
                },
            },
            {
                $unwind: {
                    path: '$done_details',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'process_done_items_details',
                    localField: 'bundles',
                    foreignField: '_id',
                    as: 'process_bundle_details',
                },
            },
            {
                $lookup: {
                    from: 'dressing_done_items',
                    localField: 'bundles',
                    foreignField: '_id',
                    as: 'dressing_bundle_details',
                },
            },
        ]
    })
})()