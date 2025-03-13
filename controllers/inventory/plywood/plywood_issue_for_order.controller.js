import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { isValidObjectId } from 'mongoose';
import { plywood_inventory_items_details } from '../../../database/schema/inventory/Plywood/plywood.schema.js';

//fetching all pallet no dropdown
export const fetch_all_plywood_no_item_name = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const order_item_data = await RawOrderItemDetailsModel.findById(id);

  if (!order_item_data) {
    throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
  }

  const search_query = {};

  if (order_item_data?.item_name) {
    search_query['item_name'] = order_item_data?.item_name;
  }

  const match_query = {
    ...search_query,
    available_sheets: {
      $lte: order_item_data.no_of_sheet,
    },
  };

  const pipeline = [
    { $match: { ...match_query } },
    {
      $project: {
        pallet_number: 1,
      },
    },
  ];

  const result = await plywood_inventory_items_details
    ?.aggregate(pipeline)
    .collation({ caseLevel: true, locale: 'en' });

  const response = new ApiResponse(
    StatusCodes.OK,
    'Pallet No Dropdown fetched successfully',
    result
  );
  return res.status(StatusCodes.OK).json(response);
});

// fetching plywood details by pallet_no
export const fetch_plywood_details_by_id = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const plywood_item_details =
    await plywood_inventory_items_details.findById(id);
  const response = new ApiResponse(
    StatusCodes.OK,
    'Plywood Item Details fetched successfully',
    plywood_item_details
  );
  return res.status(StatusCodes.OK).json(response);
});
