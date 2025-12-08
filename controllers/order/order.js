import mongoose from 'mongoose';
import { decorative_order_item_details_model } from '../../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import issue_for_order_model from '../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import { OrderModel } from '../../database/schema/order/orders.schema.js';
import { RawOrderItemDetailsModel } from '../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import series_product_order_item_details_model from '../../database/schema/order/series_product_order/series_product_order_item_details.schema.js';
import {
  order_category,
  order_item_status,
  order_status,
} from '../../database/Utils/constants/constants.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';
import ApiError from '../../utils/errors/apiError.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import RevertOrderItem from './revert_issued_order_item/revert_issued_order_item.controller..js';

const order_items_models = {
  [order_category.raw]: RawOrderItemDetailsModel,
  [order_category.decorative]: decorative_order_item_details_model,
  [order_category.series_product]: series_product_order_item_details_model,
};

export const order_no_dropdown = catchAsync(async (req, res, next) => {
  const category = req?.query?.category;
  const product_name = req?.query?.product_name;
  const { fetch_all_order = 'false' } = req.query;

  const matchQuery = {};
  if (category) {
    matchQuery.order_category = category;

    if (product_name) {
      if (category === order_category.raw) {
        matchQuery.raw_materials = product_name;
      } else if (category === order_category.series_product) {
        matchQuery.series_product = product_name;
      }
    }
  }

  const aggMatch = {
    $match: {
      ...matchQuery,
    },
  };

  if (fetch_all_order !== 'true') {
    aggMatch.$match.order_status = {
      $nin: [order_status.cancelled, order_status.closed],
    };
  }

  const aggProject = {
    $project: {
      order_no: 1,
      order_category: 1,
    },
  };
  if (category === order_category.raw) {
    aggProject.$project.raw_materials = 1;
  } else if (category === order_category.series_product) {
    aggProject.$project.series_product = 1;
  }

  const fetch_order_no = await OrderModel.aggregate([aggMatch, aggProject]);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Fetch Order Dropdown Successfully.',
    fetch_order_no
  );

  return res.status(StatusCodes.OK).json(response);
});

export const order_items_dropdown = catchAsync(async (req, res, next) => {
  const { order_id } = req.params;
  const { fetch_all_order = 'false' } = req.query;

  const fetch_order_details = await OrderModel.findOne(
    { _id: order_id },
    {
      order_category: 1,
    }
  ).lean();

  if (!fetch_order_details) {
    throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
  }

  const orderId = fetch_order_details?._id;
  const category = fetch_order_details?.order_category;

  const match_query = {
    order_id: orderId,
  };

  if (fetch_all_order !== 'true') {
    match_query.item_status = {
      $nin: [order_item_status?.cancelled, order_item_status?.closed],
    };
  }

  const order_items_data = await order_items_models?.[category]?.find(
    {
      ...match_query,
    },
    {
      order_id: 1,
      item_no: 1,
      sales_item_name: 1
    }
  );

  const response = new ApiResponse(
    StatusCodes.OK,
    `Fetch ${category} Order Items Dropdown Successfully.`,
    order_items_data
  );

  return res.status(StatusCodes.OK).json(response);
});

export const fetch_single_order_items = catchAsync(async (req, res, next) => {
  const { order_id, item_id } = req.params;
  if (
    !mongoose.isValidObjectId(order_id) ||
    !mongoose.isValidObjectId(item_id)
  ) {
    throw new ApiError('Invalid Order or Item Id', StatusCodes.BAD_REQUEST);
  }

  const fetch_order_details = await OrderModel.findOne(
    { _id: order_id },
    {
      order_category: 1,
    }
  ).lean();

  if (!fetch_order_details) {
    throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
  }

  const orderId = fetch_order_details?._id;
  const category = fetch_order_details?.order_category;

  const aggMatch = {
    $match: {
      _id: mongoose.Types.ObjectId.createFromHexString(item_id?.toString()),
      order_id: mongoose.Types.ObjectId.createFromHexString(
        orderId?.toString()
      ),
    },
  };

  const aggOrderLookup = {
    $lookup: {
      from: 'orders',
      localField: 'order_id',
      foreignField: '_id',
      as: 'order_details',
    },
  };

  const aggUnwindOrder = {
    $unwind: {
      path: '$order_details',
      preserveNullAndEmptyArrays: true,
    },
  };

  const aggIssuedItems = {
    $lookup: {
      from: 'issued_for_order_items',
      localField: '_id',
      foreignField: 'order_item_id',
      as: 'issued_for_order_items',
    },
  };

  const order_items_data = await order_items_models?.[category]?.aggregate([
    aggMatch,
    aggOrderLookup,
    aggUnwindOrder,
    aggIssuedItems,
  ]);

  const response = new ApiResponse(
    StatusCodes.OK,
    `Fetch ${category} Order Items Successfully.`,
    order_items_data
  );

  return res.status(StatusCodes.OK).json(response);
});

export const revert_order_by_order_id = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userDetails = req.userDetails;

  if (!id) {
    throw new ApiError('ID not found', StatusCodes.NOT_FOUND);
  }
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const revert_order_handler = new RevertOrderItem(id, userDetails, session);
    await revert_order_handler.update_inventory_item_status();
    const delete_order_item_doc_result = await issue_for_order_model.deleteOne(
      { _id: id },
      { session: session }
    );
    if (
      !delete_order_item_doc_result.acknowledged ||
      delete_order_item_doc_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to Delete issue for order',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Order Reverted Successfully'
    );
    await session.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session?.endSession();
  }
});

export const fetch_decorative_and_series_product_order_items = catchAsync(
  async (req, res) => {
    const { createdDate, orderType } = req.body;

    if (!createdDate) {
      throw new ApiError('Created date is required', StatusCodes.BAD_REQUEST);
    }

    if (!orderType) {
      throw new ApiError('Order Type is required', StatusCodes.BAD_REQUEST);
    }
    const models_map = {
      decorative: 'decorative_order_item_details',
      series: 'series_product_order_item_details',
    };



    const pipeline = [
      {
        $match: {
          $expr: {
            $eq: [
              {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                  timezone: 'Asia/Kolkata',
                },
              },
              createdDate,
            ],
          },
        },
      },
      {
        $lookup: {
          from: models_map[orderType],
          localField: '_id',
          foreignField: 'order_id',
          as: 'order_item_details',
        },
      },
      { $unwind: '$order_item_details' },

      {
        $lookup: {
          from: "photos",
          localField: "order_item_details.photo_number_id",
          foreignField: "_id",
          as: "photo_details"
        }
      },
      {
        $unwind: {
          path: "$photo_details", preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "grouping_done_items_details",
          localField: "photo_details._id",
          foreignField: "photo_no_id",
          as: "grouping_done_items",
          pipeline: [
            {
              $project: {
                group_no: 1,
              }
            }
          ]
        }
      }, {
        $unwind: {
          path: "$grouping_done_items", preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer_details',
        },
      },
      {
        $unwind: {
          path: '$customer_details',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 0,
          OrderNo: '$order_no',
          SODetId: '$order_item_details.item_no',
          Date: '$orderDate',
          Priority: {
            $ifNull: ['$order_item_details.dispatch_schedule', null],
          },
          CustomerId: '$customer_details.sr_no',
          CustomerName: '$customer_details.company_name',
          Product: '$order_category',
          CurrentStage: {
            $ifNull: ['$photo_details.current_stage', null],
          },
          FinishedStage: {
            $ifNull: ['$order_item_details.finished_stage', null],
          },
          PhotoNumber: '$order_item_details.photo_number',
          Thickness: {
            $ifNull: ['$order_item_details.thickness', null],
          },
          ItemName: '$order_item_details.item_name',
          SalesItemname: '$order_item_details.sales_item_name',
          LogX: "$grouping_done_items.group_no",
          Length: '$order_item_details.length',
          Width: '$order_item_details.width',
          'Sheets/PCS': '$order_item_details.no_of_sheets',
          SqMtr: '$order_item_details.sqm',
          Character: '$photo_details.character_name',
          Pattern: '$photo_details.pattern_name',
          Series: '$order_item_details.series_name',
          Remarks: '$order_item_details.remark',
          Instruction: '$order_item_details.pressing_instructions',
          DeliveryDate: null,
          Remark: '$order_remarks',
          PlywoodSubType: '$order_item_details.base_type',
          CreatedOn: '$createdAt',
          ModifiedOn: '$updatedAt',
          OrderStatus: '$order_status',
          PalletNo: null,
        },
      },
    ];

    const result = await OrderModel.aggregate(pipeline);
    return res.status(StatusCodes.OK).json(result);
  }
);
