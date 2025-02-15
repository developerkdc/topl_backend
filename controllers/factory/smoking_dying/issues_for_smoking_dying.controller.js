import mongoose, { mongo } from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import { StatusCodes } from '../../../utils/constants.js';
import {
  veneer_inventory_invoice_model,
  veneer_inventory_items_model,
} from '../../../database/schema/inventory/venner/venner.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import {
  issues_for_smoking_dying_model,
  issues_for_smoking_dying_view_model,
} from '../../../database/schema/factory/smoking_dying/issues_for_smoking_dying.schema.js';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import {
  dressing_done_items_model,
  dressing_done_other_details_model,
} from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import dressing_done_history_model from '../../../database/schema/factory/dressing/dressing_done/dressing.done.history.schema.js';

export const add_issue_for_smoking_dying_from_veneer_inventory = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { veneer_inventory_ids } = req.body;
      const userDetails = req.userDetails;
      if (
        !veneer_inventory_ids ||
        (Array.isArray(veneer_inventory_ids) &&
          veneer_inventory_ids?.length <= 0)
      ) {
        throw new ApiError(
          'veneer_inventory_ids is required',
          StatusCodes.BAD_REQUEST
        );
      }
      if (!Array.isArray(veneer_inventory_ids)) {
        throw new ApiError(
          'veneer_inventory_ids must be array',
          StatusCodes.BAD_REQUEST
        );
      }

      const fetch_veneer_inventory_data = await veneer_inventory_items_model
        .find({
          _id: { $in: veneer_inventory_ids },
          issue_status: null,
        })
        .lean();

      if (
        !fetch_veneer_inventory_data ||
        fetch_veneer_inventory_data?.length <= 0
      ) {
        throw new ApiError(
          'veneer inventory items not found',
          StatusCodes.NOT_FOUND
        );
      }

      const veneer_invoice_ids = new Set();
      const unique_identifier = new mongoose.Types.ObjectId();
      const issues_for_smoking_dying_data = fetch_veneer_inventory_data?.map(
        (item) => {
          veneer_invoice_ids.add(item?.invoice_id);
          return {
            unique_identifier: unique_identifier,
            veneer_inventory_id: item?._id,
            item_name: item?.item_name,
            item_name_id: item?.item_id,
            item_sub_category_id: item?.item_sub_category_id,
            item_sub_category_name: item?.item_sub_category_name,
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
          };
        }
      );

      //add data to issue for smoking dying
      const insert_issues_for_smoking_dying_data =
        await issues_for_smoking_dying_model.insertMany(
          issues_for_smoking_dying_data,
          { session }
        );

      if (
        !insert_issues_for_smoking_dying_data ||
        insert_issues_for_smoking_dying_data?.length <= 0
      ) {
        throw new ApiError(
          'Failed to add data for issues for smoking dying',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // update issue status in veneer inventory to smoking_dying
      const veneer_inventory_items_ids =
        insert_issues_for_smoking_dying_data.map((e) => e.veneer_inventory_id);
      const update_veneer_inventory_issue_status =
        await veneer_inventory_items_model.updateMany(
          { _id: { $in: veneer_inventory_items_ids } },
          {
            $set: {
              issue_status: issues_for_status?.smoking_dying,
            },
          },
          { session }
        );

      if (update_veneer_inventory_issue_status?.matchedCount <= 0) {
        throw new ApiError('veneer inventory item not found');
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
        throw new ApiError('veneer inventory invoice not found');
      }

      if (
        !update_veneer_inventory_invoice_editable.acknowledged ||
        update_veneer_inventory_invoice_editable?.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Unable to change status of veneer inventory invoice'
        );
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
  }
);

export const add_issue_for_smoking_dying_from_dressing_done_factory =
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { dressing_done_ids, dressing_done_other_details_id } = req.body;
      const userDetails = req.userDetails;

      if (!dressing_done_other_details_id) {
        throw new ApiError(
          'Dressing Done other details is missing',
          StatusCodes.NOT_FOUND
        );
      }
      if (
        !dressing_done_ids ||
        (Array.isArray(dressing_done_ids) && dressing_done_ids?.length <= 0)
      ) {
        throw new ApiError(
          'dressing_done_ids is required',
          StatusCodes.BAD_REQUEST
        );
      }
      if (!Array.isArray(dressing_done_ids)) {
        throw new ApiError(
          'dressing_done_ids must be array',
          StatusCodes.BAD_REQUEST
        );
      }

      const fetch_dressing_done_data = await dressing_done_items_model
        .find({
          _id: { $in: dressing_done_ids },
          issue_status: null,
        })
        .lean();

      if (!fetch_dressing_done_data || fetch_dressing_done_data?.length <= 0) {
        throw new ApiError(
          'dressing done items not found',
          StatusCodes.NOT_FOUND
        );
      }
      // const dressing_done_other_details_ids = new Set();
      const unique_identifier = new mongoose.Types.ObjectId();
      const issues_for_smoking_dying_data = fetch_dressing_done_data?.map(
        (item) => {
          // dressing_done_other_details_ids.add(item?.dressing_done_other_details_id);
          return {
            unique_identifier: unique_identifier,
            dressing_done_id: item?._id,
            item_name: item?.item_name,
            item_name_id: item?.item_name_id,
            item_sub_category_id: item?.item_sub_category_id,
            item_sub_category_name: item?.item_sub_category_name,
            log_no_code: item?.log_no_code,
            length: item?.length,
            width: item?.width,
            height: item?.height,
            thickness: item?.thickness,
            no_of_leaves: item?.no_of_leaves,
            sqm: item?.total_sq_meter,
            bundle_number: item?.bundle_number,
            pallet_number: item?.pallet_number,
            color_id: item?.color?.color_id,
            color_name: item?.color?.color_name,
            series_id: item?.series_id,
            series_name: item?.series_name,
            grade_id: item?.grade_id,
            grade_name: item?.grade_name,
            amount: item?.amount,
            expense_amount: item?.expense_amount,
            issued_from: issues_for_status?.dressing,
            pattern_name: item?.pattern_name,
            pattern_id: item?.pattern_id,
            character_name: item?.character_name,
            character_id: item?.character_id,
            series_name: item?.series_name || null,
            series_id: item?.series_id || null,
            remark: item?.remark,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          };
        }
      );

      //add data to issue for smoking dying
      const insert_issues_for_smoking_dying_data =
        await issues_for_smoking_dying_model.insertMany(
          issues_for_smoking_dying_data,
          { session }
        );

      if (
        !insert_issues_for_smoking_dying_data ||
        insert_issues_for_smoking_dying_data?.length <= 0
      ) {
        throw new ApiError(
          'Failed to add data for issues for smoking dying',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // update issue status in dressing done items to smoking_dying
      const dressing_done_items_ids = insert_issues_for_smoking_dying_data.map(
        (e) => e?.dressing_done_id
      );
      const update_dressing_item_issue_status =
        await dressing_done_items_model.updateMany(
          { _id: { $in: dressing_done_items_ids } },
          {
            $set: {
              issue_status: issues_for_status?.smoking_dying,
            },
          },
          { session }
        );

      if (update_dressing_item_issue_status?.matchedCount <= 0) {
        throw new ApiError('Not found veneer inventory item');
      }

      if (
        !update_dressing_item_issue_status.acknowledged ||
        update_dressing_item_issue_status?.modifiedCount <= 0
      ) {
        throw new ApiError('Unable to change status of dressing done item');
      }

      //updating dressing done other details id:  if any one of dressing done item send for smoking/dying then it should not editable
      const update_dressing_done_other_details_editable_status =
        await dressing_done_other_details_model.updateOne(
          { _id: dressing_done_other_details_id },
          {
            $set: {
              isEditable: false,
            },
          },
          { session }
        );

      if (
        update_dressing_done_other_details_editable_status?.matchedCount <= 0
      ) {
        throw new ApiError('Dressing Done Other Details Document not found.');
      }

      if (
        !update_dressing_done_other_details_editable_status.acknowledged ||
        update_dressing_done_other_details_editable_status?.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Unable to change status of dressing done other details document'
        );
      }

      const history_data = {
        dressing_done_other_details_id: dressing_done_other_details_id,
        bundles: dressing_done_ids,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
      const add_dressing_done_items_to_dressing_history =
        await dressing_done_history_model.create([history_data], { session });

      if (add_dressing_done_items_to_dressing_history?.length === 0) {
        throw new ApiError(
          'Failed to add items to dressing done history',
          StatusCodes.BAD_REQUEST
        );
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

export const listing_issued_for_smoking_dying = catchAsync(
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

    // Aggregation stage
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

    const listAggregate = [aggMatch, aggSort, aggSkip, aggLimit]; // aggregation pipiline

    const issue_for_smoking_dying =
      await issues_for_smoking_dying_view_model.aggregate(listAggregate);

    const aggCount = {
      $count: 'totalCount',
    }; // count aggregation stage

    const totalAggregate = [aggMatch, aggCount]; // total aggregation pipiline

    const totalDocument =
      await issues_for_smoking_dying_view_model.aggregate(totalAggregate);

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
  }
);

export const fetch_single_issued_for_smoking_dying_item = catchAsync(
  async (req, res, next) => {
    const { unique_identifier, pallet_number } = req.params;

    // Aggregation stage
    const aggMatch = {
      $match: {
        _id: {
          unique_identifier:
            mongoose.Types.ObjectId.createFromHexString(unique_identifier),
          pallet_number: pallet_number,
        },
      },
    };

    const listAggregate = [aggMatch]; // aggregation pipiline

    const issue_for_smoking_dying =
      await issues_for_smoking_dying_view_model.aggregate(listAggregate);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Issued for Smoking Dying Fetched Sucessfully',
      issue_for_smoking_dying?.[0]
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

// export const revert_issued_for_smoking_dying_item = catchAsync(async (req, res, next) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//         const { id } = req.params;
//         if (!mongoose.isValidObjectId(id)) {
//             throw new ApiError("Invalid Id", StatusCodes.BAD_REQUEST)
//         }

//         const fetch_issue_for_smoking_dying_data = await issues_for_smoking_dying_model.findOne({ _id: id }).lean();
//         if (!fetch_issue_for_smoking_dying_data) {
//             throw new ApiError("Issue for Smoking Dying Item Not Found", StatusCodes.NOT_FOUND)
//         }

//         const revert_to_veneer_inventory = async function () {
//             const veneer_inventory_item_id = fetch_issue_for_smoking_dying_data?.veneer_inventory_id;
//             const update_document = await veneer_inventory_items_model.findOneAndUpdate(
//                 { _id: veneer_inventory_item_id },
//                 {
//                     $set: {
//                         issue_status: null
//                     }
//                 },
//                 { new: true, session }
//             );

//             if (!update_document) {
//                 throw new ApiError("Veneer Inventory Item Not Found", StatusCodes.NOT_FOUND)
//             }

//             const veneer_invoice_id = update_document?.invoice_id;
//             const is_invoice_editable = await veneer_inventory_items_model.find({
//                 _id: { $ne: veneer_inventory_item_id },
//                 invoice_id: veneer_invoice_id,
//                 issue_status: { $ne: null }
//             }).lean();

//             if (is_invoice_editable && is_invoice_editable?.length <= 0) {
//                 await veneer_inventory_invoice_model.updateOne(
//                     { _id: veneer_invoice_id },
//                     {
//                         $set: {
//                             isEditable: true,
//                         },
//                     },
//                     { session }
//                 );
//             }

//         }
//         const revert_to_dressing_done = async function () { }

//         if (fetch_issue_for_smoking_dying_data?.veneer_inventory_id !== null && issues_for_status?.veneer) {
//             await revert_to_veneer_inventory();
//         } else if (fetch_issue_for_smoking_dying_data?.dressing_done_id !== null && issues_for_status?.dressing) {
//             await revert_to_dressing_done();
//         } else {
//             throw new ApiError("No data found to revert item", StatusCodes.BAD_REQUEST)
//         }

//         // delete reverted items
//         const delete_response = await issues_for_smoking_dying_model.deleteOne(
//             { _id: fetch_issue_for_smoking_dying_data?._id },
//             { session }
//         );
//         if (!delete_response?.acknowledged || delete_response?.deletedCount === 0) {
//             throw new ApiError(
//                 'Failed to Revert Items',
//                 StatusCodes.INTERNAL_SERVER_ERROR
//             );
//         }

//         const response = new ApiResponse(
//             StatusCodes.OK,
//             'Items Reverted Successfully',
//             delete_response
//         );
//         await session.commitTransaction();
//         return res.status(StatusCodes.OK).json(response);
//     } catch (error) {
//         await session.abortTransaction();
//         throw error;
//     } finally {
//         await session.endSession();
//     }
// });

export const revert_issued_for_smoking_dying_item = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { unique_identifier, pallet_number } = req.params;
      if (!pallet_number || !unique_identifier) {
        throw new ApiError(
          'pallet_number or unique_identifier is required',
          StatusCodes.BAD_REQUEST
        );
      }

      const issue_for_smoking_dying =
        await issues_for_smoking_dying_view_model.aggregate([
          {
            $match: {
              _id: {
                unique_identifier:
                  mongoose.Types.ObjectId.createFromHexString(
                    unique_identifier
                  ),
                pallet_number: pallet_number,
              },
            },
          },
        ]);
      if (!issue_for_smoking_dying || !issue_for_smoking_dying?.[0]) {
        throw new ApiError('No Data Found', StatusCodes.BAD_GATEWAY);
      }

      if (issue_for_smoking_dying?.[0]?.is_smoking_dying_done) {
        throw new ApiError('Cannot revert issue for smoking dying');
      }

      const bundle_list = issue_for_smoking_dying?.[0]?.bundles;

      const veneer_inventory_ids = bundle_list
        ?.filter(
          (item) =>
            item?.veneer_inventory_id !== null &&
            item.issued_from === issues_for_status?.veneer
        )
        ?.map((item) =>
          mongoose.Types.ObjectId.createFromHexString(
            item?.veneer_inventory_id?.toString()
          )
        );

      const dressing_done_ids = bundle_list
        ?.filter(
          (item) =>
            item?.dressing_done_id !== null &&
            item.issued_from === issues_for_status?.dressing
        )
        ?.map((item) =>
          mongoose.Types.ObjectId.createFromHexString(
            item?.dressing_done_id?.toString()
          )
        );

      const revert_to_veneer_inventory = async function () {
        // Update documents
        const update_veneer_item =
          await veneer_inventory_items_model.updateMany(
            { _id: { $in: veneer_inventory_ids } },
            { $set: { issue_status: null } },
            { session }
          );

        if (update_veneer_item.matchedCount <= 0) {
          throw new ApiError(
            'Not data found to Update Veneer Item',
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
        if (
          !update_veneer_item.acknowledged ||
          update_veneer_item.modifiedCount <= 0
        ) {
          throw new ApiError(
            'Failed to Update Veneer Item',
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }

        // Fetch updated documents
        for (let veneer_inventory_id of veneer_inventory_ids) {
          const update_document = await veneer_inventory_items_model
            .findOne({ _id: veneer_inventory_id })
            .lean();
          const veneer_invoice_id = update_document?.invoice_id;

          const is_invoice_editable = await veneer_inventory_items_model
            .find({
              _id: { $ne: veneer_inventory_id },
              invoice_id: veneer_invoice_id,
              issue_status: { $ne: null },
            })
            .lean();

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
      };
      const revert_to_dressing_done = async function () {
        const update_dressing_done_item =
          await dressing_done_items_model.updateMany(
            { _id: { $in: dressing_done_ids } },
            { $set: { issue_status: null } },
            { session }
          );

        if (update_dressing_done_item.matchedCount <= 0) {
          throw new ApiError(
            'Not data found to Update Dressing  Item',
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
        if (
          !update_dressing_done_item.acknowledged ||
          update_dressing_done_item.modifiedCount <= 0
        ) {
          throw new ApiError(
            'Failed to Update Dressing Item',
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }

        // Fetch updated documents
        for (let dressing_done_id of dressing_done_ids) {
          const update_document = await dressing_done_items_model
            .findOne({ _id: dressing_done_id })
            .lean();
          const dressing_done_other_details_id =
            update_document?.dressing_done_other_details_id;

          const is_dressing_done_item_editable = await dressing_done_items_model
            .find({
              _id: { $ne: dressing_done_id },
              dressing_done_other_details_id: dressing_done_other_details_id,
              issue_status: { $ne: null },
            })
            .lean();

          if (
            is_dressing_done_item_editable &&
            is_dressing_done_item_editable?.length <= 0
          ) {
            await dressing_done_other_details_model.updateOne(
              { _id: dressing_done_other_details_id },
              {
                $set: {
                  isEditable: true,
                },
              },
              { session }
            );

            const delete_dressing_done_history_doc =
              await dressing_done_history_model.deleteOne(
                {
                  dressing_done_other_details_id:
                    dressing_done_other_details_id,
                  bundles: {
                    $in: dressing_done_ids
                  },
                },
                { session }
              );

            if (
              !delete_dressing_done_history_doc.acknowledged ||
              delete_dressing_done_history_doc.deletedCount === 0
            ) {
              throw new ApiError(
                'Failed to delete dressing history documnet',
                StatusCodes.BAD_REQUEST
              );
            }
          }
        }
      };

      if (veneer_inventory_ids?.length > 0) {
        await revert_to_veneer_inventory();
      } else if (dressing_done_ids?.length > 0) {
        await revert_to_dressing_done();
      } else {
        throw new ApiError(
          'No data found to revert item',
          StatusCodes.BAD_REQUEST
        );
      }

      // delete reverted items
      const delete_response = await issues_for_smoking_dying_model.deleteMany(
        {
          unique_identifier: unique_identifier,
          pallet_number: pallet_number,
        },
        { session }
      );
      if (
        !delete_response?.acknowledged ||
        delete_response?.deletedCount === 0
      ) {
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
  }
);
