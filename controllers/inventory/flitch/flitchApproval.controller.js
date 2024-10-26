import mongoose from "mongoose";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { flitch_approval_inventory_invoice_model, flitch_approval_inventory_items_model } from "../../../database/schema/inventory/Flitch/flitchApproval.schema.js";
import { flitch_inventory_invoice_model } from "../../../database/schema/inventory/Flitch/flitch.schema.js";

export const flitchApproval_invoice_listing = catchAsync(async function (req, res, next) {
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

    const List_flitch_invoice_details =
        await flitch_approval_inventory_invoice_model.aggregate(aggregate_stage);

    const totalCount = await flitch_approval_inventory_invoice_model.countDocuments({
        ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
        statusCode: 200,
        status: "success",
        data: List_flitch_invoice_details,
        totalPage: totalPage,
        message: "Data fetched successfully",
    });
});

export const flitchApproval_item_listing_by_invoice = catchAsync(
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

        const flitchExpense_item_by_invoice = await flitch_approval_inventory_items_model.aggregate(aggregate_stage);
        const flitchExpense_invoice = await flitch_approval_inventory_invoice_model.findOne({
            _id: document_id,
            invoice_id: invoice_id
        });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: {
                items: flitchExpense_item_by_invoice,
                invoice: flitchExpense_invoice
            },
            // totalPage: totalPage,
            message: "Data fetched successfully",
        });
    }
);

export const flitch_approve_invoice_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoiceId = req.params?.invoice_id;
        const document_id = req.params._id;
        const user = req.userDetails;

        const invoice_details = await flitch_approval_inventory_invoice_model.findOneAndUpdate({
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

        const update_flitch_invoice = await flitch_inventory_invoice_model.updateOne({ _id: invoice_id }, {
            $set: {
                ...invoiceData,
            }
        }, { session })
        if (!update_flitch_invoice.acknowledged || update_flitch_invoice.modifiedCount <= 0) return next(new ApiError("Failed to approve invoice"), 400);

        const items_details = await flitch_approval_inventory_items_model.find({
            approval_invoice_id: invoice_details?._id,
            invoice_id: invoice_id
        }).lean();
        if (items_details?.length <= 0) return next(new ApiError("No invoice items found for approval", 404));

        await flitch_approval_inventory_items_model.aggregate([
            {
                $match: {
                    approval_invoice_id: invoice_details?._id,
                    invoice_id: new mongoose.Types.ObjectId(invoice_id)
                }
            },
            {
                $set: {
                    _id: "$flitch_item_id"
                },
            },
            {
                $unset: ["flitch_item_id","approval_invoice_id"]
            },
            {
                $merge: {
                    into: "flitch_inventory_items_details",
                    whenMatched: "merge",
                }
            }
        ]);

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

export const flitch_reject_invoice_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoiceId = req.params?.invoice_id;
        const document_id = req.params._id;
        const remark = req.body?.remark
        const user = req.userDetails;

        const invoice_details = await flitch_approval_inventory_invoice_model.findOneAndUpdate({
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

        const update_flitch_invoice = await flitch_inventory_invoice_model.updateOne({ _id: invoiceId }, {
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
        if (!update_flitch_invoice.acknowledged || update_flitch_invoice.modifiedCount <= 0) return next(new ApiError("Failed to reject invoice"), 400);

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