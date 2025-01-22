import mongoose from 'mongoose';
import { OrderModel } from '../../database/schema/order/orders.schema.js';
import { DispatchModel } from '../../database/schema/dispatch/dispatch.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';

export const AddOrder = catchAsync(async (req, res, next) => {
  if (req.body.order_type === 'raw' && !req.body.raw_order_details) {
    return res.status(400).json({
      errors: [{ msg: "Raw order details are required for 'raw' order type" }],
    });
  }
  if (req.body.order_type === 'group' && !req.body.group_order_details) {
    return res.status(400).json({
      errors: [
        { msg: "Group order details are required for 'group' order type" },
      ],
    });
  }
  const authUserDetail = req.userDetails;
  const data = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newOrder = new OrderModel({
      ...data,
      created_employee_id: authUserDetail._id,
    });

    await newOrder.validate();

    await newOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    res
      .status(201)
      .json({ message: 'Order added successfully', order: newOrder });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error adding order:', error);
    res
      .status(500)
      .json({ message: 'Failed to add order', error: error.message });
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
