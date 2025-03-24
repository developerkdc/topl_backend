import mongoose, { isValidObjectId, set } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { issues_for_status, item_issued_from } from '../../../../database/Utils/constants/constants.js';
import { plywood_inventory_invoice_details, plywood_inventory_items_details } from '../../../../database/schema/inventory/Plywood/plywood.schema.js';
import issue_for_plywood_resizing_model from '../../../../database/schema/factory/plywood_resizing_factory/issue_for_resizing/issue_for_resizing.schema.js';
import plywood_history_model from '../../../../database/schema/inventory/Plywood/plywood.history.schema.js';

export const add_issue_for_resizing_from_plywood = catchAsync(async (req, res) => {
    const userDetails = req.userDetails;
    const { plywood_item_id, issued_sheets } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        for (let field of ["plywood_item_id", "issued_sheets"]) {
            if (!req.body[field]) {
                throw new ApiError(`${field} is missing...`, StatusCodes.BAD_REQUEST)
            };
        }
        const { _id, ...plywood_item_details } = await plywood_inventory_items_details.findOne({ _id: plywood_item_id, issue_status: null, available_sheets: { $ne: 0 } }).lean();
        if (!plywood_item_details) {
            throw new ApiError("Plywood Items not found.", StatusCodes.BAD_REQUEST)
        };
        if (plywood_item_details?.available_sheets === 0) {
            throw new ApiError("No available sheets found", StatusCodes.BAD_REQUEST)
        }

        const factor = Number(issued_sheets / plywood_item_details?.available_sheets);
        const issued_sqm = Number((factor * plywood_item_details?.available_sqm)?.toFixed(3));
        const issued_amount = Number((factor * plywood_item_details?.available_amount).toFixed(2));

        const issue_for_resize_data = {
            ...plywood_item_details,
            plywood_item_id: _id,
            no_of_sheets: issued_sheets,
            sqm: issued_sqm,
            amount: issued_amount,
            issued_from: item_issued_from?.plywood,
            remark: plywood_item_details?.remark,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
            amount_factor: 1,
            expense_amount: plywood_item_details?.expense_amount
        }


        const insert_issue_for_resize_result = await issue_for_plywood_resizing_model.create([issue_for_resize_data], { session });


        if (insert_issue_for_resize_result?.length === 0) {
            throw new ApiError("Failed to add issue for resize data", StatusCodes.BAD_REQUEST)
        };

        const plywood_inventory_item_id = insert_issue_for_resize_result?.[0]?.plywood_item_id;

        const update_inventory_item_issue_status_result = await plywood_inventory_items_details.updateOne({ _id: plywood_inventory_item_id }, {
            $inc: {
                available_sheets: -issued_sheets,
                available_amount: -issued_amount,
                available_sqm: -issued_sqm
            }, $set: {
                // issue_status: issues_for_status?.plywood_resizing,
                updated_by: userDetails?._id
            }
        }, { session });

        if (!update_inventory_item_issue_status_result?.matchedCount === 0) {
            throw new ApiError("Plywood item not found.", StatusCodes.BAD_REQUEST)
        }
        if (!update_inventory_item_issue_status_result?.acknowledged || update_inventory_item_issue_status_result?.modifiedCount === 0) {
            throw new ApiError("Failed to update plywood item issue status", StatusCodes.BAD_REQUEST)
        }
        const update_inventory_item_invoice_editable_status_result = await plywood_inventory_invoice_details.updateOne({ _id: plywood_item_details?.invoice_id }, {
            $set: {
                isEditable: false,
                updated_by: userDetails?._id
            }
        }, { session });

        if (update_inventory_item_invoice_editable_status_result?.matchedCount === 0) {
            throw new ApiError("Plywood items invoice not found", StatusCodes.BAD_REQUEST)
        }
        if (!update_inventory_item_invoice_editable_status_result?.acknowledged || update_inventory_item_invoice_editable_status_result.modifiedCount === 0) {
            throw new ApiError("Failed to update plywood items invoice status", StatusCodes.BAD_REQUEST)
        };

        const add_plywood_history = await plywood_history_model.create([{
            issue_status: issues_for_status?.plywood_resizing,
            issued_amount: issued_amount,
            issued_sheets: issued_sheets,
            issued_sqm: issued_sqm,
            plywood_item_id: _id,
            issued_for_order_id: null,
            created_by: userDetails?._id,
            updated_by: userDetails?._id
        }], { session });

        if (add_plywood_history?.length === 0) {
            throw new ApiError("Failed to create plywood item history", StatusCodes.BAD_REQUEST);
        };
        const response = new ApiResponse(StatusCodes.OK, "Item Issued Successfully", insert_issue_for_resize_result);
        await session?.commitTransaction();
        return res.status(StatusCodes.OK).json(response)

    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
})

export const revert_issue_for_resizing = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError("ID is missing", StatusCodes.BAD_REQUEST)
    }
    if (!isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
    };

    const userDetails = req.userDetails;
    const session = await mongoose.startSession()
    try {
        await session.startTransaction()
        const resizing_item_details = await issue_for_plywood_resizing_model.findById(id).lean();

        if (!resizing_item_details) {
            throw new ApiError("Issue for resizing item not found", StatusCodes.NOT_FOUND)
        };

        const update_plywood_inventory_item_status_result = await plywood_inventory_items_details.findOneAndUpdate({ _id: resizing_item_details?.plywood_item_id }, {
            $inc: {
                available_sheets: resizing_item_details?.no_of_sheets,
                available_amount: resizing_item_details?.amount,
                available_sqm: resizing_item_details?.sqm
            },
            $set: {
                // issue_status: null,
                updated_by: userDetails?._id
            }
        }, { session });

        if (!update_plywood_inventory_item_status_result) {
            throw new ApiError("Failed to update plywood item status", StatusCodes.BAD_REQUEST)
        };

        const is_invoice_editable = await plywood_inventory_items_details?.find({
            // _id: { $ne: update_plywood_item?._id },
            invoice_id: update_plywood_inventory_item_status_result?.invoice_id,
            // issue_status: { $ne: null },
            $expr: { $ne: ['$available_sheets', '$sheets'] },
        }).session(session);

        //if invoice is editable then update then update the editable status
        if (is_invoice_editable && is_invoice_editable?.length === 0) {
            const update_plywood_item_invoice_editable_status =
                await plywood_inventory_invoice_details?.updateOne(
                    { _id: resizing_item_details?.invoice_id },
                    {
                        $set: {
                            isEditable: true,
                            updated_by: this.userDetails?._id,
                        },
                    },
                    { session: this.session }
                );
            if (update_plywood_item_invoice_editable_status?.matchedCount === 0) {
                throw new ApiError(
                    'Plywood item Invoice not found',
                    StatusCodes.BAD_REQUEST
                );
            }
            if (
                !update_plywood_item_invoice_editable_status?.acknowledged ||
                update_plywood_item_invoice_editable_status?.modifiedCount === 0
            ) {
                throw new ApiError(
                    'Failed to update Plywood Item Invoice Status',
                    StatusCodes.BAD_REQUEST
                );
            }
        }


        const delete_issue_for_resizing_document_result = await issue_for_plywood_resizing_model.deleteOne({ _id: resizing_item_details?._id });

        if (!delete_issue_for_resizing_document_result?.acknowledged || delete_issue_for_resizing_document_result?.deletedCount === 0) {
            throw new ApiError("Failed to delete issue for resizing details", StatusCodes.BAD_REQUEST);
        }

        const response = new ApiResponse(StatusCodes.OK, "Item Reverted Successfully", delete_issue_for_resizing_document_result);
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response)

    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
})

export const listing_issued_for_resizing = catchAsync(
    async (req, res, next) => {
        const {
            page = 1,
            limit = 10,
            sortBy = 'updatedAt',
            sort = 'desc',
            search = '',
        } = req.query;
        const {
            string,
            boolean,
            numbers,
            arrayField = [],
        } = req?.body?.searchFields || {};
        const filter = req.body?.filter;

        let search_query = {};
        if (search != '' && req?.body?.searchFields) {
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
                    message: 'Results Not Found',
                });
            }
            search_query = search_data;
        }

        const filterData = dynamic_filter(filter);

        const match_query = {
            ...filterData,
            ...search_query,
        };

        const aggCreatedByLookup = {
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
        };
        const aggUpdatedByLookup = {
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
        };
        const aggCreatedByUnwind = {
            $unwind: {
                path: '$created_by',
                preserveNullAndEmptyArrays: true,
            },
        };
        const aggUpdatedByUnwind = {
            $unwind: {
                path: '$updated_by',
                preserveNullAndEmptyArrays: true,
            },
        };
        const aggMatch = {
            $match: {
                ...match_query,
            },
        };
        const aggSort = {
            $sort: {
                [sortBy]: sort === 'desc' ? -1 : 1,
            },
        };
        const aggSkip = {
            $skip: (parseInt(page) - 1) * parseInt(limit),
        };
        const aggLimit = {
            $limit: parseInt(limit),
        };

        const listAggregate = [
            aggCreatedByLookup,
            aggCreatedByUnwind,
            aggUpdatedByLookup,
            aggUpdatedByUnwind,
            aggMatch,
            aggSort,
            aggSkip,
            aggLimit,
        ]; // aggregation pipiline

        const issue_for_resizing =
            await issue_for_plywood_resizing_model.aggregate(listAggregate);

        const aggCount = {
            $count: 'totalCount',
        }; // count aggregation stage

        const totalAggregate = [
            ...listAggregate?.slice(0, -2),
            aggCount,
        ]; // total aggregation pipiline

        const totalDocument =
            await issue_for_plywood_resizing_model.aggregate(totalAggregate);

        const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

        const response = new ApiResponse(
            200,
            'Issue For Resizing Data Fetched Successfully',
            {
                data: issue_for_resizing,
                totalPages: totalPages,
            }
        );
        return res.status(200).json(response);
    }
);

export const fetch_single_issue_for_resizing_item = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError("ID is missing", StatusCodes.NOT_FOUND)
    };
    if (!isValidObjectId(id)) {
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
    };

    const result = await issue_for_plywood_resizing_model.findOne({ _id: id }).lean();

    if (!result) {
        throw new ApiError("Issue for resizing data not found", StatusCodes.NOT_FOUND)
    };

    const response = new ApiResponse(StatusCodes.OK, "Resizing Details fetched successfully", result);
    return res.status(StatusCodes.OK).json(response)
})