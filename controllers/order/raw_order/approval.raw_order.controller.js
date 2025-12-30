import mongoose, { isValidObjectId } from 'mongoose';
import { orders_approval_model } from '../../../database/schema/order/orders.approval.schema.js';
import { approval_raw_order_item_details } from '../../../database/schema/order/raw_order/approval_raw_order_item_details.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { approval_status, StatusCodes } from '../../../utils/constants.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import { create_raw_order_approval_report } from '../../../config/downloadExcel/orders/raw_order/raw_order.approval.report.js';

export const fetch_all_raw_order_items = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    sortBy = 'updatedAt',
    sort = 'desc',
    limit = 10,
    search = '',
    export_report = 'false',
  } = req.query;


  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req.body?.searchFields || {};

  const filter = req.body?.filter;
  const { _id } = req.userDetails;

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
    'order_details.approval.approvalPerson': _id,
  };

  const aggLookupOrderDetails = {
    $lookup: {
      from: 'orders_approval',
      localField: 'approval_order_id',
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
        {
          $lookup: {
            from: 'users',
            localField: 'approval.rejectedBy.user',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  first_name: 1,
                  last_name: 1,
                  user_name: 1,
                },
              },
            ],
            as: 'rejected_user_details',
          },
        },
        {
          $unwind: {
            path: '$rejected_user_details',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'approval.approvalBy.user',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  first_name: 1,
                  last_name: 1,
                  user_name: 1,
                },
              },
            ],
            as: 'approved_user_details',
          },
        },
        {
          $unwind: {
            path: '$approved_user_details',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'approval.editedBy',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  first_name: 1,
                  last_name: 1,
                  user_name: 1,
                },
              },
            ],
            as: 'edited_user_details',
          },
        },
        {
          $unwind: {
            path: '$edited_user_details',
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
  // const aggOrderUnwindCreatedUser = {
  //   $unwind: {
  //     path: '$order_created_user_details',
  //     preserveNullAndEmptyArrays: true,
  //   },
  // };
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
    ...(export_report === "false" ? [aggSkip,
      aggLimit] : [])

  ];


  const result = await approval_raw_order_item_details?.aggregate(list_aggregate);



  if (export_report === 'true') {
    await create_raw_order_approval_report(result, req, res);
    return;
  }
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

  const total_docs =
    await approval_raw_order_item_details.aggregate(count_total_docs);

  const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes?.OK,
    'Raw Order Approval Details Fetched Successfully',
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

    const order_result = await orders_approval_model.findById(id).lean();

    if (!order_result) {
      throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
    }

    const is_approval_sent =
      order_result?.approval_status?.sendForApproval?.status;

    // if (!is_approval_sent) {
    //   throw new ApiError('Approval not sent for this order', StatusCodes.BAD_REQUEST);
    // };

    const previous_order_details_pipeline = [
      {
        $lookup: {
          from: 'raw_order_item_details',
          foreignField: '_id',
          localField: 'raw_item_id',
          as: 'previous_order_item_details',
        },
      },
      {
        $unwind: {
          path: '$previous_order_item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];
    const pipeline = [
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(id),
        },
      },
      ...(is_approval_sent
        ? [
          {
            $lookup: {
              from: 'orders',
              foreignField: '_id',
              localField: 'order_id',
              as: 'previous_order_details',
            },
          },
          {
            $unwind: {
              path: '$previous_order_details',
              preserveNullAndEmptyArrays: true,
            },
          },
        ]
        : []),

      {
        $lookup: {
          from: 'approval_raw_order_item_details',
          foreignField: 'approval_order_id',
          localField: '_id',
          as: 'order_items_details',
          pipeline: is_approval_sent ? previous_order_details_pipeline : [],
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

    const [result] = await orders_approval_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'All Items of order fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const approve_raw_order = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.userDetails;

  if (!id) {
    throw new ApiError('Order ID is required', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid Order ID', StatusCodes.BAD_REQUEST);
  }
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const updated_approval_status = {
      ...approval_status,
      approved: {
        status: true,
        remark: null,
      },
    };

    const order_approval = await orders_approval_model
      .findOneAndUpdate(
        {
          _id: id,
        },
        {
          $set: {
            approval_status: updated_approval_status,
            'approval.approvalBy.user': user._id,
          },
        },
        { session, new: true, runValidators: true }
      )
      .lean();
    if (!order_approval) {
      throw new ApiError(
        'Failed to update order details',
        StatusCodes.BAD_REQUEST
      );
    }

    const { _id, order_id, approvalBy, ...rest_order_Details } = order_approval;

    const update_order_details_result = await OrderModel.updateOne(
      { _id: order_id },
      {
        $set: { ...rest_order_Details },
      },
      { session }
    ).lean();

    if (update_order_details_result?.matchedCount === 0) {
      throw new ApiError('Order details not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_order_details_result?.acknowledged ||
      update_order_details_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to approve order details',
        StatusCodes.BAD_REQUEST
      );
    }

    const approval_item_details = await approval_raw_order_item_details
      .find({ approval_order_id: id, order_id: order_id })
      .lean();

    if (approval_item_details?.length <= 0) {
      throw new ApiError(
        'No approval item details found for this order',
        StatusCodes.BAD_REQUEST
      );
    }

    const delete_existing_raw_order_items =
      await RawOrderItemDetailsModel.deleteMany(
        { order_id: order_id },
        { session }
      ).lean();

    if (
      !delete_existing_raw_order_items?.acknowledged ||
      delete_existing_raw_order_items?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete existing raw order items',
        StatusCodes.BAD_REQUEST
      );
    }

    const approval_raw_items = await approval_raw_order_item_details
      .aggregate([
        {
          $match: {
            approval_order_id: mongoose.Types.ObjectId.createFromHexString(id),
            order_id: order_id,
            // order_id: mongoose.Types.ObjectId.createFromHexString(order_id),
          },
        },
        {
          $set: {
            _id: '$raw_order_item_id',
          },
        },
        {
          $unset: ['approval_order_id', 'raw_order_item_id'],
        },
      ])
      .session(session);

    if (approval_raw_items?.length <= 0) {
      throw new ApiError(
        'No raw order items found to approve',
        StatusCodes.BAD_REQUEST
      );
    }

    const insert_raw_order_items_result =
      await RawOrderItemDetailsModel.insertMany(approval_raw_items, {
        session,
      });

    if (insert_raw_order_items_result?.length <= 0) {
      throw new ApiError(
        'Failed to insert approved raw order items',
        StatusCodes.BAD_REQUEST
      );
    }
    await session.commitTransaction();

    const response = new ApiResponse(
      StatusCodes.OK,
      'Raw Order approved successfully',
      {
        order_details: update_order_details_result,
        approved_raw_order_items: insert_raw_order_items_result,
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
export const reject_raw_order = catchAsync(async (req, res) => {
  const { order_id } = req.params;
  const user = req.userDetails;

  if (!order_id) {
    throw new ApiError('Order ID is required', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(order_id)) {
    throw new ApiError('Invalid Order ID', StatusCodes.BAD_REQUEST);
  }
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const updated_approval_status = {
      ...approval_status,
      rejected: {
        status: true,
        remark: null,
      },
    };

    const order_approval_status_result = await orders_approval_model
      .findOneAndUpdate(
        {
          _id: order_id,
        },
        {
          $set: {
            approval_status: updated_approval_status,
            'approval.rejectedBy.user': user._id,
          },
        },
        { session, new: true, runValidators: true }
      )
      .lean();

    if (!order_approval_status_result) {
      throw new ApiError(
        'Failed to update order details',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_raw_order_details_result = await OrderModel.updateOne(
      { _id: order_approval_status_result?.order_id },
      {
        $set: { approval_status: updated_approval_status },
      },
      { session }
    ).lean();

    if (update_raw_order_details_result?.matchedCount === 0) {
      throw new ApiError('Order details not found', StatusCodes.BAD_REQUEST);
    }
    if (
      !update_raw_order_details_result?.acknowledged ||
      update_raw_order_details_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to reject order details',
        StatusCodes.BAD_REQUEST
      );
    }
    await session.commitTransaction();

    const response = new ApiResponse(
      StatusCodes.OK,
      'Raw Order Rejected successfully'
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session?.endSession();
  }
});



// static approve_order_cancellation = catchAsync(async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const userDetails = req.userDetails;
//     const { approval_order_id } = req.params;

//     const updated_approval_status = {
//       ...approval_status,
//       approved: {
//         status: true,
//         remark: null,
//       },
//     };

//     const approve_order_result = await orders_approval_model.findOneAndUpdate(
//       {
//         _id: approval_order_id,
//         'approval_status.sendForApproval.status': true,
//       },
//       {
//         $set: {
//           approval_status: updated_approval_status,
//           order_status: order_status.cancelled,
//           updated_by: userDetails._id,
//           'approval.approvalBy.user': userDetails?._id,
//         },
//       },
//       { session, new: true, runValidators: true }
//     );
//     if (!approve_order_result) {
//       throw new ApiError(
//         'No approval order found to approve',
//         StatusCodes.NOT_FOUND
//       );
//     }
//     const order_details = await this.fetch_order_details({
//       order_id: approve_order_result?.order_id?.toString(),
//     });

//     for (let item of order_details?.order_items_details) {
//       await this.revert_items_issued_for_order(
//         {
//           order_id: item?.order_id?.toString(),
//           order_item_id: item?._id?.toString(),
//           other_details: {
//             order_no: order_details?.order_no,
//             order_item_no: item?.item_no,
//             userDetails: userDetails,
//           },
//         },
//         session
//       );
//     }


//     const cancel_order_status = await OrderModel.updateOne(
//       { _id: approve_order_result?.order_id },
//       {
//         $set: {
//           order_status: order_status.cancelled,
//           approval_status: updated_approval_status,
//           updated_by: userDetails._id,
//         },
//       },
//       { session }
//     );

//     if (cancel_order_status?.matchedCount <= 0) {
//       throw new ApiError(
//         `No order found for ${order_id}`,
//         StatusCodes.NOT_FOUND
//       );
//     }
//     if (
//       !cancel_order_status?.acknowledged ||
//       cancel_order_status?.modifiedCount <= 0
//     ) {
//       throw new ApiError(
//         `Failed to cancel order ${order_id}`,
//         StatusCodes.INTERNAL_SERVER_ERROR
//       );
//     }

//     const update_approval_order_items_status =
//       await approval_raw_order_item_details.updateMany(
//         {
//           approval_order_id: approve_order_result?._id,
//           order_id: approve_order_result?.order_id,
//         },
//         {
//           $set: {
//             item_status: order_item_status.cancelled,
//             updated_by: userDetails._id,
//           },
//         },
//         {
//           session,
//         }
//       );
//     console.log("update_approval_order_items_status => ", update_approval_order_items_status)
//     if (
//       !update_approval_order_items_status?.matchedCount ||
//       update_approval_order_items_status?.matchedCount === 0
//     ) {
//       throw new ApiError(
//         `No approval order items found to cancel`,
//         StatusCodes.NOT_FOUND
//       );
//     }
//     if (
//       !update_approval_order_items_status?.acknowledged ||
//       update_approval_order_items_status?.modifiedCount === 0
//     ) {
//       throw new ApiError(
//         `Failed to cancel approval order items `,
//         StatusCodes.INTERNAL_SERVER_ERROR
//       );
//     }
//     const response = new ApiResponse(
//       StatusCodes.OK,
//       'Order Approved Successfully.'
//     );
//     await session.commitTransaction();
//     return res.status(response.statusCode).json(response);
//   } catch (error) {
//     await session?.abortTransaction();
//     throw error;
//   } finally {
//     await session.endSession();
//   }
// });


// static approve_order_item_cancellation = catchAsync(async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const userDetails = req.userDetails;
//     const { approval_order_id, approval_item_id } = req.params;
//     const updated_approval_status = {
//       ...approval_status,
//       approved: {
//         status: true,
//         remark: null,
//       },
//     };
//     const approve_order_result = await orders_approval_model.findOneAndUpdate(
//       {
//         _id: approval_order_id,
//         'approval_status.sendForApproval.status': true,
//       },
//       {
//         $set: {
//           approval_status: updated_approval_status,
//           // order_status: order_status.cancelled,
//           updated_by: userDetails._id,
//           'approval.approvalBy.user': userDetails?._id,
//         },
//       },
//       { session, new: true, runValidators: true }
//     );
//     if (!approve_order_result) {
//       throw new ApiError(
//         'No approval order found to approve',
//         StatusCodes.NOT_FOUND
//       );
//     }

//     const update_approval_order_item_status =
//       await approval_raw_order_item_details.findOneAndUpdate(
//         {
//           _id: approval_item_id,
//           approval_order_id: approve_order_result?._id,
//           order_id: approve_order_result?.order_id,
//         },
//         {
//           $set: {
//             item_status: order_item_status.cancelled,
//             updated_by: userDetails._id,
//           },
//         },
//         { session, new: true, runValidators: true }
//       );

//     if (!update_approval_order_item_status) {
//       throw new ApiError(
//         `No approval order item found to cancel`,
//         StatusCodes.NOT_FOUND
//       );
//     }
//     const cancel_order_status = await OrderModel.updateOne(
//       { _id: approve_order_result?.order_id },
//       {
//         $set: {
//           approval_status: updated_approval_status,
//           updated_by: userDetails._id,
//         },
//       },
//       { session }
//     );

//     if (cancel_order_status?.matchedCount <= 0) {
//       throw new ApiError(
//         `No order found for ${order_id}`,
//         StatusCodes.NOT_FOUND
//       );
//     }
//     if (
//       !cancel_order_status?.acknowledged ||
//       cancel_order_status?.modifiedCount <= 0
//     ) {
//       throw new ApiError(
//         `Failed to cancel order ${order_id}`,
//         StatusCodes.INTERNAL_SERVER_ERROR
//       );
//     }

//     const order_item_details = await this.fetch_order_item_details({
//       order_id: update_approval_order_item_status?.order_id?.toString(),
//       order_item_id: update_approval_order_item_status?.raw_item_id?.toString(),
//     });
//     await this.revert_items_issued_for_order(
//       {
//         order_id: order_item_details?.order_id?.toString(),
//         order_item_id: order_item_details?._id?.toString(),
//         other_details: {
//           order_no: order_item_details?.order_details?.order_no,
//           order_item_no: order_item_details?.item_no,
//           userDetails: userDetails,
//         },
//       },
//       session
//     );

//     const remaining_open_items = await RawOrderItemDetailsModel.find({
//       order_id: order_item_details?.order_id,
//       item_status: null,
//     }).session(session);

//     if (remaining_open_items.length === 0) {
//       // All items cancelled (or single item order)
//       await OrderModel.findOneAndUpdate(
//         { _id: order_item_details?.order_id },
//         { $set: { order_status: order_status.cancelled } },
//         { session }
//       );
//     } else {
//       // Some items still open, keep order_status as null
//       await OrderModel.findOneAndUpdate(
//         { _id: order_item_details?.order_id },
//         { $set: { order_status: null } },
//         { session }
//       );
//     }

//     await session.commitTransaction();
//     const response = new ApiResponse(
//       StatusCodes.OK,
//       'Order Item Approved Successfully.'
//     );

//     return res.status(response.statusCode).json(response);
//   } catch (error) {
//     await session?.abortTransaction();
//     throw error;
//   } finally {
//     await session.endSession();
//   }
// });


// static reject_order = catchAsync(async (req, res) => {
//   const { order_id } = req.params;
//   const user = req.userDetails;

//   if (!order_id) {
//     throw new ApiError('Order ID is required', StatusCodes.BAD_REQUEST);
//   }
//   if (!isValidObjectId(order_id)) {
//     throw new ApiError('Invalid Order ID', StatusCodes.BAD_REQUEST);
//   }
//   const session = await mongoose.startSession();
//   try {
//     await session.startTransaction();

//     const updated_approval_status = {
//       ...approval_status,
//       rejected: {
//         status: true,
//         remark: null,
//       },
//     };

//     const order_approval_status_result = await orders_approval_model
//       .findOneAndUpdate(
//         {
//           _id: order_id,
//         },
//         {
//           $set: {
//             approval_status: updated_approval_status,
//             'approval.rejectedBy.user': user._id,
//           },
//         },
//         { session, new: true, runValidators: true }
//       )
//       .lean();

//     if (!order_approval_status_result) {
//       throw new ApiError(
//         'Failed to update order details',
//         StatusCodes.BAD_REQUEST
//       );
//     }

//     const update_order_details_result = await OrderModel.updateOne(
//       { _id: order_approval_status_result?.order_id },
//       {
//         $set: { approval_status: updated_approval_status },
//       },
//       { session }
//     ).lean();

//     if (update_order_details_result?.matchedCount === 0) {
//       throw new ApiError('Order details not found', StatusCodes.BAD_REQUEST);
//     }
//     if (
//       !update_order_details_result?.acknowledged ||
//       update_order_details_result?.modifiedCount === 0
//     ) {
//       throw new ApiError(
//         'Failed to reject order details',
//         StatusCodes.BAD_REQUEST
//       );
//     }
//     await session.commitTransaction();

//     const response = new ApiResponse(
//       StatusCodes.OK,
//       'Decorative Order Rejected successfully'
//     );
//     return res.status(StatusCodes.OK).json(response);
//   } catch (error) {
//     await session?.abortTransaction();
//     throw error;
//   } finally {
//     await session?.endSession();
//   }
// });