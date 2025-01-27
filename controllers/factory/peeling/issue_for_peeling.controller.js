import {
    log_inventory_invoice_model,
    log_inventory_items_model,
    log_inventory_items_view_model,
} from '../../../database/schema/inventory/log/log.schema.js';
import ApiError from '../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../utils/constants.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';
import mongoose from 'mongoose';
import issue_for_peeling_model from '../../../database/schema/factory/peeling/issues_for_peeling.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { crosscutting_done_model, crossCuttingsDone_view_modal } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';

export const addIssueForPeelingFromLogInventory = catchAsync(
    async function (req, res, next) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const userDetails = req.userDetails;
            const { log_inventory_item_ids } = req.body;

            if (
                !Array.isArray(log_inventory_item_ids) ||
                log_inventory_item_ids.length === 0
            ) {
                return next(new ApiError('log_inventory_item_ids must be a array field'));
            }

            const logInventoryItemData = await log_inventory_items_view_model
                .find({
                    _id: { $in: log_inventory_item_ids },
                    issue_status: null,
                })
                .lean();

            if (logInventoryItemData?.length <= 0) {
                return next(
                    new ApiError(
                        'Log Inventory Item Data Not Found',
                        StatusCodes.NOT_FOUND
                    )
                );
            }

            const issue_for_peeling_data = logInventoryItemData?.map(
                (logInventoryItem) => {
                    return {
                        log_inventory_item_id: logInventoryItem?._id,
                        crosscut_done_id: null,
                        inward_sr_no: logInventoryItem?.log_invoice_details?.inward_sr_no,
                        inward_date: logInventoryItem?.log_invoice_details?.inward_date,
                        invoice_date:
                            logInventoryItem?.log_invoice_details?.invoice_Details
                                ?.invoice_date,
                        invoice_no:
                            logInventoryItem?.log_invoice_details?.invoice_Details
                                ?.invoice_no,
                        item_sr_no: logInventoryItem?.item_sr_no,
                        item_id: logInventoryItem?.item_id,
                        item_name: logInventoryItem?.item_name,
                        color: logInventoryItem?.color,
                        item_sub_category_id: logInventoryItem?.item_sub_category_id,
                        item_sub_category_name: logInventoryItem?.item_sub_category_name,
                        log_no: logInventoryItem?.log_no,
                        code: logInventoryItem?.log_no,
                        log_no_code: logInventoryItem?.log_no,
                        log_formula: logInventoryItem?.log_formula,
                        length: logInventoryItem?.physical_length,
                        diameter: logInventoryItem?.physical_diameter,
                        cmt: logInventoryItem?.physical_cmt,
                        amount: logInventoryItem?.amount,
                        amount_factor: 1,
                        expense_amount: logInventoryItem?.expense_amount,
                        issued_from: issues_for_status?.log,
                        invoice_id: logInventoryItem?.invoice_id,
                        remark: logInventoryItem?.remark,
                        created_by: userDetails?._id,
                        updated_by: userDetails?._id,
                    };
                }
            );

            const add_issue_for_peeling = await issue_for_peeling_model.insertMany(
                issue_for_peeling_data,
                { session }
            );

            if (add_issue_for_peeling?.length <= 0) {
                return next(new ApiError('Failed to data for issue for peeling', 400));
            }
            const log_item_ids = add_issue_for_peeling?.map(
                (ele) => ele?.log_inventory_item_id
            );
            const log_invoice_ids = [
                ...new Set(add_issue_for_peeling.map((issue) => issue.invoice_id)),
            ];

            //updating log inventory item status to peeling
            const update_log_inventory_item_status =
                await log_inventory_items_model.updateMany(
                    { _id: { $in: log_item_ids } },
                    {
                        $set: {
                            issue_status: issues_for_status.peeling,
                        },
                    },
                    { session }
                );

            if (update_log_inventory_item_status?.matchedCount <= 0) {
                return next(new ApiError('Not found log inventory item'));
            }

            if (
                !update_log_inventory_item_status.acknowledged ||
                update_log_inventory_item_status?.modifiedCount <= 0
            ) {
                return next(
                    new ApiError('Unable to change status of log inventory item')
                );
            }

            //updating log inventory invoice: if any one of log item send for peeling then invoice should not editable
            const update_log_inventory_invoice_editable =
                await log_inventory_invoice_model.updateMany(
                    { _id: { $in: log_invoice_ids } },
                    {
                        $set: {
                            isEditable: false,
                        },
                    },
                    { session }
                );

            if (update_log_inventory_invoice_editable?.modifiedCount <= 0) {
                return next(new ApiError('Not found log inventory invoice'));
            }

            if (
                !update_log_inventory_invoice_editable.acknowledged ||
                update_log_inventory_invoice_editable?.modifiedCount <= 0
            ) {
                return next(
                    new ApiError('Unable to change status of log inventory invoice')
                );
            }

            await session.commitTransaction();

            const response = new ApiResponse(
                StatusCodes.CREATED,
                'Issue for peeling added successfully',
                add_issue_for_peeling
            );

            return res.status(StatusCodes.CREATED).json(response);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }
);

export const addIssueForPeelingFromCrosscutDone = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userDetails = req.userDetails;
        const { crosscut_done_ids } = req.body;

        if (
            !Array.isArray(crosscut_done_ids) ||
            crosscut_done_ids.length === 0
        ) {
            return next(new ApiError('crosscut_done_ids must be a array field'));
        }

        const aggMatch = {
            $match: {
                _id: { $in: crosscut_done_ids?.map((ele) => mongoose.Types.ObjectId.createFromHexString(ele)) },
                issue_status: null
            }
        }
        const aggLookupInvoice = {
            $lookup: {
                from: 'log_inventory_invoice_details',
                localField: 'issuedCrossCuttingDetails.invoice_id',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            inward_sr_no: 1,
                            inward_date: 1,
                            "invoice_Details.invoice_date": 1,
                            "invoice_Details.invoice_no": 1,
                        }
                    }
                ],
                as: 'log_inventory_invoice_details'
            }
        }
        const aggUnwindInvoice = {
            $unwind: {
                path: "$log_inventory_invoice_details",
                preserveNullAndEmptyArrays: true
            }
        }
        const aggProject = {
            $project: {
                issue_for_crosscutting_id: 1,
                log_inventory_item_id: 1,
                log_no: 1,
                code: 1,
                log_no_code: 1,
                length: 1,
                girth: 1,
                crosscut_cmt: 1,
                cost_amount: 1,
                per_cmt_cost: 1,
                expense_amount: 1,
                issuedCrossCuttingDetails: {
                    item_sr_no: 1,
                    supplier_item_name: 1,
                    supplier_log_no: 1,
                    item_id: 1,
                    item_name: 1,
                    color: {
                        color_id: 1,
                        color_name: 1
                    },
                    item_sub_category_id: 1,
                    item_sub_category_name: 1,
                    log_formula: 1
                },
                log_inventory_invoice_details: 1
            }
        }
        const crosscut_done_data = await crossCuttingsDone_view_modal.aggregate([
            aggMatch,
            aggLookupInvoice,
            aggUnwindInvoice,
            aggProject
        ])

        if (crosscut_done_data?.length <= 0) {
            return next(new ApiError('No Crosscut done data found', 400));
        }

        const issue_for_peeling_data = crosscut_done_data?.map((crosscutDone) => {
            return {
                log_inventory_item_id: crosscutDone?.log_inventory_item_id,
                crosscut_done_id: crosscutDone?._id,
                inward_sr_no: crosscutDone?.log_inventory_invoice_details?.inward_sr_no,
                inward_date: crosscutDone?.log_inventory_invoice_details?.inward_date,
                invoice_date: crosscutDone?.log_inventory_invoice_details?.invoice_Details?.invoice_date,
                invoice_no: crosscutDone?.log_inventory_invoice_details?.invoice_Details?.invoice_no,
                item_sr_no: crosscutDone?.issuedCrossCuttingDetails?.item_sr_no,
                item_id: crosscutDone?.issuedCrossCuttingDetails?.item_id,
                item_name: crosscutDone?.issuedCrossCuttingDetails?.item_name,
                color: crosscutDone?.issuedCrossCuttingDetails?.color,
                item_sub_category_id: crosscutDone?.issuedCrossCuttingDetails?.item_sub_category_id,
                item_sub_category_name: crosscutDone?.issuedCrossCuttingDetails?.item_sub_category_name,
                log_no: crosscutDone?.log_no,
                code: crosscutDone?.code,
                log_no_code: crosscutDone?.log_no_code,
                log_formula: crosscutDone?.issuedCrossCuttingDetails?.log_formula,
                length: crosscutDone?.length,
                diameter: crosscutDone?.girth,
                cmt: crosscutDone?.crosscut_cmt,
                amount: crosscutDone?.cost_amount,
                amount_factor: 1,
                expense_amount: crosscutDone?.expense_amount,
                issued_from: issues_for_status?.crosscut_done,
                invoice_id: crosscutDone?.log_inventory_invoice_details?._id,
                remark: crosscutDone?.remarks,
                created_by: userDetails?._id,
                updated_by: userDetails?._id,
            };
        });

        const add_issue_for_peeling = await issue_for_peeling_model.insertMany(
            issue_for_peeling_data,
            { session }
        );

        if (add_issue_for_peeling?.length <= 0) {
            return next(new ApiError('Failed to data for issue for peeling', 400));
        }

        const crosscut_done_issue_ids = add_issue_for_peeling.map((ele) => ele?.crosscut_done_id);
        const issue_for_crosscutting_ids = [...new Set(crosscut_done_data.map((ele) => ele?.issue_for_crosscutting_id))];

        //updating crosscut done status to peeling
        const update_crosscut_done_status =
            await crosscutting_done_model.updateMany(
                { _id: { $in: crosscut_done_issue_ids } },
                {
                    $set: {
                        issue_status: issues_for_status.peeling,
                    },
                },
                { session }
            );

        if (update_crosscut_done_status?.matchedCount <= 0) {
            return next(new ApiError('Not found crosscut done'));
        }

        if (
            !update_crosscut_done_status.acknowledged ||
            update_crosscut_done_status?.modifiedCount <= 0
        ) {
            return next(
                new ApiError('Unable to change status of crosscut done')
            );
        }

        //updating crosscut done: if any one of item send for peeling then whole with same issue_for_crosscutting_id should not editable
        const update_crosscut_done_editable =
            await crosscutting_done_model.updateMany(
                { issue_for_crosscutting_id: { $in: issue_for_crosscutting_ids } },
                {
                    $set: {
                        isEditable: false,
                    },
                },
                { session }
            );

        if (update_crosscut_done_editable?.modifiedCount <= 0) {
            return next(new ApiError('Not found issue for crosscutting,crosscut done'));
        }

        if (
            !update_crosscut_done_editable.acknowledged ||
            update_crosscut_done_editable?.modifiedCount <= 0
        ) {
            return next(
                new ApiError('Unable to change status of editable,crosscut done')
            );
        }

        await session.commitTransaction();

        const response = new ApiResponse(
            StatusCodes.CREATED,
            'Issue for peeling added successfully',
            add_issue_for_peeling
        );

        return res.status(StatusCodes.CREATED).json(response);

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
})