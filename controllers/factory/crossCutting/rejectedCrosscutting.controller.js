import mongoose from "mongoose";
import { issues_for_crosscutting_model } from "../../../database/schema/factory/crossCutting/issuedForCutting.schema.js";
import { rejected_crosscutting_model, rejected_crosscutting_view_model } from "../../../database/schema/factory/crossCutting/RejectedCrosscutting.schema.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import { StatusCodes } from "../../../utils/constants.js";
import ApiResponse from "../../../utils/ApiResponse.js";

export const listing_rejected_crosscutting = catchAsync(
    async (req, res, next) => {
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

        const rejected_crosscutting_details =
            await rejected_crosscutting_view_model.aggregate(aggregate_stage);

        const totalCount = await rejected_crosscutting_view_model.countDocuments({
            ...match_query,
        });

        const totalPage = Math.ceil(totalCount / limit);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: rejected_crosscutting_details,
            totalPage: totalPage,
            message: "Data fetched successfully",
        });
    }
);

export const revert_rejected_crosscutting = catchAsync(async function (req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const rejected_crosscutting_id = req.params?.rejected_crosscutting_id;
        const rejected_crosscutting = await rejected_crosscutting_model.findOne({
            _id: rejected_crosscutting_id,
        });
        if (!rejected_crosscutting)
            return next(new ApiError("Item not found", 400));

        const issues_for_crosscutting_data = await issues_for_crosscutting_model.findOne({ _id: rejected_crosscutting_id?.log_inventory_item_id })

        if (issues_for_crosscutting_data) {
            const { rejected_quantity, ...data } = rejected_crosscutting
            const update_issues_for_crosscutting_item_quantity = await issues_for_crosscutting_model.updateOne(
                { _id: rejected_crosscutting_id?.log_inventory_item_id },
                {
                    $inc: {
                        "available_quantity.physical_length": rejected_quantity?.physical_length,
                        "available_quantity.physical_diameter": rejected_quantity?.physical_diameter,
                        "available_quantity.physical_cmt": rejected_quantity?.physical_cmt,
                    },
                },
                { session }
            );
            if (
                !update_issues_for_crosscutting_item_quantity.acknowledged ||
                update_issues_for_crosscutting_item_quantity.modifiedCount <= 0
            )
                return next(new ApiError("unable to update status", 400));
        } else {
            const { rejected_quantity, ...data } = rejected_crosscutting
            const add_issues_for_crosscutting_item = await issues_for_crosscutting_model.create([
                {
                    ...data,
                    available_quantity: rejected_quantity
                }
            ], { session })

            if (!add_issues_for_crosscutting_item?.[0]) return next(new ApiError("unable to add issue for crosscutting", 400));
        }

        const deleted_rejected_crosscutting =
            await rejected_crosscutting_model.deleteOne(
                {
                    _id: rejected_crosscutting?._id,
                },
                { session }
            );

        if (
            !deleted_rejected_crosscutting.acknowledged ||
            deleted_rejected_crosscutting.deletedCount <= 0
        )
            return next(new ApiError("Unable to revert issue for crosscutting", 400));

        await session.commitTransaction();
        session.endSession();
        return res
            .status(200)
            .json(new ApiResponse(StatusCodes.OK, "Reverted successfully"));
    } catch (error) {
        console.log(error);
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});

export const add_rejected_issues_for_crosscutting = catchAsync(async function (req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const issue_for_crosscutting_id = req.params?.issue_for_crosscutting_id;
        const created_by = req.userDetails?.id;

        const issues_for_crosscutting_data = await issues_for_crosscutting_model.findOne({
            _id: issue_for_crosscutting_id,
        })
        .select({created_by:0,createdAt:0,updatedAt:0})
        .lean();

        if(!issues_for_crosscutting_data) return next(new ApiError("Issue for crosscutting not found", 404));

        const { _id, available_quantity, ...data } = issues_for_crosscutting_data;

        const add_rejected_crosscutting_item = await rejected_crosscutting_model.create([
            {
                ...data,
                rejected_quantity: available_quantity,
                created_by:created_by
            }
        ], { session })

        if (!add_rejected_crosscutting_item?.[0]) return next(new ApiError("unable to add issue for crosscutting", 400));

        const delete_issues_for_crosscutting_item = await issues_for_crosscutting_model.deleteOne({
            _id: issue_for_crosscutting_id,
        }, { session });

        if (!delete_issues_for_crosscutting_item.acknowledged || delete_issues_for_crosscutting_item.deletedCount <= 0) return next(new ApiError("Unable to reject issue for crosscutting", 400));

        await session.commitTransaction();
        session.endSession();
        return res.status(200).json(new ApiResponse(StatusCodes.OK, "Rejected successfully"));
    } catch (error) {
        console.log(error);
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});