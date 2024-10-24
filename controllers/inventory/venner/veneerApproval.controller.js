import mongoose from "mongoose";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import { veneer_approval_inventory_invoice_model, veneer_approval_inventory_items_model } from "../../../database/schema/inventory/venner/veneerApproval.schema.js";
// import { veneer_approval_inventory_invoice_model, veneer_approval_inventory_items_model } from "../../../database/schema/inventory/Veneer/veneerApproval.schema.js";

export const veneerApproval_invoice_listing = catchAsync(async function (req, res, next) {
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

    const List_veneer_invoice_details =
        await veneer_approval_inventory_invoice_model.aggregate(aggregate_stage);

    const totalCount = await veneer_approval_inventory_invoice_model.countDocuments({
        ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
        statusCode: 200,
        status: "success",
        data: List_veneer_invoice_details,
        totalPage: totalPage,
        message: "Data fetched successfully",
    });
});

export const veneerApproval_item_listing_by_invoice = catchAsync(
    async (req, res, next) => {
        const invoice_id = req.params.invoice_id;

        const aggregate_stage = [
            {
                $match: {
                    "invoice_id": new mongoose.Types.ObjectId(invoice_id),
                },
            },
            {
                $sort: {
                    item_sr_no: 1,
                },
            }
        ];

        const veneerExpense_item_by_invoice = await veneer_approval_inventory_items_model.aggregate(aggregate_stage);
        const veneerExpense_invoice = await veneer_approval_inventory_invoice_model.findOne({ _id: invoice_id });

        // const totalCount = await veneer_inventory_items_view_model.countDocuments({
        //   ...match_query,
        // });

        // const totalPage = Math.ceil(totalCount / limit);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: {
                items: veneerExpense_item_by_invoice,
                invoice: veneerExpense_invoice
            },
            // totalPage: totalPage,
            message: "Data fetched successfully",
        });
    }
);