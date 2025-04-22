import { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { grouping_done_items_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import { order_category } from '../../../database/Utils/constants/constants.js';
import { decorative_order_item_details_model } from '../../../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import series_product_order_item_details_model from '../../../database/schema/order/series_product_order/series_product_order_item_details.schema.js';

export const fetch_all_group_no_by_item_name = catchAsync(async (req, res) => {
  const { id } = req.params;
  const category = req?.query?.category;
  console.log("category : ",category);
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }
  let order_item_data;
  const search_query = {};
  if(category === order_category?.raw){
     order_item_data = await RawOrderItemDetailsModel.findById(id);
     if (!order_item_data) {
       throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
     }
     if (order_item_data?.item_name) {
       search_query['item_name'] = order_item_data?.item_name;
     }
  }
  if(category === order_category?.decorative){
    order_item_data = await decorative_order_item_details_model.findById(id);
    // if (!order_item_data) {
    //   throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
    // }
  }
  if(category === order_category?.series_product){
    order_item_data = await series_product_order_item_details_model.findById(id);
    // if (!order_item_data) {
    //   throw new ApiError('Order Item Data not found', StatusCodes.NOT_FOUND);
    // }
  }

  const match_query = {
    ...search_query,
    'available_details.no_of_leaves': {
      $gt: 0,
    },
    // issue_status: null,
    // "invoice_details.approval_status.sendForApproval.status": false
  };
  const pipeline = [
    { $match: { ...match_query } },
    {
      $project: {
        group_no: 1,
      },
    },
  ];

  const result = await grouping_done_items_details_model.aggregate(pipeline);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Group No Dropdown fetched successfully',
    result
  );
  return res.status(StatusCodes.OK).json(response);
});

export const fetch_group_details_by_id = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const result = await grouping_done_items_details_model.findById(id);
  const response = new ApiResponse(
    StatusCodes.OK,
    'Group Details fetched successfully',
    result
  );
  return res.status(StatusCodes.OK).json(response);
});
