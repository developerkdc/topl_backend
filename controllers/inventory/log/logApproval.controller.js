import mongoose from "mongoose";
import { log_inventory_invoice_model, log_inventory_items_model } from "../../../database/schema/inventory/log/log.schema.js";
import { log_approval_inventory_invoice_model, log_approval_inventory_items_model } from "../../../database/schema/inventory/log/logApproval.schema.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js";

export const logApproval_invoice_listing = catchAsync(async function (req, res, next) {
    const {
        page = 1,
        limit = 10,
        sortBy = "updatedAt",
        sort = "desc",
        search = "",
    } = req.query;
    const {
        string,
        boolean,
        numbers,
        arrayField = [],
    } = req?.body?.searchFields || {};
    const filter = req.body?.filter;
    const user = req.userDetails;

    let search_query = {};
    if (search != "" && req?.body?.searchFields) {
        const search_data = DynamicSearch(
            search,
            boolean,
            numbers,
            string,
            arrayField
        );
        if (search_data?.length == 0) {
            return res.status(404).json({
                statusCode: 404,
                status: false,
                data: {
                    data: [],
                },
                message: "Results Not Found",
            });
        }
        search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const match_query = {
        ...filterData,
        ...search_query,
        "approval.approvalPerson": user?._id
    };

    const aggregate_stage = [
        {
            $lookup:{
                from: "users",
                localField:"approval.editedBy",
                foreignField:"_id",
                pipeline:[
                    {
                        $project:{
                            user_name:1
                        }
                    }
                ],
                as:"user"
            }
        },
        {
            $unwind:{
                path:"$user",
                preserveNullAndEmptyArrays:true
            }
        },
        {
            $match: match_query,
        },
        {
            $sort: {
                [sortBy]: sort === "desc" ? -1 : 1,
                _id: sort === "desc" ? -1 : 1,
            },
        },
        {
            $skip: (parseInt(page) - 1) * parseInt(limit),
        },
        {
            $limit: parseInt(limit),
        },
    ];

    const List_log_invoice_details =
        await log_approval_inventory_invoice_model.aggregate(aggregate_stage);

    const totalCount = await log_approval_inventory_invoice_model.countDocuments({
        ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
        statusCode: 200,
        status: "success",
        data: List_log_invoice_details,
        totalPage: totalPage,
        message: "Data fetched successfully",
    });
});

export const logApproval_item_listing_by_invoice = catchAsync(
    async (req, res, next) => {
        const invoice_id = req.params.invoice_id;
        const document_id = req.params._id;

        const aggregate_stage = [
            {
                $match: {
                    approval_invoice_id: new mongoose.Types.ObjectId(document_id),
                    "invoice_id": new mongoose.Types.ObjectId(invoice_id),
                },
            },
            {
                $sort: {
                    item_sr_no: 1,
                },
            }
        ];

        const logExpense_item_by_invoice = await log_approval_inventory_items_model.aggregate(aggregate_stage);
        const logExpense_invoice = await log_approval_inventory_invoice_model.findOne({
            _id: document_id,
            invoice_id: invoice_id
        });

        // const totalCount = await log_inventory_items_view_model.countDocuments({
        //   ...match_query,
        // });

        // const totalPage = Math.ceil(totalCount / limit);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: {
                items: logExpense_item_by_invoice,
                invoice: logExpense_invoice
            },
            // totalPage: totalPage,
            message: "Data fetched successfully",
        });
    }
);

export const log_approve_invoice_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoiceId = req.params?.invoice_id;
        const document_id = req.params._id;
        const user = req.userDetails;

        const invoice_details = await log_approval_inventory_invoice_model.findOneAndUpdate({
            _id: document_id,
            invoice_id: invoiceId,
            "approval.approvalPerson": user._id
        }, {
            $set: {
                approval_status: {
                    sendForApproval: {
                        status: false,
                        remark: null
                    },
                    approved: {
                        status: true,
                        remark: null
                    },
                    rejected: {
                        status: false,
                        remark: null
                    }
                },
                "approval.approvalBy.user": user._id,
            }
        }, { session, new: true }).lean();
        if (!invoice_details) return next(new ApiError("No invoice found for approval", 404));

        const { _id, invoice_id, approvalBy, ...invoiceData } = invoice_details

        const update_log_invoice = await log_inventory_invoice_model.updateOne({ _id: invoice_id }, {
            $set: {
                ...invoiceData,
            }
        }, { session })
        if (!update_log_invoice.acknowledged || update_log_invoice.modifiedCount <= 0) return next(new ApiError("Failed to approve invoice"), 400);

        const items_details = await log_approval_inventory_items_model.find({
            approval_invoice_id: invoice_details?._id,
            invoice_id: invoice_id
        }).lean();
        if (items_details?.length <= 0) return next(new ApiError("No invoice items found for approval", 404));

        await log_inventory_items_model.deleteMany({
            invoice_id: new mongoose.Types.ObjectId(invoice_id)
        }, { session });

        const approval_invoice_items_data = await log_approval_inventory_items_model.aggregate([
            {
                $match: {
                    approval_invoice_id: invoice_details?._id,
                    invoice_id: new mongoose.Types.ObjectId(invoice_id)
                }
            },
            {
                $set: {
                    _id: "$log_item_id"
                },
            },
            {
                $unset: ["log_item_id", "approval_invoice_id"]
            }
        ]);

        await log_inventory_items_model.insertMany(approval_invoice_items_data, { session })

        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Invoice has approved successfully",
        });

    } catch (error) {
        console.log(error);
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
})

export const log_reject_invoice_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoiceId = req.params?.invoice_id;
        const document_id = req.params._id;
        const remark = req.body?.remark || "Rejected"
        const user = req.userDetails;

        const invoice_details = await log_approval_inventory_invoice_model.findOneAndUpdate({
            _id: document_id,
            invoice_id: invoiceId,
            "approval.approvalPerson": user._id
        }, {
            $set: {
                approval_status: {
                    sendForApproval: {
                        status: false,
                        remark: null
                    },
                    approved: {
                        status: false,
                        remark: null
                    },
                    rejected: {
                        status: true,
                        remark: remark
                    }
                },
                "approval.rejectedBy.user": user._id,
            }
        }, { session, new: true }).lean();
        if (!invoice_details) return next(new ApiError("No invoice found for approval", 404));

        const update_log_invoice = await log_inventory_invoice_model.updateOne({ _id: invoiceId }, {
            $set: {
                approval_status: {
                    sendForApproval: {
                        status: false,
                        remark: null
                    },
                    approved: {
                        status: false,
                        remark: null
                    },
                    rejected: {
                        status: true,
                        remark: remark
                    }
                },
            }
        }, { session })
        if (!update_log_invoice.acknowledged || update_log_invoice.modifiedCount <= 0) return next(new ApiError("Failed to reject invoice"), 400);

        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Invoice has rejected successfully",
        });

    } catch (error) {
        console.log(error);
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
})