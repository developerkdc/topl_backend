import mongoose from 'mongoose';
import catchAsync from '../../utils/errors/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';
import dispatchModel from '../../database/schema/dispatch/dispatch.schema.js';
import ApiError from '../../utils/errors/apiError.js';
import dispatchItemsModel from '../../database/schema/dispatch/dispatch_items.schema.js';
import { dispatch_status, order_category, order_item_status, order_status } from '../../database/Utils/constants/constants.js';
import {
  packing_done_items_model,
  packing_done_other_details_model,
} from '../../database/schema/packing/packing_done/packing_done.schema.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../utils/dymanicFilter.js';
import { decorative_order_item_details_model } from '../../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import series_product_order_item_details_model from '../../database/schema/order/series_product_order/series_product_order_item_details.schema.js';
import { OrderModel } from '../../database/schema/order/orders.schema.js';
import { RawOrderItemDetailsModel } from '../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { pipeline } from 'stream';


const order_items_models = {
  [order_category.raw]: RawOrderItemDetailsModel,
  [order_category.decorative]: decorative_order_item_details_model,
  [order_category.series_product]: series_product_order_item_details_model,
};

export const load_packing_details = catchAsync(async (req, res, next) => {
  const userDetails = req.userDetails;
  let { packing_done_ids } = req.body;
  if (!packing_done_ids || !Array.isArray(packing_done_ids)) {
    throw new ApiError(
      'Packing done IDs must be an array',
      StatusCodes.BAD_REQUEST
    );
  }
  if (packing_done_ids?.length === 0) {
    throw new ApiError(
      'Packing done IDs are required',
      StatusCodes.BAD_REQUEST
    );
  }

  packing_done_ids = packing_done_ids.map((item) =>
    mongoose.Types.ObjectId.createFromHexString(item)
  );
  // Fetch packing done other details
  const aggMatchPackingDetails = {
    $match: {
      packing_done_other_details_id: {
        $in: packing_done_ids,
      },
    },
  };
  const aggLookupPackingDetails = {
    $lookup: {
      from: 'packing_done_other_details',
      localField: 'packing_done_other_details_id',
      foreignField: '_id',
      as: 'packing_done_other_details',
    },
  };
  const aggUnwindPackingDetails = {
    $unwind: {
      path: '$packing_done_other_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggOrderRelatedData = [
    {
      $lookup: {
        from: 'orders',
        localField: 'order_id',
        pipeline: [
          {
            $project: {
              order_no: 1,
              owner_name: 1,
              orderDate: 1,
              order_category: 1,
              series_product: 1,
            },
          },
        ],
        foreignField: '_id',
        as: 'order_details',
      },
    },
    {
      $unwind: {
        path: '$order_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'raw_order_item_details',
        localField: 'order_item_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              item_no: 1,
              order_id: 1,
              item_name: 1,
              item_sub_category_name: 1,
              product_category: 1,
              rate: 1,
              sales_item_name: 1,
              number_of_rolls: 1,
            },
          },
        ],
        as: 'raw_order_item_details',
      },
    },
    {
      $unwind: {
        path: '$raw_order_item_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'series_product_order_item_details',
        localField: 'order_item_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              item_no: 1,
              order_id: 1,
              item_name: 1,
              item_sub_category_name: 1,
              product_category: 1,
              rate_per_sqm: 1,
              sales_item_name: 1,
              photo_no: 1,
              rate: 1,
            },
          },
        ],
        as: 'series_product_order_item_details',
      },
    },
    {
      $unwind: {
        path: '$series_product_order_item_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'decorative_order_item_details',
        localField: 'order_item_id',
        pipeline: [
          {
            $project: {
              item_no: 1,
              order_id: 1,
              item_name: 1,
              item_sub_category_name: 1,
              product_category: 1,
              rate: 1,
              rate_per_sqm: 1,
              sales_item_name: 1,
            },
          },
        ],
        foreignField: '_id',
        as: 'decorative_order_item_details',
      },
    },
    {
      $unwind: {
        path: '$decorative_order_item_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        order_item_details: {
          $switch: {
            branches: [
              {
                case: {
                  $ne: [{ $type: '$decorative_order_item_details' }, 'missing'],
                },
                then: '$decorative_order_item_details',
              },
              {
                case: {
                  $ne: [
                    { $type: '$series_product_order_item_details' },
                    'missing',
                  ],
                },
                then: '$series_product_order_item_details',
              },
              {
                case: {
                  $ne: [{ $type: '$raw_order_item_details' }, 'missing'],
                },
                then: '$raw_order_item_details',
              },
            ],
            default: null,
          },
        },
      },
    },
  ];

  const fetch_packing_items_details = await packing_done_items_model.aggregate([
    aggMatchPackingDetails,
    aggLookupPackingDetails,
    aggUnwindPackingDetails,
    ...aggOrderRelatedData,
  ]);

  const response = new ApiResponse(
    StatusCodes.OK,
    ' Successfully',
    fetch_packing_items_details
  );
  return res.status(StatusCodes.OK).json(response);
});

export const add_dispatch_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { dispatch_details, dispatch_items_details } = req.body;
    if (!dispatch_details) {
      throw new ApiError('Dispatch data required', StatusCodes.BAD_REQUEST);
    }
    if (!dispatch_items_details || !Array.isArray(dispatch_items_details)) {
      throw new ApiError(
        'Dispatch items details must be an array',
        StatusCodes.BAD_REQUEST
      );
    }
    if (dispatch_items_details?.length === 0) {
      throw new ApiError(
        'Dispatch items details are required',
        StatusCodes.BAD_REQUEST
      );
    }

    // create dispatch details
    const dispatch_details_data = {
      ...dispatch_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    const [add_dispatch_details_data] = await dispatchModel.create(
      [dispatch_details_data],
      { session }
    );
    if (!add_dispatch_details_data) {
      throw new ApiError(
        'Failed to create dispatch details',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Create dispatch items details
    const dispatch_id = add_dispatch_details_data?._id;
    const dispatch_items_data = dispatch_items_details.map((items) => {
      return {
        ...items,
        dispatch_id: dispatch_id,
        invoice_no: add_dispatch_details_data?.invoice_no,
        created_by: userDetails?._id,
        updated_by: userDetails?._id,
      };
    });
    if (!dispatch_items_data || dispatch_items_data?.length === 0) {
      throw new ApiError(
        'Dispatch items details are required',
        StatusCodes.BAD_REQUEST
      );
    }

    const add_dispatch_items_data = await dispatchItemsModel.insertMany(
      dispatch_items_data,
      { session }
    );
    if (!add_dispatch_items_data || add_dispatch_items_data?.length === 0) {
      throw new ApiError(
        'Failed to create dispatch items',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }


    // update order and order item as closed status
    for (let item of add_dispatch_items_data) {
      const dispatch_no_of_sheets = (item?.no_of_sheets || 0) + (item?.no_of_leaves || 0) + (item?.number_of_rolls || 0) + (item?.quantity || 0);

      const order_items_details = await order_items_models[item?.order_category].findOneAndUpdate({
        _id: item?.order_item_id,
        order_id: item?.order_id,
      }, {
        $inc: {
          dispatch_no_of_sheets: dispatch_no_of_sheets
        }
      }, { new: true, session: session });

      if (!order_items_details) {
        throw new ApiError(`Failed to update dispatch no of sheets in order for ${item?.order_category}`, StatusCodes.BAD_REQUEST);
      }

      if (order_items_details?.no_of_sheets === order_items_details?.dispatch_no_of_sheets) {
        const order_item_closed = await order_items_models[item?.order_category].findOneAndUpdate({
          _id: order_items_details?._id,
          order_id: order_items_details?.order_id,
          no_of_sheets: order_items_details?.dispatch_no_of_sheets
        }, {
          $set: {
            item_status: order_item_status.closed
          }
        }, { new: true, session: session });

        if (!order_item_closed) {
          throw new ApiError(`Failed to update order item status as closed`, StatusCodes.BAD_REQUEST);
        }

        const fetch_order_item_closed = await order_items_models[item?.order_category].find({
          order_id: order_items_details?.order_id,
          item_status: { $ne: null }
        });

        if (fetch_order_item_closed?.length <= 0) {
          const order_closed = await OrderModel.findOneAndUpdate({
            _id: order_items_details?.order_id
          }, {
            $set: {
              order_status: order_status.closed
            }
          }, { new: true, session });

          if (!order_closed) {
            throw new ApiError(`Failed to update order status as closed`, StatusCodes.BAD_REQUEST);
          }

        }
      }
    }

    const packing_done_ids = add_dispatch_details_data?.packing_done_ids;
    if (packing_done_ids?.length <= 0) {
      throw new ApiError(
        'Packing done IDs are not allowed for dispatch',
        StatusCodes.BAD_REQUEST
      );
    }
    const packing_done_ids_data = packing_done_ids.map(
      (item) => item?.packing_done_other_details_id
    );

    // Fetch packing done other details
    const packing_done_other_details = await packing_done_other_details_model
      .find({
        _id: { $in: packing_done_ids_data },
        isEditable: true,
        is_dispatch_done: false,
      })
      .session(session);

    if (
      !packing_done_other_details ||
      packing_done_other_details?.length === 0
    ) {
      throw new ApiError(
        'Packing done details not found or already dispatch for some packing id',
        StatusCodes.NOT_FOUND
      );
    }
    // Check if all packing done IDs are found
    if (packing_done_other_details?.length !== packing_done_ids_data?.length) {
      throw new ApiError(
        'Already dispatch for some packing id',
        StatusCodes.NOT_FOUND
      );
    }

    // Update packing done other details
    const update_packing_done_details =
      await packing_done_other_details_model.updateMany(
        { _id: { $in: packing_done_ids_data } },
        {
          $set: {
            is_dispatch_done: true,
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_packing_done_details?.matchedCount === 0) {
      throw new ApiError(
        'Packing done details not found',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_packing_done_details?.acknowledged ||
      update_packing_done_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update packing done details',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Dispatched Successfully',
      {
        dispatch_details: add_dispatch_details_data,
        dispatch_items_details: add_dispatch_items_data,
      }
    );
    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const edit_dispatch_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { dispatch_id } = req.params;
    if (!dispatch_id || !mongoose.isValidObjectId(dispatch_id)) {
      throw new ApiError('Invalid Dispatch ID', StatusCodes.BAD_REQUEST);
    }
    const { dispatch_details, dispatch_items_details } = req.body;
    if (!dispatch_details) {
      throw new ApiError('Dispatch data required', StatusCodes.BAD_REQUEST);
    }
    if (!dispatch_items_details || !Array.isArray(dispatch_items_details)) {
      throw new ApiError(
        'Dispatch items details must be an array',
        StatusCodes.BAD_REQUEST
      );
    }
    if (dispatch_items_details?.length === 0) {
      throw new ApiError(
        'Dispatch items details are required',
        StatusCodes.BAD_REQUEST
      );
    }

    // Fetch existing dispatch details
    const fetch_dipsatch_details = await dispatchModel
      .findById(dispatch_id)
      .session(session);
    if (!fetch_dipsatch_details) {
      throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
    }
    if (fetch_dipsatch_details?.dispatch_status === dispatch_status.cancelled) {
      throw new ApiError('Dispatch already cancelled', StatusCodes.BAD_REQUEST);
    }
    const fetch_dispatch_items_details = await dispatchItemsModel
      .find({ dispatch_id: dispatch_id })
      .session(session);
    if (
      !fetch_dispatch_items_details ||
      fetch_dispatch_items_details?.length === 0
    ) {
      throw new ApiError(
        'Dispatch items details not found',
        StatusCodes.NOT_FOUND
      );
    }

    // revert order status
    for (let item of fetch_dispatch_items_details) {
      const dispatch_no_of_sheets = (item?.no_of_sheets || 0) + (item?.no_of_leaves || 0) + (item?.number_of_rolls || 0);

      const order_items_details = await order_items_models[item?.order_category].findOneAndUpdate({
        _id: item?.order_item_id,
        order_id: item?.order_id,
      }, {
        $inc: {
          dispatch_no_of_sheets: -dispatch_no_of_sheets
        }
      }, { new: true, session: session });

      if (!order_items_details) {
        throw new ApiError(`Failed to update dispatch no of sheets in order for ${item?.order_category}`, StatusCodes.BAD_REQUEST);
      }

      const update_order_item = await order_items_models[item?.order_category].findOneAndUpdate({
        _id: order_items_details?._id,
        order_id: order_items_details?.order_id,
        // no_of_sheets: order_items_details?.dispatch_no_of_sheets
        no_of_sheets: order_items_details?.no_of_sheets
      }, {
        $set: {
          item_status: null
        }
      }, { new: true, session: session });

      if (!update_order_item) {
        throw new ApiError(`Failed to update order item status as closed`, StatusCodes.BAD_REQUEST);
      }

      const update_order = await OrderModel.findOneAndUpdate({
        _id: order_items_details?.order_id
      }, {
        $set: {
          order_status: null
        }
      }, { new: true, session });

      if (!update_order) {
        throw new ApiError(`Failed to update order status as closed`, StatusCodes.BAD_REQUEST);
      }
    }

    const update_dispatch_details = {
      ...dispatch_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    const update_dispatch_details_data = await dispatchModel.findOneAndUpdate(
      {
        _id: dispatch_id,
      },
      {
        $set: update_dispatch_details,
      },
      { session, new: true, runValidators: true }
    );

    if (!update_dispatch_details_data) {
      throw new ApiError(
        'Failed to update dispatch details',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // delete existing dispatch items
    const delete_dispatch_items = await dispatchItemsModel.deleteMany(
      { dispatch_id: dispatch_id },
      { session }
    );
    if (
      !delete_dispatch_items?.acknowledged ||
      delete_dispatch_items?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete existing dispatch items',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Create new dispatch items details
    const dispatch_items_data = dispatch_items_details.map((items) => {
      items.dispatch_id = update_dispatch_details_data?._id;
      items.invoice_no = update_dispatch_details_data?.invoice_no;
      items.created_by = items.created_by ? items.created_by : userDetails?._id;
      items.updated_by = userDetails?._id;
      items.createdAt = items.createdAt ? items.createdAt : new Date();
      items.updatedAt = new Date();
      return items;
    });
    if (!dispatch_items_data || dispatch_items_data?.length === 0) {
      throw new ApiError(
        'Dispatch items details are required',
        StatusCodes.BAD_REQUEST
      );
    }

    const add_dispatch_items_data = await dispatchItemsModel.insertMany(
      dispatch_items_data,
      { session }
    );
    if (!add_dispatch_items_data || add_dispatch_items_data?.length === 0) {
      throw new ApiError(
        'Failed to create dispatch items',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }


    // update order and order item as closed status
    for (let item of add_dispatch_items_data) {
      const dispatch_no_of_sheets = (item?.no_of_sheets || 0) + (item?.no_of_leaves || 0) + (item?.number_of_rolls || 0);

      const order_items_details = await order_items_models[item?.order_category].findOneAndUpdate({
        _id: item?.order_item_id,
        order_id: item?.order_id,
      }, {
        $inc: {
          dispatch_no_of_sheets: dispatch_no_of_sheets
        }
      }, { new: true, session: session });

      if (!order_items_details) {
        throw new ApiError(`Failed to update dispatch no of sheets in order for ${item?.order_category}`, StatusCodes.BAD_REQUEST);
      }

      if (order_items_details?.no_of_sheets === order_items_details?.dispatch_no_of_sheets) {
        const order_item_closed = await order_items_models[item?.order_category].findOneAndUpdate({
          _id: order_items_details?._id,
          order_id: order_items_details?.order_id,
          no_of_sheets: order_items_details?.dispatch_no_of_sheets
        }, {
          $set: {
            item_status: order_item_status.closed
          }
        }, { new: true, session: session });

        if (!order_item_closed) {
          throw new ApiError(`Failed to update order item status as closed`, StatusCodes.BAD_REQUEST);
        }

        const fetch_order_item_closed = await order_items_models[item?.order_category].find({
          order_id: order_items_details?.order_id,
          item_status: { $ne: null }
        });

        if (fetch_order_item_closed?.length <= 0) {
          const order_closed = await OrderModel.findOneAndUpdate({
            _id: order_items_details?.order_id
          }, {
            $set: {
              order_status: order_status.closed
            }
          }, { new: true, session });

          if (!order_closed) {
            throw new ApiError(`Failed to update order status as closed`, StatusCodes.BAD_REQUEST);
          }

        }
      }
    }


    // Update packing done other details
    const prev_packing_done_ids = fetch_dipsatch_details?.packing_done_ids;
    const prev_packing_done_ids_data = prev_packing_done_ids.map(
      (item) => item?.packing_done_other_details_id
    );
    const prev_update_packing_done_details =
      await packing_done_other_details_model.updateMany(
        { _id: { $in: prev_packing_done_ids_data } },
        {
          $set: {
            is_dispatch_done: false,
            isEditable: true,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (prev_update_packing_done_details?.matchedCount === 0) {
      throw new ApiError(
        'Packing done details not found',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !prev_update_packing_done_details?.acknowledged ||
      prev_update_packing_done_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update packing done details',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Update packing done other details with new packing done IDs
    const packing_done_ids = update_dispatch_details_data?.packing_done_ids;
    if (packing_done_ids?.length <= 0) {
      throw new ApiError(
        'Packing done IDs are not allowed for dispatch',
        StatusCodes.BAD_REQUEST
      );
    }
    const packing_done_ids_data = packing_done_ids.map(
      (item) => item?.packing_done_other_details_id
    );

    const alreadyDispatched = await packing_done_other_details_model.find({
      _id: { $in: packing_done_ids_data },
      is_dispatch_done: true,
      dispatch_id: { $ne: dispatch_id }
    }).session(session);

    if (alreadyDispatched?.length > 0) {
      throw new ApiError(
        'Packing done details not found or already dispatch for some packing id',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_packing_done_details =
      await packing_done_other_details_model.updateMany(
        { _id: { $in: packing_done_ids_data } },
        {
          $set: {
            is_dispatch_done: true,
            isEditable: false,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_packing_done_details?.matchedCount === 0) {
      throw new ApiError(
        'Packing done details not found',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_packing_done_details?.acknowledged ||
      update_packing_done_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update packing done details',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Dispatched Updated Successfully',
      {
        dispatch_details: update_dispatch_details_data,
        dispatch_items_details: add_dispatch_items_data,
      }
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const revert_dispatch_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { dispatch_id } = req.params;
    if (!dispatch_id || !mongoose.isValidObjectId(dispatch_id)) {
      throw new ApiError('Invalid Dispatch ID', StatusCodes.BAD_REQUEST);
    }

    const fetch_dipsatch_details = await dispatchModel
      .findOne({ _id: dispatch_id })
      .session(session);
    if (!fetch_dipsatch_details) {
      throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
    }

    if (fetch_dipsatch_details?.dispatch_status === dispatch_status.cancelled) {
      throw new ApiError('Dispatch already cancelled', StatusCodes.BAD_REQUEST);
    }

    // delete dispatch details
    const delete_dispatch_details = await dispatchModel.deleteOne(
      { _id: dispatch_id },
      { session }
    );
    if (
      !delete_dispatch_details?.acknowledged ||
      delete_dispatch_details?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete dispatch details',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }


    // revert order status 
    const dispatch_items_details = await dispatchItemsModel.find(
      { dispatch_id: dispatch_id },
    ).session(session);

    for (let item of dispatch_items_details) {
      const dispatch_no_of_sheets = (item?.no_of_sheets || 0) + (item?.no_of_leaves || 0) + (item?.number_of_rolls || 0);

      const order_items_details = await order_items_models[item?.order_category].findOneAndUpdate({
        _id: item?.order_item_id,
        order_id: item?.order_id,
      }, {
        $inc: {
          dispatch_no_of_sheets: -dispatch_no_of_sheets
        }
      }, { new: true, session: session });

      if (!order_items_details) {
        throw new ApiError(`Failed to update dispatch no of sheets in order for ${item?.order_category}`, StatusCodes.BAD_REQUEST);
      }

      const update_order_item = await order_items_models[item?.order_category].findOneAndUpdate({
        _id: order_items_details?._id,
        order_id: order_items_details?.order_id,
      }, {
        $set: {
          item_status: null
        }
      }, { new: true, session: session });

      if (!update_order_item) {
        throw new ApiError(`Failed to update order item status as closed`, StatusCodes.BAD_REQUEST);
      }

      const update_order = await OrderModel.findOneAndUpdate({
        _id: order_items_details?.order_id
      }, {
        $set: {
          order_status: null
        }
      }, { new: true, session });

      if (!update_order) {
        throw new ApiError(`Failed to update order status as closed`, StatusCodes.BAD_REQUEST);
      }
    }

    // delete dispatch items details
    const delete_dispatch_items = await dispatchItemsModel.deleteMany(
      { dispatch_id: dispatch_id },
      { session }
    );
    if (
      !delete_dispatch_items?.acknowledged ||
      delete_dispatch_items?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete dispatch items',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    };


    // Update packing done other details
    const packing_done_ids = fetch_dipsatch_details?.packing_done_ids;
    if (packing_done_ids?.length <= 0) {
      throw new ApiError(
        'Packing done IDs are not allowed for dispatch',
        StatusCodes.BAD_REQUEST
      );
    }
    const packing_done_ids_data = packing_done_ids.map(
      (item) => item?.packing_done_other_details_id
    );
    const update_packing_done_details =
      await packing_done_other_details_model.updateMany(
        { _id: { $in: packing_done_ids_data } },
        {
          $set: {
            is_dispatch_done: false,
            isEditable: true,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_packing_done_details?.matchedCount === 0) {
      throw new ApiError(
        'Packing done details not found',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_packing_done_details?.acknowledged ||
      update_packing_done_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update packing done details',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Dispatched Revert Successfully',
      {
        delete_dispatch_details: delete_dispatch_details,
        delete_dispatch_items_details: delete_dispatch_items,
      }
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const cancel_dispatch_details = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userDetails = req.userDetails;
    const { dispatch_id } = req.params;
    if (!dispatch_id || !mongoose.isValidObjectId(dispatch_id)) {
      throw new ApiError('Invalid Dispatch ID', StatusCodes.BAD_REQUEST);
    }

    const fetch_dipsatch_details = await dispatchModel
      .findOne({ _id: dispatch_id })
      .session(session);
    if (!fetch_dipsatch_details) {
      throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
    }

    if (fetch_dipsatch_details?.dispatch_status === dispatch_status.cancelled) {
      throw new ApiError('Dispatch already cancelled', StatusCodes.BAD_REQUEST);
    }
    if (fetch_dipsatch_details?.irn_number) {
      throw new ApiError(
        'Dispatch cannot be cancelled if IRN number is generated',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_dispatch_details_data = await dispatchModel.findOneAndUpdate(
      {
        _id: dispatch_id,
      },
      {
        $set: {
          dispatch_status: dispatch_status.cancelled,
          updated_by: userDetails?._id,
        },
      },
      { session, new: true, runValidators: true }
    );

    if (!update_dispatch_details_data) {
      throw new ApiError(
        'Failed to update dispatch details',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // revert order status 
    const dispatch_items_details = await dispatchItemsModel.find(
      { dispatch_id: dispatch_id },
    ).session(session);

    for (let item of dispatch_items_details) {
      const dispatch_no_of_sheets = (item?.no_of_sheets || 0) + (item?.no_of_leaves || 0) + (item?.number_of_rolls || 0);

      const order_items_details = await order_items_models[item?.order_category].findOneAndUpdate({
        _id: item?.order_item_id,
        order_id: item?.order_id,
      }, {
        $inc: {
          dispatch_no_of_sheets: dispatch_no_of_sheets
        }
      }, { new: true, session: session });

      if (!order_items_details) {
        throw new ApiError(`Failed to update dispatch no of sheets in order for ${item?.order_category}`, StatusCodes.BAD_REQUEST);
      }

      const update_order_item = await order_items_models[item?.order_category].findOneAndUpdate({
        _id: order_items_details?._id,
        order_id: order_items_details?.order_id,
      }, {
        $set: {
          item_status: null
        }
      }, { new: true, session: session });

      if (!update_order_item) {
        throw new ApiError(`Failed to update order item status as closed`, StatusCodes.BAD_REQUEST);
      }

      const update_order = await OrderModel.findOneAndUpdate({
        _id: order_items_details?.order_id
      }, {
        $set: {
          order_status: null
        }
      }, { new: true, session });

      if (!update_order) {
        throw new ApiError(`Failed to update order status as closed`, StatusCodes.BAD_REQUEST);
      }
    }

    // Update packing done other details
    const packing_done_ids = update_dispatch_details_data?.packing_done_ids;
    if (packing_done_ids?.length <= 0) {
      throw new ApiError(
        'Packing done IDs are not allowed for dispatch',
        StatusCodes.BAD_REQUEST
      );
    }
    const packing_done_ids_data = packing_done_ids.map(
      (item) => item?.packing_done_other_details_id
    );
    const update_packing_done_details =
      await packing_done_other_details_model.updateMany(
        { _id: { $in: packing_done_ids_data } },
        {
          $set: {
            is_dispatch_done: false,
            isEditable: true,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
    if (update_packing_done_details?.matchedCount === 0) {
      throw new ApiError(
        'Packing done details not found',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_packing_done_details?.acknowledged ||
      update_packing_done_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update packing done details',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    await session.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Dispatched Cancelled Successfully',
      update_dispatch_details_data
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const fetch_all_details_by_dispatch_id = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;

    if (!id && !mongoose.isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
    }

    const pipeline = [
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(id),
        },
      },
      {
        $lookup: {
          from: 'dispatch_items',
          localField: '_id',
          foreignField: 'dispatch_id',
          as: 'dispatch_items_details',
        },
      },
    ];
    const result = await dispatchModel.aggregate(pipeline);
    const dispatchDetails = result?.[0];

    const response = new ApiResponse(
      StatusCodes.OK,
      'Dispatch Details Fetched Successfully',
      dispatchDetails
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_single_dispatch_items = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;

    if (!id && !mongoose.isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.NOT_FOUND);
    }

    const pipeline = [
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(id),
        },
      },
      {
        $lookup: {
          from: 'dispatches',
          localField: 'dispatch_id',
          foreignField: '_id',
          as: 'dispatch_details',
        },
      },
      {
        $unwind: {
          path: '$dispatch_details',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];
    const result = await dispatchItemsModel.aggregate(pipeline);
    const dispatchItem = result?.[0];

    const response = new ApiResponse(
      StatusCodes.OK,
      'Dispatch Item Details Fetched Successfully',
      dispatchItem
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_all_dispatch_details = catchAsync(async (req, res, next) => {
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

  const match_common_query = {
    $match: {},
  };

  const match_query = {
    ...search_query,
    ...filterData,
  };

  const aggLookupDispatchItemsDetails = {
    $lookup: {
      from: 'dispatch_items',
      localField: '_id',
      foreignField: 'dispatch_id',
      as: 'dispatch_items_details',
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
  const aggUnwindDispatchItemsDetails = {
    $unwind: {
      path: '$dispatch_items_details',
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
  const aggAddInvoiceSort = {
    $addFields: {
      invoice_sort_key: {
        $add: [
          {
            $multiply: [
              {
                $convert: {
                  input: {
                    $getField: {
                      field: "match",
                      input: {
                        $regexFind: {
                          input: { $ifNull: ['$invoice_no', '0'] },
                          regex: '(?<=/)(\\d{2})',
                        },
                      },
                    },
                  },
                  to: "int",
                  onError: 0,
                  onNull: 0,
                },
              },
              1000,
            ],
          },
          {
            $convert: {
              input: {
                $getField: {
                  field: "match",
                  input: {
                    $regexFind: {
                      input: { $ifNull: ['$invoice_no', '0'] },
                      regex: '^[0-9]+',
                    },
                  },
                },
              },
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
        ],
      },
    },
  };
  const aggSort = {
    $sort:
      sortBy === 'invoice_no'
        ? {
          invoice_sort_key: sort === 'desc' ? -1 : 1,
          invoice_no: sort === 'desc' ? -1 : 1,
        }
        : { [sortBy]: sort === 'desc' ? -1 : 1 },
  };
  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };
  const aggLimit = {
    $limit: parseInt(limit),
  };

  const list_aggregate = [
    // match_common_query,
    aggLookupDispatchItemsDetails,
    // aggUnwindDispatchItemsDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatedUser,
    aggMatch,
    aggAddInvoiceSort,
    aggSort,
    aggSkip,
    aggLimit,
  ];

  const result = await dispatchModel.aggregate(list_aggregate);

  const aggCount = {
    $count: 'totalCount',
  };

  const count_total_docs = [
    // match_common_query,
    aggLookupDispatchItemsDetails,
    // aggUnwindDispatchItemsDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatedUser,
    aggMatch,
    aggCount,
  ];

  const total_docs = await dispatchModel.aggregate(count_total_docs);

  const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(200, 'Data Fetched Successfully', {
    data: result,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
});

export const fetch_all_dispatch_items_details = catchAsync(
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

    const match_common_query = {
      $match: {},
    };

    const match_query = {
      ...search_query,
      ...filterData,
    };

    const aggLookupDispatchDetails = {
      $lookup: {
        from: 'dispatches',
        localField: 'dispatch_id',
        foreignField: '_id',
        as: 'dispatch_details',
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
    const aggUnwindDispatchDetails = {
      $unwind: {
        path: '$dispatch_details',
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
      // match_common_query,
      aggLookupDispatchDetails,
      aggUnwindDispatchDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggSort,
      aggSkip,
      aggLimit,
    ];

    const result = await dispatchItemsModel.aggregate(list_aggregate);

    const aggCount = {
      $count: 'totalCount',
    };

    const count_total_docs = [
      // match_common_query,
      aggLookupDispatchDetails,
      aggUnwindDispatchDetails,
      aggCreatedUserDetails,
      aggUpdatedUserDetails,
      aggUnwindCreatedUser,
      aggUnwindUpdatedUser,
      aggMatch,
      aggCount,
    ];

    const total_docs = await dispatchModel.aggregate(count_total_docs);

    const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(200, 'Data Fetched Successfully', {
      data: result,
      totalPages: totalPages,
    });
    return res.status(200).json(response);
  }
);

export const packing_done_dropdown = catchAsync(async (req, res, next) => {
  const { customer_id, order_category, product_type, exclude_dispatched } = req.body;

  const required_fields = ['customer_id', 'order_category', 'product_type'];
  for (const field of required_fields) {
    if (!req.body[field]) {
      return next(
        new ApiError(
          `${field.replace(/_/g, ' ')} is required.`,
          StatusCodes.BAD_REQUEST
        )
      );
    }
  }

  const match = {
    customer_id: mongoose.Types.ObjectId.createFromHexString(customer_id),
  }

  if (order_category && order_category.length > 0) {
    match.order_category = { $in: order_category };
  }

  if (product_type && product_type.length > 0) {
    match.product_type = { $in: product_type };
  }

  if (exclude_dispatched) {
    match.is_dispatch_done = { $ne: true };
  }

  const pipeline = [
    {
      $match: match,
    },
    {
      $sort: {
        packing_id: -1,
      },
    },
    {
      $project: {
        packing_id: 1,
        packing_date: 1,
        is_dispatch_done: 1,
      },
    },
  ];
  const result = await packing_done_other_details_model.aggregate(pipeline);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Packing Done Fetched Successfully',
    result
  );

  return res.status(StatusCodes.OK).json(response);
});

export const generate_invoice_no = catchAsync(async (req, res, next) => {
  const getFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const fyStartYear = month >= 3 ? year : year - 1;
    const fyEndYear = fyStartYear + 1;
    return `${fyStartYear.toString().slice(-2)}-${fyEndYear.toString().slice(-2)}`;
  };

  const currentFY = getFinancialYear();

  const latestDispatch = await dispatchModel
    .findOne({}, { invoice_no: 1 })
    .sort({ createdAt: -1 });

  let latest_invoice_no;

  if (latestDispatch?.invoice_no) {
    const [seqPart, fyPart] = latestDispatch.invoice_no.split('/');
    const dispatchNumber = parseInt(seqPart);
    latest_invoice_no = fyPart === currentFY ? `${dispatchNumber + 1}/${currentFY}` : `1/${currentFY}`;
  } else {
    latest_invoice_no = `1/${currentFY}`;
  }

  return res.status(200).json({
    success: true,
    message: "Invoice number generated",
    invoice_no: latest_invoice_no,
  });
});

//mobile api
export const fetch_dispatch_details_by_invoice_no = catchAsync(
  async (req, res) => {

    const { invoiceId } = req.body;

    if (!invoiceId) {
      throw new ApiError('Invalid Invoice No', StatusCodes.NOT_FOUND);;
    };
    const pipeline = [
      {
        $match: {
          invoice_no: invoiceId,
        },
      },
      {
        $lookup: {
          from: 'dispatch_items',
          localField: '_id',
          foreignField: 'dispatch_id',
          as: 'dispatch_items_details',
        },
      },

    ]
    const dispatch_details = await dispatchModel.aggregate(pipeline);


    const response = new ApiResponse(
      StatusCodes.OK,
      'Dispatch Details Fetched Successfully',
      dispatch_details
    );
    return res.status(StatusCodes.OK).json(response);
  });

export const fetch_purchase_history = catchAsync(async (req, res) => {
  const { customerId, fromDate, toDate, startRowIndex, maximumRows, strSearch } = req.body;

  for (let field of ['fromDate', 'toDate', 'maximumRows']) {
    if (!req.body[field]) {
      throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
    }
  };

  const match_query = {
    invoice_date_time: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate),
    },
    ...(customerId && {
      customer_id: mongoose.Types.ObjectId.createFromHexString(customerId)
    }),
    ...(strSearch && {
      $or: [
        { invoice_no: { $regex: strSearch, $options: 'i' } },
        { 'customer_details.company_name': { $regex: strSearch, $options: 'i' } },
        { 'customer_details.owner_name': { $regex: strSearch, $options: 'i' } },
        { 'dispatch_item_details.packing_done_id': { $regex: strSearch, $options: 'i' } }
      ]
    })
  }


  const pipeline = [
    {
      $match: match_query
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    {
      $skip: parseInt(startRowIndex),
    },

    {
      $limit: parseInt(maximumRows),
    },
    {
      $lookup: {
        from: 'dispatch_items',
        localField: '_id',
        foreignField: 'dispatch_id',
        as: 'dispatch_items_details',
      },
    },
    {
      $unwind: {
        path: '$dispatch_items_details',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "grouping_done_items_details",
        localField: 'dispatch_items_details.group_no',
        foreignField: 'group_no',
        as: 'grouping_done_item_details'
      }
    },
    {
      $unwind: {
        path: '$grouping_done_item_details',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 0,
        InvoiceId: '$invoice_no',
        OrdrNo: '$dispatch_items_details.order_no',
        InvoiceDate: '$invoice_date_time',
        SalesItemName: '$dispatch_items_details.product_name',
        PhotoNumber: '$grouping_done_item_details.photo_no',
        Length: "$dispatch_items_details.length",
        Width: "$dispatch_items_details.width",
        NoOfSheets: "$dispatch_items_details.no_of_sheets",
        SQMtr: "$dispatch_items_details.sqm",
        Rate: "$dispatch_items_details.rate",
        Amount: "$dispatch_items_details.amount",
      }
    }
  ];

  const result = await dispatchModel.aggregate(pipeline);

  return res.status(StatusCodes.OK).json(result);
})

export const fetch_invoices = catchAsync(async (req, res) => {
  const { customerId, fromDate, toDate, startRowIndex, maximumRows, strSearch } = req.body;

  for (let field of ['fromDate', 'toDate', 'maximumRows']) {
    if (!req.body[field]) {
      throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
    }
  };

  const match_query = {
    invoice_date_time: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate),
    },
    ...(customerId && {
      customer_id: mongoose.Types.ObjectId.createFromHexString(customerId)
    }),
    ...(strSearch && {
      $or: [
        { invoice_no: { $regex: strSearch, $options: 'i' } },
        { 'customer_details.company_name': { $regex: strSearch, $options: 'i' } },
        { 'customer_details.owner_name': { $regex: strSearch, $options: 'i' } },
        { 'dispatch_item_details.packing_done_id': { $regex: strSearch, $options: 'i' } }
      ]
    })
  }


  const pipeline = [
    {
      $match: match_query
    },
    {
      $lookup: {
        from: 'dispatch_items',
        // localField: '_id',
        let: { dispatchId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$dispatch_id', '$$dispatchId'] } } },
          {
            $group: {
              _id: null,
              total_quantity: { $sum: '$no_of_sheets' },
              total_amount: { $sum: '$amount' }
            }
          }
        ],
        // foreignField: 'dispatch_id',
        as: 'dispatch_items_details',
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    {
      $skip: parseInt(startRowIndex),
    },

    {
      $limit: parseInt(maximumRows),
    },
    {
      $project: {
        _id: 0,
        CustomerId: '$customer_details.sr_no',
        InvoiceNo: '$invoice_no',
        InvoiceDate: '$invoice_date_time',
        TotalQuantity: { $arrayElemAt: ['$dispatch_items_details.total_quantity', 0] },
        TotalAmount: { $round: [{ $arrayElemAt: ['$dispatch_items_details.total_amount', 0] }, 2] },
      }
    }
  ];

  const result = await dispatchModel.aggregate(pipeline);

  return res.status(StatusCodes.OK).json(result);
})
export const fetch_packing_details_by_customer_id = catchAsync(async (req, res) => {
  const { customerId, fromDate, toDate, startRowIndex, maximumRows, strSearch } = req.body;

  for (let field of ['fromDate', 'toDate', 'maximumRows']) {
    if (!req.body[field]) {
      throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
    }
  };

  const match_query = {
    invoice_date_time: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate),
    },
    ...(customerId && {
      customer_id: mongoose.Types.ObjectId.createFromHexString(customerId)
    }),
    ...(strSearch && {
      $or: [
        { invoice_no: { $regex: strSearch, $options: 'i' } },
        { 'customer_details.company_name': { $regex: strSearch, $options: 'i' } },
        { 'customer_details.owner_name': { $regex: strSearch, $options: 'i' } },
        { 'packing_details.packing_id': { $regex: strSearch, $options: 'i' } }
      ]
    })
  };



  const pipeline = [
    {
      $match: match_query
    },
    {
      $lookup: {
        from: "dispatch_items",
        localField: "_id",
        foreignField: "dispatch_id",
        as: "dispatch_items"
      }
    },
    {
      $lookup: {
        from: "packing_done_other_details",
        localField: "dispatch_items.packing_done_other_details_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              packing_id: 1,
              packing_date: 1
            }
          }
        ],
        as: "packing_details"
      }
    },
    {
      $unwind: {
        path: "$packing_details",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    {
      $skip: parseInt(startRowIndex),
    },

    {
      $limit: parseInt(maximumRows),
    },

    {
      $project: {
        _id: 0,
        CustomerId: '$customer_details.sr_no',
        InvoiceId: '$invoice_no',
        InvoiceDate: '$invoice_date_time',
        PackingId: "$packing_details.packing_id",
        PackingDate: "$packing_details.packing_date",
        CreatedOn: "$createdAt",
        ModifiedOn: "$updatedAt",
      }
    }
  ];

  const result = await dispatchModel.aggregate(pipeline);

  return res.status(StatusCodes.OK).json(result);
})

export const invoice_no_dropdown = catchAsync(async (req, res, next) => {
  try {
    const InvoiceNo = await dispatchModel.find({}, { _id: 1, invoice_no: 1 }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      result: InvoiceNo.map((i) => ({
        _id: i._id,
        invoice_no: i.invoice_no,
      })),
    });
  }
  catch (err) {
    next(err);
  }
});