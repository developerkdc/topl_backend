import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { flitch_inventory_items_model } from '../../../database/schema/inventory/Flitch/flitch.schema.js';

export const fetch_all_flitch_by_item_name = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const order_item_data = await RawOrderItemDetailsModel.findById(id);

  if (!order_item_data) {
    throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
  }

  const search_query = {};

  if (order_item_data?.item_name && order_item_data?.log_no) {
    search_query['$and'] = [
      { item_name: order_item_data?.item_name },
      { log_no: order_item_data?.log_no },
    ];
  } else if (order_item_data?.item_name) {
    search_query['item_name'] = order_item_data?.item_name;
  }

  const match_query = {
    ...search_query,
    flitch_cmt: {
      $lte: order_item_data?.cbm,
      $gt: 0,
    },
    issue_status: null,
    'invoice_details.approval_status.sendForApproval.status': false,
  };
  const pipeline = [
    {
      $lookup: {
        from: 'flitch_inventory_invoice_details',
        localField: 'invoice_id',
        foreignField: '_id',
        as: 'invoice_details',
      },
    },
    {
      $unwind: {
        path: '$invoice_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    { $match: { ...match_query } },
    {
      $project: {
        log_no: 1,
      },
    },
  ];

  const result = await flitch_inventory_items_model
    ?.aggregate(pipeline)
    .collation({ caseLevel: true, locale: 'en' });

  const response = new ApiResponse(
    StatusCodes.OK,
    'Flitch  Dropdown fetched successfully',
    result
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetch_flitch_details_by_log_no = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const flitch_item_details = await flitch_inventory_items_model.findById(id);
  const response = new ApiResponse(
    StatusCodes.OK,
    'Flitch Item Details fetched successfully',
    flitch_item_details
  );
  return res.status(StatusCodes.OK).json(response);
});
