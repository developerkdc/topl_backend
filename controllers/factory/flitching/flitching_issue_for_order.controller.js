import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';

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
      { log_no_code: order_item_data?.log_no },
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
  };
  const pipeline = [
    { $match: { ...match_query } },
    {
      $project: {
        log_no_code: 1,
      },
    },
  ];

  const result = await flitching_done_model
    .aggregate(pipeline)
    .collation({ caseLevel: true, locale: 'en' });

  const response = new ApiResponse(
    StatusCodes.OK,
    'Flitching Done Log No Code Dropdown fetched successfully',
    result
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetch_flitch_details_by_log_no_code = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const flitch_item_details = await flitching_done_model.findById(id);
    const response = new ApiResponse(
      StatusCodes.OK,
      'Flitching Item Details fetched successfully',
      flitch_item_details
    );
    return res.status(StatusCodes.OK).json(response);
  }
);
