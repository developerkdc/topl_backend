import mongoose, { isValidObjectId } from 'mongoose';
import ApiError from '../../../utils/errors/apiError.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { approval_status, StatusCodes } from '../../../utils/constants.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import {
  order_item_status,
  order_status,
} from '../../../database/Utils/constants/constants.js';
import { orders_approval_model } from '../../../database/schema/order/orders.approval.schema.js';
import { approval_raw_order_item_details } from '../../../database/schema/order/raw_order/approval_raw_order_item_details.schema.js';

export const add_raw_order = catchAsync(async (req, res, next) => {
  const { order_details, item_details } = req.body;
  const userDetails = req.userDetails;

  for (let i of ['order_details', 'item_details']) {
    if (!req.body?.[i]) {
      throw new ApiError(`Please provide ${i} details`, 400);
    }
  }

  if (!Array.isArray(item_details)) {
    throw new ApiError('Order item must be an array', 400);
  }
  if (item_details <= 0) {
    throw new ApiError('Atleast one order item is required', 400);
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // adding Order details
    var newOrderNumber = 1;
    let prevOrderNo = await OrderModel.find().sort({ createdAt: -1 }).limit(1);

    if (prevOrderNo.length > 0 && prevOrderNo[0]?.order_no) {
      newOrderNumber = Number(prevOrderNo[0]?.order_no) + 1;
    }

    const [newOrderDetails] = await OrderModel.create(
      [
        {
          ...order_details,
          order_no: newOrderNumber,
          product_category: order_details?.raw_materials,
          created_by: userDetails._id,
          updated_by: userDetails._id,
        },
      ],
      { session }
    );

    if (!newOrderDetails) {
      throw new ApiError(
        'Failed to add order details',
        StatusCodes.BAD_REQUEST
      );
    }

    // adding item details
    const formattedItemsDetails = item_details.map((item) => ({
      ...item,
      product_category: newOrderDetails?.raw_materials,
      order_id: newOrderDetails._id,
      created_by: userDetails._id,
      updated_by: userDetails._id,
    }));

    const newItems = await RawOrderItemDetailsModel.insertMany(
      formattedItemsDetails,
      { session }
    );

    if (!newItems || newItems.length === 0) {
      throw new ApiError('Failed to add order items', 400);
    }

    await session.commitTransaction();

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Order Created Successfully.',
      { order_details: newOrderDetails, item_details: newItems }
    );

    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    await session.endSession();
  }
});

export const update_raw_order = catchAsync(async (req, res) => {
  const { order_details_id } = req.params;

  const { order_details, item_details } = req.body;
  const userDetails = req.userDetails;
  const send_for_approval = req.sendForApproval;
  // const send_for_approval = true; //for now always sending for approval

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    if (!order_details_id) {
      throw new ApiError('Order details id is missing');
    }

    for (let field of ['order_details', 'item_details']) {
      if (!req.body[field]) {
        throw new ApiError(`${field} is required`, StatusCodes?.NOT_FOUND);
      }
    }
    if (!Array.isArray(item_details)) {
      throw new ApiError(
        'Item details must be an array',
        StatusCodes.BAD_REQUEST
      );
    }

    const order_details_result = await OrderModel.findOne({ _id: order_details_id });
    if (!order_details_result) {
      throw new ApiError('Order details not found', StatusCodes.NOT_FOUND);
    }

    if (!send_for_approval) {
      const updated_order_details = await OrderModel.findOneAndUpdate(
        { _id: order_details_id },
        {
          $set: {
            ...order_details,
            product_category: order_details?.raw_materials,
            updated_by: userDetails?._id,
          },
        },
        { session, runValidators: true, new: true }
      );
      if (!updated_order_details) {
        throw new ApiError(
          'Failed to Update order details data.',
          StatusCodes.BAD_REQUEST
        );
      }

      // if (updated_order_details.order_status === order_status.cancelled) {
      //   throw new ApiError("Order is already cancelled", StatusCodes.BAD_REQUEST);
      // }
      if (updated_order_details.order_status === order_status.closed) {
        throw new ApiError('Order is already closed', StatusCodes.BAD_REQUEST);
      }

      const delete_order_items = await RawOrderItemDetailsModel?.deleteMany(
        { order_id: updated_order_details?._id },
        { session }
      );

      if (
        !delete_order_items?.acknowledged ||
        delete_order_items?.deletedCount === 0
      ) {
        throw new ApiError(
          'Failed to delete item details',
          StatusCodes.BAD_REQUEST
        );
      }

      const modify_item_details = item_details?.map((item) => {
        item.order_id = updated_order_details?._id;
        item.product_category = updated_order_details?.raw_materials;
        item.created_by = item.created_by ? item?.created_by : userDetails?._id;
        item.updated_by = userDetails?._id;
        item.createdAt = item.createdAt ? item?.createdAt : new Date();
        item.updatedAt = new Date();
        return item;
      });

      const updated_item_details = await RawOrderItemDetailsModel?.insertMany(
        modify_item_details,
        { session }
      );
      if (updated_item_details?.length === 0) {
        throw new ApiError(
          'Failed to add order item details',
          StatusCodes?.BAD_REQUEST
        );
      }
      await session?.commitTransaction();
      const response = new ApiResponse(
        StatusCodes.OK,
        'Order Updated Successfully.',
        {
          order_details: updated_order_details,
          item_details: updated_item_details,
        }
      );
      return res.status(StatusCodes.OK).json(response);
    }
    const { _id, createdAt, ...rest_order_details } = order_details;
    const updated_approval_status = {
      ...approval_status,
      sendForApproval: {
        status: true,
        remark: 'Approval Pending',
      },
    };
    const updated_approval_order_payload = {
      ...rest_order_details,
      order_no: order_details_result?.order_no,
      order_id: order_details_id,
      product_category: rest_order_details?.raw_materials,
      approval_status: updated_approval_status,
      approval: {
        editedBy: userDetails?._id,
        approvalPerson: userDetails?.approver_id,
      },
      created_by: userDetails?._id,
      updated_by: userDetails?._id,

    };

    const [add_approval_order_result] = await orders_approval_model.create(
      [updated_approval_order_payload],
      { session }
    );

    if (!add_approval_order_result) {
      throw new ApiError(
        'Failed to send order for approval',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_order_status_result = await OrderModel.updateOne(
      { _id: order_details_id },
      {
        $set: { approval_status: updated_approval_status },
      },
      { session }
    );

    if (update_order_status_result?.matchedCount === 0) {
      throw new ApiError(
        'Order not found to update approval status',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_order_status_result?.acknowledged ||
      update_order_status_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update order approval status',
        StatusCodes.BAD_REQUEST
      );
    }

    const updated_item_details = item_details?.map((item) => {
      const { _id, createdAt, updatedAt, ...rest_item_details } = item;
      return {
        ...rest_item_details,
        raw_item_id: _id ? _id : new mongoose.Types.ObjectId(),
        order_id: add_approval_order_result?.order_id,
        approval_order_id: add_approval_order_result?._id,
        product_category: add_approval_order_result?.raw_materials,
        // created_by: item.created_by ? item?.created_by : userDetails?._id,
        updated_by: item.updated_by ? item?.updated_by : userDetails?._id,
      };
    });

    const add_approval_order_items_result =
      await approval_raw_order_item_details.insertMany(updated_item_details, {
        session,
      });

    if (
      !add_approval_order_items_result ||
      add_approval_order_items_result.length === 0
    ) {
      throw new ApiError(
        'Failed to add approval order items',
        StatusCodes.BAD_REQUEST
      );
    }

    await session?.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Order Sent for Approval Successfully.',
      {
        order_details: update_order_status_result,
        item_details: add_approval_order_items_result,
      }
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session?.endSession();
  }
});

export const update_raw_order_item_status_by_item_id = catchAsync(
  async (req, res) => {
    const { id } = req.params;
    const { _id } = req.userDetails;

    const update_result = await RawOrderItemDetailsModel?.updateOne(
      { _id: id },
      {
        $set: {
          item_status: order_item_status?.cancel,
          updated_by: _id,
        },
      }
    );

    if (update_result?.matchedCount === 0) {
      throw new ApiError('Order Item Not found', StatusCodes?.NOT_FOUND);
    }

    if (!update_result?.acknowledged || update_result?.modifiedCount === 0) {
      throw new ApiError(
        'Failed to update order item status',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Order Item Cancelled Successfully',
      update_result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_all_raw_order_items = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    sortBy = 'updatedAt',
    sort = 'desc',
    limit = 10,
    search = '',
  } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req.body?.searchFields || {};

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
    ...search_query,
    ...filterData,
  };

  const aggLookupOrderDetails = {
    $lookup: {
      from: 'orders',
      localField: 'order_id',
      foreignField: '_id',
      as: 'order_details',
      pipeline: [
        {
          $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  first_name: 1,
                  last_name: 1,
                  user_name: 1,
                  user_type: 1,
                  email_id: 1,
                },
              },
            ],
            as: 'order_created_user_details',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'updated_by',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  first_name: 1,
                  last_name: 1,
                  user_name: 1,
                  user_type: 1,
                  email_id: 1,
                },
              },
            ],
            as: 'order_updated_user_details',
          },
        },
        {
          $unwind: {
            path: '$order_created_user_details',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$order_updated_user_details',
            preserveNullAndEmptyArrays: true,
          },
        },
      ],
    },
  };
  const aggCreatedUserDetails = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            first_name: 1,
            last_name: 1,
            user_name: 1,
            user_type: 1,
            email_id: 1,
          },
        },
      ],
      as: 'created_user_details',
    },
  };

  const aggUpdatedUserDetails = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            first_name: 1,
            last_name: 1,
            user_name: 1,
            user_type: 1,
            email_id: 1,
          },
        },
      ],
      as: 'updated_user_details',
    },
  };
  const aggOrderCreatedUserDetails = {
    $lookup: {
      from: 'users',
      localField: 'order_details.created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            first_name: 1,
            last_name: 1,
            user_name: 1,
            user_type: 1,
            email_id: 1,
          },
        },
      ],
      as: 'order_created_user_details',
    },
  };

  const aggOrderUpdatedUserDetails = {
    $lookup: {
      from: 'users',
      localField: 'order_details.updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            first_name: 1,
            last_name: 1,
            user_name: 1,
            user_type: 1,
            email_id: 1,
          },
        },
      ],
      as: 'order_updated_user_details',
    },
  };
  const aggMatch = {
    $match: {
      ...match_query,
    },
  };
  const aggUnwindOtherDetails = {
    $unwind: {
      path: '$order_details',
      preserveNullAndEmptyArrays: true,
    },
  };

  const aggUnwindCreatedUser = {
    $unwind: {
      path: '$created_user_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUnwindUpdatedUser = {
    $unwind: {
      path: '$updated_user_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggOrderUnwindCreatedUser = {
    $unwind: {
      path: '$order_created_user_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggOrderUnwindUpdatedUser = {
    $unwind: {
      path: '$order_updated_user_details',
      preserveNullAndEmptyArrays: true,
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

  const list_aggregate = [
    aggLookupOrderDetails,
    aggUnwindOtherDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatedUser,
    // aggOrderCreatedUserDetails,
    // aggOrderUpdatedUserDetails,
    // aggOrderUnwindCreatedUser,
    // aggOrderUnwindUpdatedUser,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ];

  const result = await RawOrderItemDetailsModel?.aggregate(list_aggregate);

  const aggCount = {
    $count: 'totalCount',
  };

  const count_total_docs = [
    aggLookupOrderDetails,
    aggUnwindOtherDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatedUser,
    aggMatch,
    aggCount,
  ];

  const total_docs = await RawOrderItemDetailsModel.aggregate(count_total_docs);

  const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes?.OK,
    'Data Fetched Successfully',
    {
      data: result,
      totalPages: totalPages,
    }
  );
  return res.status(StatusCodes?.OK).json(response);
});

export const fetch_all_raw_order_items_by_order_id = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.BAD_REQUEST);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const pipeline = [
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(id),
        },
      },
      {
        $lookup: {
          from: 'raw_order_item_details',
          foreignField: 'order_id',
          localField: '_id',
          as: 'order_items_details',
        },
      },
      {
        $lookup: {
          from: 'users',
          foreignField: '_id',
          localField: 'created_by',
          as: 'created_user_details',
          pipeline: [
            {
              $project: {
                first_name: 1,
                last_name: 1,
                user_name: 1,
                user_type: 1,
                email_id: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          foreignField: '_id',
          localField: 'updated_by',
          as: 'updated_user_details',
          pipeline: [
            {
              $project: {
                first_name: 1,
                last_name: 1,
                user_name: 1,
                user_type: 1,
                email_id: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$created_user_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$updated_user_details',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const result = await OrderModel.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'All Items of order fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);
