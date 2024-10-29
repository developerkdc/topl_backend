import mongoose from "mongoose";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { otherGoods_approval_inventory_invoice_model, otherGoods_approval_inventory_items_model } from "../../../database/schema/inventory/otherGoods/otherGoodsApproval.schema.js";
import { othergoods_inventory_invoice_details, othergoods_inventory_items_details } from "../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js";

export const otherGoodsApproval_invoice_listing = catchAsync(async function (req, res, next) {
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

    const List_otherGoods_invoice_details =
        await otherGoods_approval_inventory_invoice_model.aggregate(aggregate_stage);

    const totalCount = await otherGoods_approval_inventory_invoice_model.countDocuments({
        ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
        statusCode: 200,
        status: "success",
        data: List_otherGoods_invoice_details,
        totalPage: totalPage,
        message: "Data fetched successfully",
    });
});

export const otherGoodsApproval_item_listing_by_invoice = catchAsync(
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

        const otherGoodsExpense_item_by_invoice = await otherGoods_approval_inventory_items_model.aggregate(aggregate_stage);
        const otherGoodsExpense_invoice = await otherGoods_approval_inventory_invoice_model.findOne({
            _id: document_id,
            invoice_id: invoice_id
        });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: {
                items: otherGoodsExpense_item_by_invoice,
                invoice: otherGoodsExpense_invoice
            },
            // totalPage: totalPage,
            message: "Data fetched successfully",
        });
    }
);

export const otherGoods_approve_invoice_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoiceId = req.params?.invoice_id;
        const document_id = req.params._id;
        const user = req.userDetails;

        const invoice_details = await otherGoods_approval_inventory_invoice_model.findOneAndUpdate({
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

        const update_otherGoods_invoice = await othergoods_inventory_invoice_details.updateOne({ _id: invoice_id }, {
            $set: {
                ...invoiceData,
            }
        }, { session })
        if (!update_otherGoods_invoice.acknowledged || update_otherGoods_invoice.modifiedCount <= 0) return next(new ApiError("Failed to approve invoice"), 400);

        const items_details = await otherGoods_approval_inventory_items_model.find({
            approval_invoice_id: invoice_details?._id,
            invoice_id: invoice_id
        }).lean();
        if (items_details?.length <= 0) return next(new ApiError("No invoice items found for approval", 404));

        await othergoods_inventory_items_details.deleteMany({
            invoice_id: new mongoose.Types.ObjectId(invoice_id)
        }, { session });

        const approval_invoice_items_data = await otherGoods_approval_inventory_items_model.aggregate([
            {
                $match: {
                    approval_invoice_id: invoice_details?._id,
                    invoice_id: new mongoose.Types.ObjectId(invoice_id)
                }
            },
            {
                $set: {
                    _id: "$otherGoods_item_id"
                },
            },
            {
                $unset: ["otherGoods_item_id", "approval_invoice_id"]
            }
        ]);

        await othergoods_inventory_items_details.insertMany(approval_invoice_items_data, { session })

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

export const otherGoods_reject_invoice_details = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoiceId = req.params?.invoice_id;
        const document_id = req.params._id;
        const remark = req.body?.remark || "Rejected"
        const user = req.userDetails;

        const invoice_details = await otherGoods_approval_inventory_invoice_model.findOneAndUpdate({
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

        const update_otherGoods_invoice = await othergoods_inventory_invoice_details.updateOne({ _id: invoiceId }, {
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
        if (!update_otherGoods_invoice.acknowledged || update_otherGoods_invoice.modifiedCount <= 0) return next(new ApiError("Failed to reject invoice"), 400);

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