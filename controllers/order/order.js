import mongoose from "mongoose";
import { decorative_order_item_details_model } from "../../database/schema/order/decorative_order/decorative_order_item_details.schema.js";
import { OrderModel } from "../../database/schema/order/orders.schema.js";
import { RawOrderItemDetailsModel } from "../../database/schema/order/raw_order/raw_order_item_details.schema.js";
import series_product_order_item_details_model from "../../database/schema/order/series_product_order/series_product_order_item_details.schema.js";
import { order_category } from "../../database/Utils/constants/constants.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { StatusCodes } from "../../utils/constants.js";
import ApiError from "../../utils/errors/apiError.js";
import catchAsync from "../../utils/errors/catchAsync.js";

const order_items_models = {
  [order_category.raw]: RawOrderItemDetailsModel,
  [order_category.decorative]: decorative_order_item_details_model,
  [order_category.series_product]: series_product_order_item_details_model
}

export const order_no_dropdown = catchAsync(async (req, res, next) => {
  const category = req?.query?.category;
  const product_name = req?.query?.product_name;

  const matchQuery = {}
  if (category) {
    matchQuery.order_category = category

    if (product_name) {
      if (category === order_category.raw) {
        matchQuery.raw_materials = product_name
      } else if (category === order_category.series_product) {
        matchQuery.series_product = product_name
      }
    }
  }

  const aggMatch = {
    $match: {
      ...matchQuery
    }
  };

  const aggProject = {
    $project: {
      order_no: 1,
      order_category: 1
    }
  }
  if (category === order_category.raw) {
    aggProject.$project.raw_materials = 1
  } else if (category === order_category.series_product) {
    aggProject.$project.series_product = 1
  }

  const fetch_order_no = await OrderModel.aggregate([
    aggMatch,
    aggProject
  ]);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Fetch Order Dropdown Successfully.',
    fetch_order_no
  );

  return res.status(StatusCodes.OK).json(response);
});

export const order_items_dropdown = catchAsync(async (req, res, next) => {
  const { order_id } = req.params;

  const fetch_order_details = await OrderModel.findOne({ _id: order_id }, {
    order_category: 1
  }).lean();

  if (!fetch_order_details) {
    throw new ApiError("Order not found", StatusCodes.NOT_FOUND);
  }

  const orderId = fetch_order_details?._id;
  const category = fetch_order_details?.order_category;
  const order_items_data = await order_items_models?.[category]?.find({ order_id: orderId }, {
    order_id: 1,
    item_no: 1
  });

  const response = new ApiResponse(
    StatusCodes.OK,
    `Fetch ${category} Order Items Dropdown Successfully.`,
    order_items_data
  );

  return res.status(StatusCodes.OK).json(response);
});

export const fetch_single_order_items = catchAsync(async (req, res, next) => {
  const { order_id, item_id } = req.params;
  if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(item_id)) {
    throw new ApiError("Invalid Order or Item Id", StatusCodes.BAD_REQUEST);
  }

  const fetch_order_details = await OrderModel.findOne({ _id: order_id }, {
    order_category: 1
  }).lean();

  if (!fetch_order_details) {
    throw new ApiError("Order not found", StatusCodes.NOT_FOUND);
  }

  const orderId = fetch_order_details?._id;
  const category = fetch_order_details?.order_category;

  const aggMatch = {
    $match: {
      _id: item_id,
      order_id: orderId
    }
  }

  const aggOrderLookup = {
    $lookup: {
      from: "orders",
      localField: "order_id",
      foreignField: "_id",
      as: "order_details"
    }
  }

  const aggUnwindOrder = {
    $unwind: {
      path: "$order_details",
      preserveNullAndEmptyArrays: true
    }
  }

  const aggIssuedItems = {
    $lookup:{
      from: "issued_for_order_items",
      localField: "_id",
      foreignField: "order_item_id",
      as: "issued_for_order_items"
    }
  }

  const order_items_data = await order_items_models?.[category]?.aggregate([
    aggMatch,
    aggOrderLookup,
    aggUnwindOrder,
    aggIssuedItems
  ])

  const response = new ApiResponse(
    StatusCodes.OK,
    `Fetch ${category} Order Items Successfully.`,
    order_items_data
  );

  return res.status(StatusCodes.OK).json(response);
});