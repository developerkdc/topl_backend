import mongoose, { isValidObjectId } from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import { decorative_order_item_details_model } from '../../../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import {
  order_category,
  order_item_status,
  order_status,
} from '../../../database/Utils/constants/constants.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import generatePDFBuffer from '../../../utils/generatePDF/generatePDFBuffer.js';
import moment from 'moment';
import photoModel from '../../../database/schema/masters/photo.schema.js';

export const add_decorative_order = catchAsync(async (req, res) => {
  const { order_details, item_details } = req.body;
  const userDetails = req.userDetails;

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
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
    const max_order_no = await OrderModel.findOne({}, { order_no: 1 })
      .sort({ order_no: -1 })
      .session(session);

    const new_order_no = max_order_no ? max_order_no?.order_no + 1 : 1;
    const [order_details_data] = await OrderModel.create(
      [
        {
          ...order_details,
          order_no: new_order_no,
          product_category: order_category.decorative,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        },
      ],
      { session }
    );

    if (!order_details_data) {
      throw new ApiError(
        'Failed to add order details',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_photo_details = async function (photo_number_id, photo_number, no_of_sheets) {
      const photoUpdate = await photoModel.findOneAndUpdate(
        {
          _id: photo_number_id,
          photo_number: photo_number,
          available_no_of_sheets: { $gte: no_of_sheets },
        },
        { $inc: { available_no_of_sheets: -no_of_sheets } },
        { session, new: true }
      );

      if (!photoUpdate) {
        throw new ApiError(
          `Photo number ${photo_number} does not have enough sheets.`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    const updated_item_details = [];
    for (const item of item_details) {
      // Validate photo availability - await properly in loop

      if (item.photo_number && item.photo_number_id) {
        await update_photo_details(item.photo_number_id, item.photo_number, item.no_of_sheets);
      }

      if (
        item.different_group_photo_number &&
        item.different_group_photo_number_id &&
        item.photo_number !== item.different_group_photo_number &&
        item.photo_number_id !== item.different_group_photo_number_id
      ) {
        await update_photo_details(item.different_group_photo_number_id, item.different_group_photo_number, item.no_of_sheets);
      }

      updated_item_details.push({
        ...item,
        order_id: order_details_data._id,
        product_category: `${order_details_data?.product_category} ${item.base_type}`,
        created_by: userDetails._id,
        updated_by: userDetails._id,
      });
    }

    const create_order_result =
      await decorative_order_item_details_model?.create(
        updated_item_details,
        { session }
      );
    if (create_order_result?.length === 0) {
      throw new ApiError(
        'Failed to add order item details',
        StatusCodes?.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Order Created Successfully.',
      { order_details: order_details_data, item_details: create_order_result }
    );
    await session?.commitTransaction();
    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const update_decorative_order = catchAsync(async (req, res) => {
  const { order_details_id } = req.params;

  const { order_details, item_details } = req.body;
  const userDetails = req.userDetails;

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

    const order_details_result = await OrderModel.findOneAndUpdate(
      { _id: order_details_id },
      {
        $set: {
          ...order_details,
          product_category: order_category.decorative,
          updated_by: userDetails?._id,
        },
      },
      { session, runValidators: true, new: true }
    );
    if (!order_details_result) {
      throw new ApiError(
        'Failed to Update order details data.',
        StatusCodes.BAD_REQUEST
      );
    }

    if (order_details_result.order_status === order_status.cancelled) {
      throw new ApiError("Order is already cancelled", StatusCodes.BAD_REQUEST);
    }
    if (order_details_result.order_status === order_status.closed) {
      throw new ApiError("Order is already closed", StatusCodes.BAD_REQUEST);
    }

    // revert photo details
    const order_items_details = await decorative_order_item_details_model?.find(
      { order_id: order_details_result?._id },
      { _id: 1, photo_number_id: 1, photo_number: 1, no_of_sheets: 1 },
      { session }
    );

    const revert_photo_details = async function (photo_number_id, photo_number, no_of_sheets) {
      const update_photo_sheets = await photoModel.updateOne(
        {
          _id: photo_number_id,
          photo_number: photo_number,
        },
        {
          $inc: { available_no_of_sheets: no_of_sheets },
        },
        { session }
      );

      if (!update_photo_sheets?.acknowledged) {
        throw new ApiError(
          `Photo number ${photo_number} failed to revert sheets.`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    for (const item of order_items_details) {
      if (item.photo_number && item.photo_number_id) {
        await revert_photo_details(item.photo_number_id, item.photo_number, item.no_of_sheets)
      };

      if (
        item.different_group_photo_number &&
        item.different_group_photo_number_id &&
        item.photo_number !== item.different_group_photo_number &&
        item.photo_number_id !== item.different_group_photo_number_id
      ) {
        await revert_photo_details(item.different_group_photo_number_id, item.different_group_photo_number, item.no_of_sheets);
      }
    }

    const delete_order_items =
      await decorative_order_item_details_model?.deleteMany(
        { order_id: order_details_result?._id },
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

    const update_photo_details = async function (photo_number_id, photo_number, no_of_sheets) {
      const photoUpdate = await photoModel.findOneAndUpdate(
        {
          _id: photo_number_id,
          photo_number: photo_number,
          available_no_of_sheets: { $gte: no_of_sheets },
        },
        { $inc: { available_no_of_sheets: -no_of_sheets } },
        { session, new: true }
      );

      if (!photoUpdate) {
        throw new ApiError(
          `Photo number ${photo_number} does not have enough sheets.`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    const updated_item_details = [];
    for (const item of item_details) {
      // Validate photo availability - await properly in loop
      if (item.photo_number && item.photo_number_id) {
        await update_photo_details(item.photo_number_id, item.photo_number, item.no_of_sheets);
      }

      if (
        item.different_group_photo_number &&
        item.different_group_photo_number_id &&
        item.photo_number !== item.different_group_photo_number &&
        item.photo_number_id !== item.different_group_photo_number_id
      ) {
        await update_photo_details(item.different_group_photo_number_id, item.different_group_photo_number, item.no_of_sheets);
      }

      updated_item_details.push({
        ...item,
        order_id: order_details_result?._id,
        product_category: `${order_details_result?.product_category} ${item.base_type}`,
        created_by: item.created_by ? item?.created_by : userDetails?._id,
        updated_by: userDetails?._id,
        createdAt: item.createdAt ? item?.createdAt : new Date(),
        updatedAt: new Date(),
      });
    }

    // const updated_item_details = item_details?.map((item) => {
    //   item.order_id = order_details_result?._id;
    //   item.product_category = order_details_result?.base_type;
    //   item.created_by = item.created_by ? item?.created_by : userDetails?._id;
    //   item.updated_by = userDetails?._id;
    //   item.createdAt = item.createdAt ? item?.createdAt : new Date();
    //   item.updatedAt = new Date();
    //   return item;
    // });

    const create_order_result =
      await decorative_order_item_details_model?.insertMany(
        updated_item_details,
        { session }
      );
    if (create_order_result?.length === 0) {
      throw new ApiError(
        'Failed to add order item details',
        StatusCodes?.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Order Updated Successfully.',
      { order_details: order_details_result, item_details: create_order_result }
    );
    await session?.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session?.endSession();
  }
});

export const update_order_item_status_by_item_id = catchAsync(
  async (req, res) => {
    const { id } = req.params;
    const { _id } = req.userDetails;

    const update_result = await decorative_order_item_details_model?.updateOne(
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

export const fetch_all_decorative_order_items = catchAsync(
  async (req, res, next) => {
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
      aggMatch,
      aggSort,
      aggSkip,
      aggLimit,
    ];

    const result =
      await decorative_order_item_details_model?.aggregate(list_aggregate);

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
      await decorative_order_item_details_model.aggregate(count_total_docs);

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
  }
);

export const fetch_all_decorative_order_items_by_order_id = catchAsync(
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
          from: 'decorative_order_item_details',
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

// export const fetch_customer_previous_rate = catchAsync(async(req,res) => {

// })

export const downloadPDF = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid or missing order ID', StatusCodes.BAD_REQUEST);
  }

  const action_map = {
    work_order_standard_4: {
      templateFileName: 'workOrder4',
      filenamePrefix: 'WorkOrder_Standard_4',
    },
    work_order_balance: {
      templateFileName: 'workOrderBalanceOrder',
      filenamePrefix: 'WorkOrder_Balance',
    },
    work_order_priority_issue_2: {
      templateFileName: 'workOrder2PriorityIssue',
      filenamePrefix: 'WorkOrder_Priority_Issue_2',
    },
    work_order_priority_2: {
      templateFileName: 'workOrder2Priority',
      filenamePrefix: 'WorkOrder_Priority_2',
    },
    work_order_1: {
      templateFileName: 'workOrder1',
      filenamePrefix: 'WorkOrder_1',
    },
    work_order_issue_3: {
      templateFileName: 'workOrder3Issue',
      filenamePrefix: 'WorkOrder_Issue_3',
    },
    work_order_priority_4: {
      templateFileName: 'workOrder4Priority',
      filenamePrefix: 'WorkOrder_Priority_4',
    },
  };

  const actionConfig = action_map[type];
  if (!actionConfig) {
    return res.status(400).json({
      status: 'error',
      message: 'Error generating PDF',
    });
  }

  const { templateFileName, filenamePrefix } = actionConfig;

  const order = await OrderModel.findById(id).lean();
  // const items = await decorative_order_item_details_model.find({ order_id: id }).lean();
  const items = await decorative_order_item_details_model.aggregate([
    {
      $match: {
        order_id: new mongoose.Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: 'photos',
        localField: 'photo_number_id',
        foreignField: '_id',
        as: 'photo_data',
      },
    },
    {
      $unwind: {
        path: '$photo_data',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        group_no: '$photo_data.group_no',
        character: '$photo_data.character_name',
      },
    },
  ]);

  if (!order || items.length === 0) {
    throw new ApiError('Order or order items not found', StatusCodes.NOT_FOUND);
  }

  order.orderDateFormatted = moment(order.orderDate).format('DD/MM/YYYY');
  const firstItem = items[0] || {};
  const base_type = firstItem.base_type || 'N/A';
  const base_sub_category = firstItem.base_sub_category_name || 'N/A';

  const groupItemsBySeries = (items) => {
    const groupedMap = {};

    for (const item of items) {
      const series = item.series_name || 'UNKNOWN';
      if (!groupedMap[series]) {
        groupedMap[series] = [];
      }
      groupedMap[series].push(item);
    }

    return Object.entries(groupedMap).map(([series_name, items]) => {
      const totalRows = items.length;

      const itemsWithFlags = items.map((item, index) => ({
        ...item,
        showSeriesName: index === 0,
        rowspan: totalRows,
      }));

      return {
        series_name,
        items: itemsWithFlags,
      };
    });
  };

  const groupedSeries = groupItemsBySeries(items);

  const pdfBuffer = await generatePDFBuffer({
    templateName: templateFileName,
    data: {
      order,
      items,
      base_type,
      groupedSeries,
      base_sub_category,
      totalSheets: items.reduce(
        (sum, item) => sum + (item.no_of_sheets || 0),
        0
      ),
      totalSqMtr: items.reduce((sum, item) => sum + (item.sqm || 0), 0),
      totalAmount: items.reduce((sum, item) => sum + (item.amount || 0), 0),
    },
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=${filenamePrefix}-${order.order_no}.pdf`,
    'Content-Length': pdfBuffer.length,
  });

  return res.status(StatusCodes.OK).end(pdfBuffer);
});

export const getPreviousRate = catchAsync(async (req, res, next) => {
  const { sales_item_name, customer_id } = req.query;

  if (!sales_item_name || !customer_id) {
    return res.status(400).json({
      status: false,
      message: 'Missing required fields: Sales Item Name or Customer Name',
    });
  }

  const result = await decorative_order_item_details_model.aggregate([
    {
      $match: {
        sales_item_name,
      },
    },
    {
      $lookup: {
        from: 'orders',
        localField: 'order_id',
        foreignField: '_id',
        as: 'order_details',
      },
    },
    {
      $unwind: '$order_details',
    },
    {
      $match: {
        'order_details.customer_id': mongoose.Types.ObjectId.createFromHexString(customer_id),
      },
    },
    {
      $sort: {
        'order_details.order_no': -1, // latest order first
      },
    },
    {
      $limit: 1, // ✅ Only get the latest one
    },
    {
      $project: {
        _id: 0,
        rate_per_sqm: 1,
        orderDate: '$order_details.orderDate',
        customer_id: '$order_details.customer_id',
        order_id: 1,
        sales_item_name: 1,
      },
    },
  ]);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Previous rate fetched successfully',
    result?.[0] || null // ✅ Return single object or null
  );

  return res.status(StatusCodes.OK).json(response);
});
