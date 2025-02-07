import mongoose from "mongoose";
import catchAsync from "../../../utils/errors/catchAsync.js"
import ApiError from "../../../utils/errors/apiError.js";
import { StatusCodes } from "../../../utils/constants.js";
import { veneer_inventory_invoice_model, veneer_inventory_items_model } from "../../../database/schema/inventory/venner/venner.schema.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { issues_for_smoking_dying_model } from "../../../database/schema/factory/smoking_dying/issues_for_smoking_dying.schema.js";
import { issues_for_status } from "../../../database/Utils/constants/constants.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";

export const add_issue_for_smoking_dying_from_veneer_inventory = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { veneer_inventory_ids } = req.body;
        const userDetails = req.userDetails;
        if (!veneer_inventory_ids || (Array.isArray(veneer_inventory_ids) && veneer_inventory_ids?.length <= 0)) {
            throw new ApiError("veneer_inventory_ids is required", StatusCodes.BAD_REQUEST);
        }
        if (!Array.isArray(veneer_inventory_ids)) {
            throw new ApiError("veneer_inventory_ids must be array", StatusCodes.BAD_REQUEST);
        }

        const fetch_veneer_inventory_data = await veneer_inventory_items_model.find({
            _id: { $in: veneer_inventory_ids },
            issue_status: null,
        }).lean();

        if (!fetch_veneer_inventory_data || fetch_veneer_inventory_data?.length <= 0) {
            throw new ApiError("veneer inventory items not found", StatusCodes.NOT_FOUND);
        }

        const veneer_invoice_ids = new Set();
        const issues_for_smoking_dying_data = fetch_veneer_inventory_data?.map((item) => {
            veneer_invoice_ids.add(item?.invoice_id);
            return {
                veneer_inventory_id: item?._id,
                item_name: item?.item_name,
                item_name_id: item?.item_id,
                log_no_code: item?.log_code,
                length: item?.length,
                width: item?.width,
                height: item?.height,
                thickness: item?.thickness,
                no_of_leaves: item?.number_of_leaves,
                sqm: item?.total_sq_meter,
                bundle_number: item?.bundle_number,
                pallet_number: item?.pallet_number,
                color_id: item?.color?.color_id,
                color_name: item?.color?.color_name,
                series_id: item?.series_id,
                series_name: item?.series_name,
                grade_id: item?.grades_id,
                grade_name: item?.grades_name,
                amount: item?.amount,
                expense_amount: item?.expense_amount,
                issued_from: issues_for_status?.veneer,
                remark: item?.remark,
                created_by: userDetails?._id,
                updated_by: userDetails?._id,
            }
        });

        //add data to issue for smoking dying
        const insert_issues_for_smoking_dying_data = await issues_for_smoking_dying_model.insertMany(issues_for_smoking_dying_data, { session });

        if (!insert_issues_for_smoking_dying_data || insert_issues_for_smoking_dying_data?.length <= 0) {
            throw new ApiError("Failed to add data for issues for smoking dying", StatusCodes.INTERNAL_SERVER_ERROR);
        }

        // update issue status in veneer inventory to smoking_dying
        const veneer_inventory_items_ids = insert_issues_for_smoking_dying_data.map((e) => e.veneer_inventory_id);
        const update_veneer_inventory_issue_status = await veneer_inventory_items_model.updateMany(
            { _id: { $in: veneer_inventory_items_ids } },
            {
                $set: {
                    issue_status: issues_for_status?.smoking_dying,
                }
            },
            { session }
        );

        if (update_veneer_inventory_issue_status?.matchedCount <= 0) {
            throw new ApiError('Not found veneer inventory item');
        }

        if (
            !update_veneer_inventory_issue_status.acknowledged ||
            update_veneer_inventory_issue_status?.modifiedCount <= 0
        ) {
            throw new ApiError('Unable to change status of veneer inventory item');
        }

        //updating veneer inventory invoice: if any one of veneer item send for peeling then invoice should not editable
        const update_veneer_inventory_invoice_editable =
            await veneer_inventory_invoice_model.updateMany(
                { _id: { $in: [...veneer_invoice_ids] } },
                {
                    $set: {
                        isEditable: false,
                    },
                },
                { session }
            );

        if (update_veneer_inventory_invoice_editable?.modifiedCount <= 0) {
            throw new ApiError('Not found veneer inventory invoice');
        }

        if (
            !update_veneer_inventory_invoice_editable.acknowledged ||
            update_veneer_inventory_invoice_editable?.modifiedCount <= 0
        ) {
            throw new ApiError('Unable to change status of veneer inventory invoice');
        }

        await session.commitTransaction();
        const response = new ApiResponse(
            StatusCodes.CREATED,
            'Issue for smoking-dying added successfully',
            insert_issues_for_smoking_dying_data
        );
        return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});

export const listing_issued_for_smoking_dying = catchAsync(async (req, res, next) => {
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

    // Aggregation stage
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

    const issue_for_smoking_dying =
        await issues_for_smoking_dying_model.aggregate(listAggregate);

    const aggCount = {
        $count: 'totalCount',
    }; // count aggregation stage

    const totalAggregate = [
        aggCreatedByLookup,
        aggCreatedByUnwind,
        aggUpdatedByLookup,
        aggUpdatedByUnwind,
        aggMatch,
        aggCount,
    ]; // total aggregation pipiline

    const totalDocument =
        await issues_for_smoking_dying_model.aggregate(totalAggregate);

    const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
        200,
        'Issue For smoking dying Data Fetched Successfully',
        {
            data: issue_for_smoking_dying,
            totalPages: totalPages,
        }
    );
    return res.status(200).json(response);
});

export const fetch_single_issued_for_smoking_dying_item = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) {
        return next(new ApiError('Invaild Id', StatusCodes.NOT_FOUND));
    }

    // Aggregation stage
    const aggMatch = {
        $match: { _id: mongoose.Types.ObjectId.createFromHexString(id) },
    };
    // const aggCreatedByLookup = {
    //   $lookup: {
    //     from: 'users',
    //     localField: 'created_by',
    //     foreignField: '_id',
    //     pipeline: [
    //       {
    //         $project: {
    //           user_name: 1,
    //           user_type: 1,
    //           dept_name: 1,
    //           first_name: 1,
    //           last_name: 1,
    //           email_id: 1,
    //           mobile_no: 1,
    //         },
    //       },
    //     ],
    //     as: 'created_by',
    //   },
    // };
    // const aggUpdatedByLookup = {
    //   $lookup: {
    //     from: 'users',
    //     localField: 'updated_by',
    //     foreignField: '_id',
    //     pipeline: [
    //       {
    //         $project: {
    //           user_name: 1,
    //           user_type: 1,
    //           dept_name: 1,
    //           first_name: 1,
    //           last_name: 1,
    //           email_id: 1,
    //           mobile_no: 1,
    //         },
    //       },
    //     ],
    //     as: 'updated_by',
    //   },
    // };
    // const aggCreatedByUnwind = {
    //   $unwind: {
    //     path: '$created_by',
    //     preserveNullAndEmptyArrays: true,
    //   },
    // };
    // const aggUpdatedByUnwind = {
    //   $unwind: {
    //     path: '$updated_by',
    //     preserveNullAndEmptyArrays: true,
    //   },
    // };

    const listAggregate = [
        aggMatch,
        // aggCreatedByLookup,
        // aggCreatedByUnwind,
        // aggUpdatedByLookup,
        // aggUpdatedByUnwind,
    ]; // aggregation pipiline

    const issue_for_smoking_dying =
        await issues_for_smoking_dying_model.aggregate(listAggregate);

    const response = new ApiResponse(
        StatusCodes.OK,
        'Issued for Smoking Dying Item Fetched Sucessfully',
        issue_for_smoking_dying?.[0]
    );
    return res.status(StatusCodes.OK).json(response);
});

export const revert_issued_for_smoking_dying_item = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            throw new ApiError("Invalid Id", StatusCodes.BAD_REQUEST)
        }

        const fetch_issue_for_smoking_dying_data = await issues_for_smoking_dying_model.findOne({ _id: id }).lean();
        if (!fetch_issue_for_smoking_dying_data) {
            throw new ApiError("Issue for Smoking Dying Item Not Found", StatusCodes.NOT_FOUND)
        }

        const revert_to_veneer_inventory = async function () {
            const veneer_inventory_item_id = fetch_issue_for_smoking_dying_data?.veneer_inventory_id;
            const update_document = await veneer_inventory_items_model.findOneAndUpdate(
                { _id: veneer_inventory_item_id },
                {
                    $set: {
                        issue_status: null
                    }
                },
                { new: true, session }
            );

            if (!update_document) {
                throw new ApiError("Veneer Inventory Item Not Found", StatusCodes.NOT_FOUND)
            }

            const veneer_invoice_id = update_document?.invoice_id;
            const is_invoice_editable = await veneer_inventory_items_model.find({
                _id: { $ne: veneer_inventory_item_id },
                invoice_id: veneer_invoice_id,
                issue_status: { $ne: null }
            }).lean();

            if (is_invoice_editable && is_invoice_editable?.length <= 0) {
                await veneer_inventory_invoice_model.updateOne(
                    { _id: veneer_invoice_id },
                    {
                        $set: {
                            isEditable: true,
                        },
                    },
                    { session }
                );
            }

        }
        const revert_to_dressing_done = async function () { }

        if (fetch_issue_for_smoking_dying_data?.veneer_inventory_id !== null && issues_for_status?.veneer) {
            await revert_to_veneer_inventory();
        } else if (fetch_issue_for_smoking_dying_data?.dressing_done_id !== null && issues_for_status?.dressing) {
            await revert_to_dressing_done();
        } else {
            throw new ApiError("No data found to revert item", StatusCodes.BAD_REQUEST)
        }


        // delete reverted items
        const delete_response = await issues_for_smoking_dying_model.deleteOne(
            { _id: fetch_issue_for_smoking_dying_data?._id },
            { session }
        );
        if (!delete_response?.acknowledged || delete_response?.deletedCount === 0) {
            throw new ApiError(
                'Failed to Revert Items',
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }

        const response = new ApiResponse(
            StatusCodes.OK,
            'Items Reverted Successfully',
            delete_response
        );
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});