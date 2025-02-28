import mongoose from 'mongoose';
import ApiError from '../../utils/errors/apiError.js';
import { OrderModel } from '../../database/schema/order/orders.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../database/schema/order/raw_order_item_details.schema.js';
import ApiResponse from '../../utils/ApiResponse.js';

export const AddRawOrder = catchAsync(async (req, res, next) => {
  const { order_details, item_details } = req.body;
  const authUserDetail = req.userDetails;

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
          created_by: authUserDetail._id,
          updated_by: authUserDetail._id,
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

    console.log(newOrderDetails, 'newOrderDetails');

    // adding item details
    const formattedItemsDetails = item_details.map((item) => ({
      ...item,
      order_id: newOrderDetails._id,
      created_by: authUserDetail._id,
      updated_by: authUserDetail._id,
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

export const ListPendingRawOrders = catchAsync(async (req, res, next) => {
  const { string, boolean, numbers, arrayField } =
    req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = 'updated_at',
    sort = 'desc',
  } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || '';

  let searchQuery = {};
  if (search != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    console.log(new Date(from));
    matchQuery['orderDate'] = { $gte: new Date(from), $lte: new Date(to) };
  }
  const issuedForFinishingView = mongoose.connection.db.collection(
    'order_raw_pending_view'
  );

  const totalDocuments = await issuedForFinishingView.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForFinishingData = await issuedForFinishingView
    .aggregate([
      {
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == 'desc' ? -1 : 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ])
    .toArray();
  return res.status(200).json({
    result: issuedForFinishingData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const ListCompleteRawOrders = catchAsync(async (req, res, next) => {
  const { string, boolean, numbers, arrayField } =
    req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = 'updated_at',
    sort = 'desc',
  } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || '';

  let searchQuery = {};
  if (search != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    console.log(new Date(from));
    matchQuery['orderDate'] = { $gte: new Date(from), $lte: new Date(to) };
  }
  const issuedForFinishingView = mongoose.connection.db.collection(
    'order_raw_complete_view'
  );
  const totalDocuments = await issuedForFinishingView.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForFinishingData = await issuedForFinishingView
    .aggregate([
      {
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == 'desc' ? -1 : 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ])
    .toArray();
  return res.status(200).json({
    result: issuedForFinishingData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const ListPendingGroupOrders = catchAsync(async (req, res, next) => {
  const { string, boolean, numbers, arrayField } =
    req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = 'updated_at',
    sort = 'desc',
  } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || '';

  let searchQuery = {};
  if (search != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    console.log(new Date(from));
    matchQuery['orderDate'] = { $gte: new Date(from), $lte: new Date(to) };
  }
  const issuedForFinishingView = mongoose.connection.db.collection(
    'order_group_pending_view'
  );
  const totalDocuments = await issuedForFinishingView.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForFinishingData = await issuedForFinishingView
    .aggregate([
      {
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == 'desc' ? -1 : 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ])
    .toArray();
  return res.status(200).json({
    result: issuedForFinishingData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const ListCompleteGroupOrders = catchAsync(async (req, res, next) => {
  const { string, boolean, numbers, arrayField } =
    req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = 'updated_at',
    sort = 'desc',
  } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || '';

  let searchQuery = {};
  if (search != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    console.log(new Date(from));
    matchQuery['orderDate'] = { $gte: new Date(from), $lte: new Date(to) };
  }
  const issuedForFinishingView = mongoose.connection.db.collection(
    'order_group_complete_view'
  );
  const totalDocuments = await issuedForFinishingView.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForFinishingData = await issuedForFinishingView
    .aggregate([
      {
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == 'desc' ? -1 : 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ])
    .toArray();
  return res.status(200).json({
    result: issuedForFinishingData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const updateOrder = catchAsync(async (req, res, next) => {
  const { id } = req.query;
  const updates = req.body;

  try {
    const isOrderDispatched = await DispatchModel.findOne({ order_id: id });
    if (isOrderDispatched) {
      return res
        .status(400)
        .json({ message: 'Cannot Update Order Already Dispatched' });
    }
    // Find the order by ID and update it
    const order = await OrderModel.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error('An error occurred while patching the order:', error);
    return res
      .status(500)
      .json({ error: 'An error occurred while patching the order' });
  }
});
