import { StatusCodes } from '../../../utils/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import {
  flitch_inventory_invoice_model,
  flitch_inventory_items_model,
  flitch_inventory_items_view_model,
} from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';
import {
  issued_for_slicing_model,
  issued_for_slicing_view_model,
} from '../../../database/schema/factory/slicing/issuedForSlicing.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';

export const addIssueForSlicingFromFlitchInventory = catchAsync(
  async function (req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDetails = req.userDetails;
      const { flitch_inventory_item_ids, is_peeling_done } = req.body;

      if (
        !Array.isArray(flitch_inventory_item_ids) ||
        flitch_inventory_item_ids?.length === 0
      ) {
        throw new ApiError('Flitch inventory item must be a array field');
      }

      const flitchInventoryItemData = await flitch_inventory_items_view_model
        .find({
          _id: { $in: flitch_inventory_item_ids },
          issue_status: null,
        })
        .lean();

      if (flitchInventoryItemData?.length <= 0) {
        throw new ApiError(
          'Flitch Inventory Item Data Not Found',
          StatusCodes.NOT_FOUND
        );
      }

      const issue_for_slicing_data = flitchInventoryItemData?.map((item) => {
        return {
          flitch_inventory_item_id: item?._id,
          flitching_done_id: null,
          inward_sr_no: item?.flitch_invoice_details?.inward_sr_no,
          inward_date: item?.flitch_invoice_details?.inward_date,
          invoice_date:
            item?.flitch_invoice_details?.invoice_Details?.invoice_date,
          invoice_no: item?.flitch_invoice_details?.invoice_Details?.invoice_no,
          item_sr_no: item?.item_sr_no,
          item_id: item?.item_id,
          item_name: item?.item_name,
          color: item?.color,
          item_sub_category_id: item?.item_sub_category_id,
          item_sub_category_name: item?.item_sub_category_name,
          log_no: item?.log_no,
          flitch_code: item?.flitch_code,
          log_no_code: is_peeling_done ? `${item?.log_no}PD` : item?.log_no,
          flitch_formula: item?.flitch_formula,
          length: item?.length,
          width1: item?.width1,
          width2: item?.width2,
          width3: item?.width3,
          height: item?.height,
          cmt: item?.flitch_cmt,
          amount: item?.amount,
          amount_factor: 1,
          expense_amount: item?.expense_amount,
          issued_from: issues_for_status?.flitching,
          invoice_id: item?.invoice_id,
          is_peeling_done: is_peeling_done ? true : false,
          remark: item?.remark,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        };
      });

      const add_issue_for_slicing = await issued_for_slicing_model.insertMany(
        issue_for_slicing_data,
        { session }
      );

      if (add_issue_for_slicing?.length <= 0) {
        throw new ApiError('Failed to data for issue for peeling', 400);
      }
      const flitch_item_ids = add_issue_for_slicing?.map(
        (ele) => ele?.flitch_inventory_item_id
      );
      const flitch_invoice_ids = [
        ...new Set(add_issue_for_slicing?.map((issue) => issue?.invoice_id)),
      ];

      //updating log inventory item status to slicing
      const update_flitch_inventory_item_status =
        await flitch_inventory_items_model.updateMany(
          { _id: { $in: flitch_item_ids } },
          {
            $set: {
              issue_status: is_peeling_done
                ? issues_for_status?.slicing_peeling
                : issues_for_status?.slicing,
            },
          },
          { session }
        );

      if (update_flitch_inventory_item_status?.matchedCount <= 0) {
        throw new ApiError('Not Found Flitch Iventory Item');
      }

      if (
        !update_flitch_inventory_item_status.acknowledged ||
        update_flitch_inventory_item_status?.modifiedCount <= 0
      ) {
        throw new ApiError('Unable to Change Status of Flitch Inventory Item');
      }

      //updating flitch inventory invoice: if any one of flitch item send for slicing then invoice should not editable
      const update_flitch_inventory_invoice_editable =
        await flitch_inventory_invoice_model.updateMany(
          { _id: { $in: flitch_invoice_ids } },
          {
            $set: {
              isEditable: false,
            },
          },
          { session }
        );

      if (update_flitch_inventory_invoice_editable?.modifiedCount <= 0) {
        throw new ApiError('Not found Flitch inventory invoice');
      }

      if (
        !update_flitch_inventory_invoice_editable.acknowledged ||
        update_flitch_inventory_invoice_editable?.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Unable to change status of Flitch inventory invoice'
        );
      }

      await session.commitTransaction();

      const response = new ApiResponse(
        StatusCodes.CREATED,
        'Items successfully added for slicing.',
        add_issue_for_slicing
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

export const listing_issued_for_slicing_inventory = catchAsync(
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

    const aggregate_stage = [
      {
        $match: match_query,
      },
      {
        $sort: {
          [sortBy]: sort === 'desc' ? -1 : 1,
          _id: sort === 'desc' ? -1 : 1,
        },
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ];

    const issued_for_slicing_data =
      await issued_for_slicing_view_model.aggregate(aggregate_stage);

    const totalCount = await issued_for_slicing_view_model.countDocuments({
      ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json(
      new ApiResponse(StatusCodes.OK, 'Data fetched successfully...', {
        issued_for_slicing_data,
        totalPage,
      })
    );
  }
);

export const revert_issued_for_slicing = catchAsync(async (req, res, next) => {
  const { issued_for_slicing_id } = req.body;
  console.log('params => ', issued_for_slicing_id)
  const session = await mongoose.startSession();
  await session.startTransaction();
  try {
    if (!issued_for_slicing_id) {
      throw new ApiError(
        'Issued for slicing id are missing',
        StatusCodes.BAD_REQUEST
      );
    }
    const issuedForSlicingData = await issued_for_slicing_model
      ?.findById(issued_for_slicing_id)
      .session(session);

    if (!issuedForSlicingData) {
      throw new ApiError('No Data found...', StatusCodes.BAD_REQUEST);
    }


    if (
      issuedForSlicingData?.issued_from?.toLowerCase() === 'flitching' &&
      issuedForSlicingData?.flitching_done_id === null
    ) {
      const updated_document = await flitch_inventory_items_model.updateOne(
        { _id: issuedForSlicingData?.flitch_inventory_item_id },
        {
          $set: {
            issue_status: null,
          },
        },
        { session }
      );

      if (
        !updated_document?.acknowledged ||
        updated_document?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update flitch inventory item status',
          StatusCodes.BAD_REQUEST
        );
      };

      const is_invoice_editable = await flitch_inventory_items_model?.find({
        _id: { $ne: issuedForSlicingData?.flitch_inventory_item_id },
        invoice_id: issuedForSlicingData?.invoice_id,
        issue_status: { $ne: null }
      }).session(session);



      if (is_invoice_editable && is_invoice_editable?.length <= 0) {
        await flitch_inventory_invoice_model?.updateOne({ _id: issuedForSlicingData?.invoice_id }, {
          $set: {
            isEditable: true
          }
        }, { session });
      }
    }
    if (
      issuedForSlicingData?.issued_from?.toLowerCase() === 'flitching_done' &&
      issuedForSlicingData?.flitching_done_id !== null
    ) {
      const updated_document = await flitching_done_model.updateOne(
        { _id: issuedForSlicingData?.flitching_done_id },
        {
          $set: {
            issue_status: null,
          },
        },
        { session }
      );
      if (
        !updated_document?.acknowledged ||
        updated_document?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update flitch inventory item status',
          StatusCodes.BAD_REQUEST
        );
      };

      const is_flitching_done_editable = await flitching_done_model?.find({ _id: { $ne: issuedForSlicingData?.flitching_done_id }, issue_for_flitching_id: issuedForSlicingData?.issue_for_flitching_id, issue_status: { $ne: null } }).session(session);

      if (is_flitching_done_editable && is_flitching_done_editable?.length <= 0) {
        await flitching_done_model.updateMany({ issue_for_flitching_id: issuedForSlicingData?.issue_for_flitching_id }, {
          $set: {
            isEditable: true
          }
        }, { session })
      }
    }

    const delete_response = await issued_for_slicing_model.deleteOne({ _id: issuedForSlicingData?._id }, { session })

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


export const fetch_single_issued_for_slicing_item = catchAsync(async (req, res, next) => {
  const { id } = req.params;


  if (!id) {
    return next(new ApiError("Issued for slicing id is missing", StatusCodes.NOT_FOUND))
  };

  const result = await issued_for_slicing_view_model?.findById(id);

  if (!result) {
    return next(new ApiError("No Data Found", StatusCodes.NOT_FOUND))
  };

  const response = new ApiResponse(StatusCodes.OK, "Issued for Slicing Item Fetched Sucessfully", result);
  return res.status(StatusCodes.OK).json(response)

})