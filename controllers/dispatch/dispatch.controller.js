import mongoose from 'mongoose';
import catchAsync from '../../utils/errors/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { approval_status, StatusCodes } from '../../utils/constants.js';
import dispatchModel from '../../database/schema/dispatch/dispatch.schema.js';
import ApiError from '../../utils/errors/apiError.js';
import dispatchItemsModel from '../../database/schema/dispatch/dispatch_items.schema.js';
import {
  dispatch_status,
  order_category,
  order_item_status,
  order_status,
  transaction_type,
} from '../../database/Utils/constants/constants.js';
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
import { EInvoiceHeaderVariable } from '../../middlewares/eInvoiceAuth.middleware.js';
import moment from 'moment';
import axios from 'axios';
import transporterModel from '../../database/schema/masters/transporter.schema.js';
import { getStateCode } from '../../utils/stateCode.js';
import { EwayBillHeaderVariable } from '../../middlewares/ewaybillAuth.middleware.js';
import errorCodeMapForEwayBill from './errorCodeMapForEwayBill.js';
import approval_dispatch_model from '../../database/schema/dispatch/approval/approval.dispatch.schema.js';
import approval_dispatch_items_model from '../../database/schema/dispatch/approval/approval.dispatch_items.schema.js';

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

  const aggGstandHsn = [
    {
      $lookup: {
        from: "item_categories",
        let: { ptype: "$product_type" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  "$category",
                  {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$$ptype", "DRESSING_FACTORY"] }, then: "VENEER" },
                        { case: { $eq: ["$$ptype", "CROSSCUTTING"] }, then: "LOG" },
                        { case: { $eq: ["$$ptype", "GROUPING_FACTORY"] }, then: "VENEER" },
                        { case: { $eq: ["$$ptype", "FLITCHING_FACTORY"] }, then: "FLITCH" }
                      ],
                      default: "$$ptype" // fallback: match same as product_type
                    }
                  }
                ]
              }
            }
          },
          {
            $project: {
              gst_percentage: 1,
              product_hsn_code: 1,
              calculate_unit: 1,
              category: 1
            }
          }
        ],
        as: "item_category_gst_details"
      }
    },
    {
      $unwind: {
        path: "$item_category_gst_details",
        preserveNullAndEmptyArrays: true
      }
    }
  ];


  const fetch_packing_items_details = await packing_done_items_model.aggregate([
    aggMatchPackingDetails,
    aggLookupPackingDetails,
    aggUnwindPackingDetails,
    ...aggGstandHsn,
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
      const dispatch_no_of_sheets =
        (item?.no_of_sheets || 0) +
        (item?.no_of_leaves || 0) +
        (item?.number_of_rolls || 0) +
        (item?.quantity || 0);

      const order_items_details = await order_items_models[
        item?.order_category
      ].findOneAndUpdate(
        {
          _id: item?.order_item_id,
          order_id: item?.order_id,
        },
        {
          $inc: {
            dispatch_no_of_sheets: dispatch_no_of_sheets,
          },
        },
        { new: true, session: session }
      );

      if (!order_items_details) {
        throw new ApiError(
          `Failed to update dispatch no of sheets in order for ${item?.order_category}`,
          StatusCodes.BAD_REQUEST
        );
      }

      if (
        order_items_details?.no_of_sheets ===
        order_items_details?.dispatch_no_of_sheets
      ) {
        const order_item_closed = await order_items_models[
          item?.order_category
        ].findOneAndUpdate(
          {
            _id: order_items_details?._id,
            order_id: order_items_details?.order_id,
            no_of_sheets: order_items_details?.dispatch_no_of_sheets,
          },
          {
            $set: {
              item_status: order_item_status.closed,
            },
          },
          { new: true, session: session }
        );

        if (!order_item_closed) {
          throw new ApiError(
            `Failed to update order item status as closed`,
            StatusCodes.BAD_REQUEST
          );
        }

        const fetch_order_item_closed = await order_items_models[
          item?.order_category
        ].find({
          order_id: order_items_details?.order_id,
          item_status: { $ne: null },
        });

        if (fetch_order_item_closed?.length <= 0) {
          const order_closed = await OrderModel.findOneAndUpdate(
            {
              _id: order_items_details?.order_id,
            },
            {
              $set: {
                order_status: order_status.closed,
              },
            },
            { new: true, session }
          );

          if (!order_closed) {
            throw new ApiError(
              `Failed to update order status as closed`,
              StatusCodes.BAD_REQUEST
            );
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
    const send_for_approval = req.sendForApproval;
    // const send_for_approval = true;

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
    if ([dispatch_status.cancelled, dispatch_status?.irn_generated]?.includes(fetch_dipsatch_details?.dispatch_status) && fetch_dipsatch_details?.irn_number !== null) {
      throw new ApiError('Unable to edit the dispatch details once irn number is generated', StatusCodes.BAD_REQUEST);
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

    if (!send_for_approval) {
      // revert order status
      for (let item of fetch_dispatch_items_details) {
        const dispatch_no_of_sheets =
          (item?.no_of_sheets || 0) +
          (item?.no_of_leaves || 0) +
          (item?.number_of_rolls || 0);

        const order_items_details = await order_items_models[
          item?.order_category
        ].findOneAndUpdate(
          {
            _id: item?.order_item_id,
            order_id: item?.order_id,
          },
          {
            $inc: {
              dispatch_no_of_sheets: -dispatch_no_of_sheets,
            },
          },
          { new: true, session: session }
        );

        if (!order_items_details) {
          throw new ApiError(
            `Failed to update dispatch no of sheets in order for ${item?.order_category}`,
            StatusCodes.BAD_REQUEST
          );
        }

        const update_order_item = await order_items_models[
          item?.order_category
        ].findOneAndUpdate(
          {
            _id: order_items_details?._id,
            order_id: order_items_details?.order_id,
            // no_of_sheets: order_items_details?.dispatch_no_of_sheets
            no_of_sheets: order_items_details?.no_of_sheets,
          },
          {
            $set: {
              item_status: null,
            },
          },
          { new: true, session: session }
        );

        if (!update_order_item) {
          throw new ApiError(
            `Failed to update order item status as closed`,
            StatusCodes.BAD_REQUEST
          );
        }

        const update_order = await OrderModel.findOneAndUpdate(
          {
            _id: order_items_details?.order_id,
          },
          {
            $set: {
              order_status: null,
            },
          },
          { new: true, session }
        );

        if (!update_order) {
          throw new ApiError(
            `Failed to update order status as closed`,
            StatusCodes.BAD_REQUEST
          );
        }
      }

      const update_dispatch_details = {
        ...dispatch_details,
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
        const dispatch_no_of_sheets =
          (item?.no_of_sheets || 0) +
          (item?.no_of_leaves || 0) +
          (item?.number_of_rolls || 0);

        const order_items_details = await order_items_models[
          item?.order_category
        ].findOneAndUpdate(
          {
            _id: item?.order_item_id,
            order_id: item?.order_id,
          },
          {
            $inc: {
              dispatch_no_of_sheets: dispatch_no_of_sheets,
            },
          },
          { new: true, session: session }
        );

        if (!order_items_details) {
          throw new ApiError(
            `Failed to update dispatch no of sheets in order for ${item?.order_category}`,
            StatusCodes.BAD_REQUEST
          );
        }

        if (
          order_items_details?.no_of_sheets ===
          order_items_details?.dispatch_no_of_sheets
        ) {
          const order_item_closed = await order_items_models[
            item?.order_category
          ].findOneAndUpdate(
            {
              _id: order_items_details?._id,
              order_id: order_items_details?.order_id,
              no_of_sheets: order_items_details?.dispatch_no_of_sheets,
            },
            {
              $set: {
                item_status: order_item_status.closed,
              },
            },
            { new: true, session: session }
          );

          if (!order_item_closed) {
            throw new ApiError(
              `Failed to update order item status as closed`,
              StatusCodes.BAD_REQUEST
            );
          }

          const fetch_order_item_closed = await order_items_models[
            item?.order_category
          ].find({
            order_id: order_items_details?.order_id,
            item_status: { $ne: null },
          });

          if (fetch_order_item_closed?.length <= 0) {
            const order_closed = await OrderModel.findOneAndUpdate(
              {
                _id: order_items_details?.order_id,
              },
              {
                $set: {
                  order_status: order_status.closed,
                },
              },
              { new: true, session }
            );

            if (!order_closed) {
              throw new ApiError(
                `Failed to update order status as closed`,
                StatusCodes.BAD_REQUEST
              );
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

      const alreadyDispatched = await packing_done_other_details_model
        .find({
          _id: { $in: packing_done_ids_data },
          is_dispatch_done: true,
          dispatch_id: { $ne: dispatch_id },
        })
        .session(session);

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
    }
    const { _id, createdAt, ...rest_dispatch_details } = dispatch_details;
    const updated_approval_status = {
      ...approval_status,
      sendForApproval: {
        status: true,
        remark: 'Approval Pending',
      },
    };
    const updated_approval_dispatch_details_payload = {
      ...rest_dispatch_details,
      approval_dispatch_id: fetch_dipsatch_details?._id,
      approval_status: updated_approval_status,
      approval: {
        editedBy: userDetails?._id,
        approvalPerson: userDetails?.approver_id,
      },
      created_by: fetch_dipsatch_details?.created_by,
      updated_by: userDetails?._id,

    };

    const [add_approval_dispatch_done_deatils_result] = await approval_dispatch_model.create(
      [updated_approval_dispatch_details_payload],
      { session }
    );

    if (!add_approval_dispatch_done_deatils_result) {
      throw new ApiError(
        'Failed to send for approval',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_dispatch_details_status_result = await dispatchModel.updateOne(
      { _id: fetch_dipsatch_details?._id },
      {
        $set: { approval_status: updated_approval_status },
      },
      { session }
    );

    if (update_dispatch_details_status_result?.matchedCount === 0) {
      throw new ApiError(
        'Dispatch Details not found for approval',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_dispatch_details_status_result?.acknowledged ||
      update_dispatch_details_status_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update dispatch approval status',
        StatusCodes.BAD_REQUEST
      );
    }

    const updated_item_details = dispatch_items_details?.map((item) => {
      const { dispatch_item_id, createdAt, updatedAt, ...rest_item_details } = item;
      return {
        ...rest_item_details,
        approval_dispatch_id: add_approval_dispatch_done_deatils_result?.id,
        dispatch_id: add_approval_dispatch_done_deatils_result?.approval_dispatch_id,
        approval_dispatch_item_id: dispatch_item_id ?? new mongoose.Types.ObjectId(),
        invoice_no: add_approval_dispatch_done_deatils_result?.invoice_no,
        created_by: item.created_by ? item?.created_by : userDetails?._id,
        updated_by: userDetails?._id,
        createdAt: createdAt ?? new Date(),
        updatedAt: new Date()
      };
    });

    const add_approval_dispatch_items_result =
      await approval_dispatch_items_model.insertMany(updated_item_details, {
        session,
      });

    if (
      !add_approval_dispatch_items_result ||
      add_approval_dispatch_items_result.length === 0
    ) {
      throw new ApiError(
        'Failed to add approval dispatch items',
        StatusCodes.BAD_REQUEST
      );
    }
    const response = new ApiResponse(
      StatusCodes.OK,
      'Dispatch Details Sent for Approval Successfully.',
      {
        dispatch_details: add_approval_dispatch_done_deatils_result,
        dispatch_item_details: add_approval_dispatch_items_result,
      }
    );
    await session.commitTransaction()
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
    const userDetailsDetails = req.userDetails;
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
    const dispatch_items_details = await dispatchItemsModel
      .find({ dispatch_id: dispatch_id })
      .session(session);

    for (let item of dispatch_items_details) {
      const dispatch_no_of_sheets =
        (item?.no_of_sheets || 0) +
        (item?.no_of_leaves || 0) +
        (item?.number_of_rolls || 0);

      const order_items_details = await order_items_models[
        item?.order_category
      ].findOneAndUpdate(
        {
          _id: item?.order_item_id,
          order_id: item?.order_id,
        },
        {
          $inc: {
            dispatch_no_of_sheets: -dispatch_no_of_sheets,
          },
        },
        { new: true, session: session }
      );

      if (!order_items_details) {
        throw new ApiError(
          `Failed to update dispatch no of sheets in order for ${item?.order_category}`,
          StatusCodes.BAD_REQUEST
        );
      }

      const update_order_item = await order_items_models[
        item?.order_category
      ].findOneAndUpdate(
        {
          _id: order_items_details?._id,
          order_id: order_items_details?.order_id,
        },
        {
          $set: {
            item_status: null,
          },
        },
        { new: true, session: session }
      );

      if (!update_order_item) {
        throw new ApiError(
          `Failed to update order item status as closed`,
          StatusCodes.BAD_REQUEST
        );
      }

      const update_order = await OrderModel.findOneAndUpdate(
        {
          _id: order_items_details?.order_id,
        },
        {
          $set: {
            order_status: null,
          },
        },
        { new: true, session }
      );

      if (!update_order) {
        throw new ApiError(
          `Failed to update order status as closed`,
          StatusCodes.BAD_REQUEST
        );
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
    }

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
    const dispatch_items_details = await dispatchItemsModel
      .find({ dispatch_id: dispatch_id })
      .session(session);

    for (let item of dispatch_items_details) {
      const dispatch_no_of_sheets =
        (item?.no_of_sheets || 0) +
        (item?.no_of_leaves || 0) +
        (item?.number_of_rolls || 0);

      const order_items_details = await order_items_models[
        item?.order_category
      ].findOneAndUpdate(
        {
          _id: item?.order_item_id,
          order_id: item?.order_id,
        },
        {
          $inc: {
            dispatch_no_of_sheets: dispatch_no_of_sheets,
          },
        },
        { new: true, session: session }
      );

      if (!order_items_details) {
        throw new ApiError(
          `Failed to update dispatch no of sheets in order for ${item?.order_category}`,
          StatusCodes.BAD_REQUEST
        );
      }

      const update_order_item = await order_items_models[
        item?.order_category
      ].findOneAndUpdate(
        {
          _id: order_items_details?._id,
          order_id: order_items_details?.order_id,
        },
        {
          $set: {
            item_status: null,
          },
        },
        { new: true, session: session }
      );

      if (!update_order_item) {
        throw new ApiError(
          `Failed to update order item status as closed`,
          StatusCodes.BAD_REQUEST
        );
      }

      const update_order = await OrderModel.findOneAndUpdate(
        {
          _id: order_items_details?.order_id,
        },
        {
          $set: {
            order_status: null,
          },
        },
        { new: true, session }
      );

      if (!update_order) {
        throw new ApiError(
          `Failed to update order status as closed`,
          StatusCodes.BAD_REQUEST
        );
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
                      field: 'match',
                      input: {
                        $regexFind: {
                          input: { $ifNull: ['$invoice_no', '0'] },
                          regex: '(?<=/)(\\d{2})',
                        },
                      },
                    },
                  },
                  to: 'int',
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
                  field: 'match',
                  input: {
                    $regexFind: {
                      input: { $ifNull: ['$invoice_no', '0'] },
                      regex: '^[0-9]+',
                    },
                  },
                },
              },
              to: 'int',
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
  const { customer_id, order_category, product_type, exclude_dispatched } =
    req.body;

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
    "approval_status.sendForApproval.status": { $ne: true }
  };

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
    latest_invoice_no =
      fyPart === currentFY
        ? `${dispatchNumber + 1}/${currentFY}`
        : `1/${currentFY}`;
  } else {
    latest_invoice_no = `1/${currentFY}`;
  }

  return res.status(200).json({
    success: true,
    message: 'Invoice number generated',
    invoice_no: latest_invoice_no,
  });
});

//Eway Bill IRN Apis

export const generate_irn_no = catchAsync(async (req, res, next) => {
  const authToken = req.eInvoiceAuthToken;

  const dispatch_id = req.params.id;
  const dispatch_details = await dispatchModel.findById(dispatch_id);
  console.log(
    'start dispatch details',
    dispatch_details,
    'end dispatch details'
  );
  if (!dispatch_details) {
    throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
  }

  // Find dispatch items for this dispatch id and validate that there should be at least one item
  const dispatch_items = await dispatchItemsModel.find({ dispatch_id });
  if (!dispatch_items || dispatch_items.length === 0) {
    throw new ApiError(
      'No dispatch items found for this dispatch',
      StatusCodes.BAD_REQUEST
    );
  }
  console.log('start dispatch_items', dispatch_items, 'end dispatch_items');

  // Construct IRN body according to required format

  function formatDateToDDMMYYYY(date) {
    if (!date) return '';
    return moment(date).format('DD/MM/YYYY');
  }

  var {
    bill_from_address,
    bill_to_address,
    dispatch_from_address,
    ship_to_address,
  } = dispatch_details?.address;

  // Seller Details - consider these as sample/static; replace with actual company master data as per your prod logic
  const sellerDetails = {
    Gstin: bill_from_address?.gst_no,
    LglNm: 'TURAKHIA OVERSEAS PVT. LTD.',
    Addr1: bill_from_address?.address,
    Loc: bill_from_address?.city,
    Pin: bill_from_address?.pincode,
    Stcd: getStateCode(bill_from_address?.state) || '29',
    // Optionally, TrdNm, Ph, Em, etc.
  };

  // Buyer Details
  // Assuming below fields are present in dispatch_details or adapt as per your DB
  const buyerDetails = {
    Gstin: dispatch_details?.customer_details?.gst_number || '',
    LglNm: dispatch_details?.customer_details?.legal_name || '',
    Pos: getStateCode(bill_to_address?.state) || '29', // Place of supply (state code as string)
    Addr1: bill_to_address?.address || '',
    Loc: bill_to_address?.city || '',
    Pin: bill_to_address?.pincode || '',
    Stcd: getStateCode(bill_to_address?.state) || '29',
  };

  const DispatchDetails = {
    Nm: 'TURAKHIA OVERSEAS PVT. LTD.',
    Addr1: dispatch_from_address?.address,
    // "Addr2": "kuvempu layout",
    Loc: dispatch_from_address?.city,
    Pin: dispatch_from_address?.pincode,
    Stcd: getStateCode(dispatch_from_address?.state) || '37',
  };

  const ShipToDetails = {
    Nm: dispatch_details?.customer_details?.legal_name || '',
    Addr1: ship_to_address?.address,
    // "Addr2": "kuvempu layout",
    Loc: ship_to_address?.city,
    Pin: ship_to_address?.pincode,
    Stcd: getStateCode(ship_to_address?.state) || '37',
  };

  // Document Details
  const docDtls = {
    Typ: 'INV',
    No: dispatch_details.invoice_no || '00000',
    Dt: formatDateToDDMMYYYY(dispatch_details.invoice_date_time),
  };

  // Items Formatting
  const itemsArr = dispatch_items.map((item, idx) => {
    const ass_amt = Number((item?.amount - item?.discount_value).toFixed(2)); // Handle IGST/CGST/SGST later

    return {
      SlNo: String(idx + 1),
      IsServc: 'N',
      PrdDesc: item?.product_category || item?.item_name,
      HsnCd: item?.hsn_code || '',
      Qty: Number(item?.qty) || 0,
      Unit: item?.uom || 'NOS',
      UnitPrice: Number(item?.rate),
      TotAmt: item?.amount || 0,
      Discount: Number(item?.discount_value),
      AssAmt: ass_amt,

      GstRt: Number(item?.gst_details?.gst_percentage || 0),
      IgstAmt: Number(item?.gst_details?.igst_percentage || 0),
      SgstAmt: Number(item?.gst_details?.sgst_percentage || 0),
      CgstAmt: Number(item?.gst_details?.cgst_percentage || 0),

      TotItemVal: Number(item?.final_amount.toFixed(2)),
    };
  });

  // Value summary for invoice
  const AssVal = itemsArr.reduce((acc, i) => acc + i.AssAmt, 0);
  const CgstVal = itemsArr.reduce((acc, i) => acc + i.CgstAmt, 0);
  const SgstVal = itemsArr.reduce((acc, i) => acc + i.SgstAmt, 0);
  const IgstVal = itemsArr.reduce((acc, i) => acc + i.IgstAmt, 0);
  const TotInvVal = itemsArr.reduce((acc, i) => acc + i.TotItemVal, 0);

  const irnBody = {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: dispatch_details?.supp_type,
    },
    DocDtls: docDtls,
    SellerDtls: sellerDetails,
    BuyerDtls: buyerDetails,
    DispDtls: DispatchDetails,
    ShipDtls: ShipToDetails,
    ItemList: itemsArr,
    ValDtls: {
      AssVal: Number(AssVal.toFixed(2)),
      CgstVal: Number(CgstVal.toFixed(2)),
      SgstVal: Number(SgstVal.toFixed(2)),
      IgstVal: Number(IgstVal.toFixed(2)),
      TotInvVal: Number(TotInvVal.toFixed(2)),
    },
  };

  const irnResponse = await axios.post(
    `${process.env.E_INVOICE_BASE_URL}/einvoice/type/GENERATE/version/V1_03?email=${process.env.E_INVOICE_EMAIL_ID}`,
    irnBody,
    {
      headers: {
        ...EInvoiceHeaderVariable,
        'auth-token': authToken,
        'Content-Type': 'application/json',
      },
    }
  );

  if (irnResponse?.data?.status_cd === '1') {
    // Update dispatch details with IRN number and IRP
    dispatch_details.irn_number = irnResponse?.data?.data?.Irn;
    dispatch_details.acknowledgement_number = irnResponse?.data?.data?.AckNo;
    dispatch_details.acknowledgement_date = irnResponse?.data?.data?.AckDt;
    dispatch_details.irp = irnResponse?.data?.irp;
    dispatch_details.dispatch_status = dispatch_status?.irn_generated;
    await dispatch_details.save();
  } else {
    // Extracting error details from irnResponse and throwing an error
    let errorMessage = 'Unknown error occurred';

    const statusDescArr = JSON.parse(irnResponse.data.status_desc);
    if (Array.isArray(statusDescArr) && statusDescArr.length > 0) {
      errorMessage = statusDescArr[0]?.ErrorMessage || errorMessage;
    }

    throw new ApiError(
      `IRN Generation Failed. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }
  console.log('Irn response', irnResponse, 'Irn response');
  // Optionally: req.body.irnBody = irnBody

  return res.status(200).json({
    success: true,
    message: 'IRN number generated successfully.',
    result: irnResponse?.data,
  });
});

export const get_irn_by_doc = catchAsync(async (req, res, next) => {
  const authToken = req.eInvoiceAuthToken;

  const dispatch_id = req.params.id;
  const dispatch_details = await dispatchModel.findById(dispatch_id);
  // console.log(
  //   'start dispatch details',
  //   dispatch_details,
  //   'end dispatch details'
  // );
  if (!dispatch_details) {
    throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
  }

  const docType = 'INV';

  const irnResponse = await axios.get(
    `${process.env.E_INVOICE_BASE_URL}/einvoice/type/GETIRNBYDOCDETAILS/version/V1_03?email=${process.env.E_INVOICE_EMAIL_ID}&param1=${docType}`,
    {
      headers: {
        ...EInvoiceHeaderVariable,
        'auth-token': authToken,
        'Content-Type': 'application/json',
        docnum: dispatch_details?.invoice_no,
        docdate: moment(dispatch_details?.invoice_date_time).format(
          'DD/MM/YYYY'
        ),
      },
    }
  );

  if (irnResponse?.data?.status_cd === '1') {
    // Update dispatch details with IRN number and IRP
    dispatch_details.irn_number = irnResponse?.data?.data?.Irn;
    dispatch_details.acknowledgement_number = irnResponse?.data?.data?.AckNo;
    dispatch_details.acknowledgement_date = irnResponse?.data?.data?.AckDt;
    dispatch_details.irp = irnResponse?.data?.irp;
    dispatch_details.dispatch_status = dispatch_status?.irn_generated;
    await dispatch_details.save();
  } else {
    // Extracting error details from irnResponse and throwing an error
    let errorMessage = 'Unknown error occurred';

    const statusDescArr = JSON.parse(irnResponse.data.status_desc);
    if (Array.isArray(statusDescArr) && statusDescArr.length > 0) {
      errorMessage = statusDescArr[0]?.ErrorMessage || errorMessage;
    }

    throw new ApiError(
      `IRN Cancellation Failed. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }
  // console.log('Irn response', irnResponse, 'Irn response');
  // Optionally: req.body.irnBody = irnBody

  return res.status(200).json({
    success: true,
    message: 'IRN Number Cancelled successfully.',
    result: irnResponse?.data,
  });
});

export const cancel_irn_no = catchAsync(async (req, res, next) => {
  const authToken = req.eInvoiceAuthToken;
  const { CnlRsn, CnlRsnRem } = req.body;

  const dispatch_id = req.params.id;
  const dispatch_details = await dispatchModel.findById(dispatch_id);
  // console.log(
  //   'start dispatch details',
  //   dispatch_details,
  //   'end dispatch details'
  // );
  if (!dispatch_details) {
    throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
  }

  if (!dispatch_details?.irn_number) {
    throw new ApiError(
      'IRN number not found for this dispatch',
      StatusCodes.BAD_REQUEST
    );
  }
  if (!dispatch_details?.irp) {
    throw new ApiError(
      'IRP not found for this dispatch',
      StatusCodes.BAD_REQUEST
    );
  }

  const irnBody = {
    Irn: dispatch_details?.irn_number,
    CnlRsn: CnlRsn,
    CnlRem: CnlRsnRem,
  };

  const irnResponse = await axios.post(
    `${process.env.E_INVOICE_BASE_URL}/einvoice/type/CANCEL/version/V1_03?email=${process.env.E_INVOICE_EMAIL_ID}&irp=${dispatch_details?.irp}`,
    irnBody,
    {
      headers: {
        ...EInvoiceHeaderVariable,
        'auth-token': authToken,
        'Content-Type': 'application/json',
      },
    }
  );

  if (irnResponse?.data?.status_cd === '1') {
    // Update dispatch details with IRN number and IRP
    dispatch_details.dispatch_status = dispatch_status?.cancelled;
    await dispatch_details.save();
  } else {
    // Extracting error details from irnResponse and throwing an error
    let errorMessage = 'Unknown error occurred';

    const statusDescArr = JSON.parse(irnResponse.data.status_desc);
    if (Array.isArray(statusDescArr) && statusDescArr.length > 0) {
      errorMessage = statusDescArr[0]?.ErrorMessage || errorMessage;
    }

    throw new ApiError(
      `IRN Cancellation Failed. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }
  // console.log('Irn response', irnResponse, 'Irn response');
  // Optionally: req.body.irnBody = irnBody

  return res.status(200).json({
    success: true,
    message: 'IRN Number Cancelled successfully.',
    result: irnResponse?.data,
  });
});

export const generate_ewaybill_using_irn_no = catchAsync(
  async (req, res, next) => {
    const authToken = req.eInvoiceAuthToken;

    const dispatch_id = req.params.id;
    const dispatch_details = await dispatchModel.findById(dispatch_id);
    console.log(
      'start dispatch details',
      dispatch_details,
      'end dispatch details'
    );
    if (!dispatch_details) {
      throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
    }

    if (!dispatch_details?.irn_number) {
      throw new ApiError(
        'IRN number not found for this dispatch',
        StatusCodes.BAD_REQUEST
      );
    }
    if (!dispatch_details?.irp) {
      throw new ApiError(
        'IRP not found for this dispatch',
        StatusCodes.BAD_REQUEST
      );
    }

    // Find transporter details by transporter_id
    const transporterId = dispatch_details?.transporter_id;
    let transporter_details = null;
    if (transporterId) {
      transporter_details = await transporterModel.findOne({
        _id: transporterId,
      });
    }
    // console.log(
    //   'transporter_details',
    //   transporter_details,
    //   'transporter_details'
    // );

    var {
      bill_from_address,
      bill_to_address,
      dispatch_from_address,
      ship_to_address,
    } = dispatch_details?.address;
    const ewayBillBody = {
      Irn: dispatch_details?.irn_number,
      Distance: Number(dispatch_details?.approx_distance),
      TransMode: dispatch_details?.transport_mode?.id,
      TransId: transporter_details?.transport_id,
      TransName: dispatch_details?.transporter_details?.name,
      TransDocDt: dispatch_details?.trans_doc_date,
      TransDocNo: dispatch_details?.trans_doc_no,
      VehNo: dispatch_details?.vehicle_details?.[0]?.vehicle_number,
      VehType: 'R',

      ExpShipDtls: (() => {
        const address = ship_to_address?.address || '';
        let Addr1 = address;
        let Addr2 = '';
        if (address.length > 50) {
          Addr1 = address.substring(0, 50);
          Addr2 = address.substring(50);
        }
        return {
          Addr1: Addr1,
          ...(Addr2 && { Addr2 }),
          Loc: ship_to_address?.city,
          Pin: ship_to_address?.pincode,
          Stcd: getStateCode(ship_to_address?.state) || '29',
        };
      })(),

      DispDtls: (() => {
        const address = dispatch_from_address?.address || '';
        let Addr1 = address;
        let Addr2 = '';
        if (address.length > 50) {
          Addr1 = address.substring(0, 50);
          Addr2 = address.substring(50);
        }
        return {
          Nm: 'TURAKHIA OVERSEAS PVT. LTD.',
          Addr1: Addr1,
          ...(Addr2 && { Addr2 }),
          Loc: dispatch_from_address?.city,
          Pin: dispatch_from_address?.pincode,
          Stcd: getStateCode(dispatch_from_address?.state) || '29',
        };
      })(),
      // DispDtls: {
      //   Nm: 'TURAKHIA OVERSEAS PVT. LTD.',
      //   Addr1:  dispatch_from_address?.address,
      //   // Addr2: 'kuvempu layout',
      //   Loc: dispatch_from_address?.city,
      //   Pin: dispatch_from_address?.pincode,
      //   Stcd: '29',
      // },
    };

    const ewayBillResponse = await axios.post(
      `${process.env.E_INVOICE_BASE_URL}/einvoice/type/GENERATE_EWAYBILL/version/V1_03?email=${process.env.E_INVOICE_EMAIL_ID}&irp=${dispatch_details?.irp}`,
      ewayBillBody,
      {
        headers: {
          ...EInvoiceHeaderVariable,
          'auth-token': authToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (ewayBillResponse?.data?.status_cd === '1') {
      // Update dispatch details with IRN number and IRP
      dispatch_details.eway_bill_no = ewayBillResponse?.data?.data?.EwbNo;
      dispatch_details.eway_bill_date = ewayBillResponse?.data?.data?.EwbDt;
      await dispatch_details.save();
    } else {
      // Extracting error details from ewayBillResponse and throwing an error
      let errorMessage = 'Unknown error occurred';

      const statusDescArr = JSON.parse(ewayBillResponse.data.status_desc);
      if (Array.isArray(statusDescArr) && statusDescArr.length > 0) {
        errorMessage = statusDescArr[0]?.ErrorMessage || errorMessage;
      }

      throw new ApiError(
        `Eway Bill Generation Failed. Error : ${errorMessage}`,
        StatusCodes.BAD_REQUEST
      );
    }
    // console.log('Irn response', ewayBillResponse, 'Irn response');
    // Optionally: req.body.irnBody = irnBody

    return res.status(200).json({
      success: true,
      message: 'Eway Bill Generated successfully.',
      result: ewayBillResponse?.data,
    });
  }
);

//===============EwayBill Apis=======================
export const generate_ewaybill = catchAsync(async (req, res, next) => {
  // const authToken = req.eWayBillAuthToken;

  const dispatch_id = req.params.id;
  const dispatch_details = await dispatchModel.findById(dispatch_id);
  console.log(
    'start dispatch details',
    dispatch_details,
    'end dispatch details'
  );
  if (!dispatch_details) {
    throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
  }

  const dispatch_items = await dispatchItemsModel.find({ dispatch_id });
  if (!dispatch_items || dispatch_items.length === 0) {
    throw new ApiError(
      'No dispatch items found for this dispatch',
      StatusCodes.BAD_REQUEST
    );
  }
  console.log('dispatch_items', dispatch_items, 'dispatch_items');

  // Set transactionType based on the mapping in the image and the relevant field

  let transactionType; // default Regular

  switch (dispatch_details?.transaction_type) {
    case transaction_type?.regular:
    case 1:
      transactionType = 1;
      break;
    case transaction_type?.bill_to_ship_to:
    case 2:
      transactionType = 2;
      break;
    case transaction_type?.bill_from_dispatch_from:
    case 3:
      transactionType = 3;
      break;
    case transaction_type?.bill_to_ship_to_and_bill_from_dispatch_from:
    case 4:
      transactionType = 4;
      break;
    default:
      transactionType = 1;
  }

  const transporterId = dispatch_details?.transporter_id;
  let transporter_details = null;
  if (transporterId) {
    transporter_details = await transporterModel.findOne({
      _id: transporterId,
    });
  }

  var {
    bill_from_address,
    bill_to_address,
    dispatch_from_address,
    ship_to_address,
  } = dispatch_details?.address;

  const ewayBillBody = {
    supplyType: 'O', // Outward
    subSupplyType: '1', // Supply
    subSupplyDesc: '',
    docType: 'INV', // Invoice
    docNo: dispatch_details?.invoice_no,
    docDate: dispatch_details?.invoice_date_time
      ? moment(dispatch_details.invoice_date_time).format('DD/MM/YYYY')
      : '',

    //seller details
    fromGstin: dispatch_from_address?.gst_no,
    fromTrdName: 'TURAKHIA OVERSEAS PVT. LTD.',
    fromAddr1:
      dispatch_from_address?.address &&
        dispatch_from_address.address.length > 50
        ? dispatch_from_address.address.slice(0, 50)
        : dispatch_from_address?.address || '',
    fromAddr2:
      dispatch_from_address?.address &&
        dispatch_from_address.address.length > 50
        ? dispatch_from_address.address.slice(50)
        : '',
    fromPlace: dispatch_from_address?.city || '',
    fromPincode: Number(dispatch_from_address?.pincode) || '',
    fromStateCode: getStateCode(dispatch_from_address?.state),
    actFromStateCode: getStateCode(dispatch_from_address?.state),

    dispatchFromGSTIN: dispatch_from_address?.gst_no,
    dispatchFromTradeName: 'TURAKHIA OVERSEAS PVT. LTD.',

    //buyer details
    toGstin: dispatch_details?.customer_details?.gst_number || '',
    toTrdName: dispatch_details?.customer_details?.legal_name || '',
    toAddr1:
      ship_to_address?.address && ship_to_address.address.length > 50
        ? ship_to_address.address.slice(0, 50)
        : ship_to_address?.address || '',
    toAddr2:
      ship_to_address?.address && ship_to_address.address.length > 50
        ? ship_to_address.address.slice(50)
        : '',
    toPlace: ship_to_address?.city || '',
    toPincode: Number(ship_to_address?.pincode) || '',
    toStateCode: getStateCode(ship_to_address?.state),
    actToStateCode: getStateCode(ship_to_address?.state),

    shipToGSTIN: dispatch_details?.customer_details?.gst_number || '',
    shipToTradeName: dispatch_details?.customer_details?.legal_name || '',

    //transport details
    transactionType: transactionType,
    transMode: dispatch_details?.transport_mode?.id,
    transporterId: transporter_details?.transport_id,
    transDistance: dispatch_details?.approx_distance?.toString() || '',
    transporterName: dispatch_details?.transporter_details?.name,
    transDocNo: dispatch_details?.trans_doc_no,
    transDocDate: dispatch_details?.trans_doc_date
      ? moment(dispatch_details.trans_doc_date).format('DD/MM/YYYY')
      : '',
    vehicleNo: dispatch_details?.vehicle_details?.[0]?.vehicle_number,
    vehicleType: 'R',

    // itemList: [
    //   {
    //     hsnCode: 125463,
    //     taxableAmount: 100,
    //     productName: 'FURROW REGANTO',
    //     productDesc: 'FURROW GREEN OAK FR1606 LONG PLUS',
    //     quantity: 10,
    //     qtyUnit: 'SQM',
    //     sgstRate: 0,
    //     cgstRate: 0,
    //     igstRate: 18,
    //     // "cessRate": "<number>"
    //   },
    // ],
    // totalValue: 100,
    // cgstValue: 0,
    // sgstValue: 0,
    // igstValue: 18,
    // totInvValue: 118,

    //item list
    itemList: (dispatch_items || []).map((item) => ({
      hsnCode: 125463,
      productName: item?.product_category || '',
      productDesc: item?.sales_item_name || item?.product_category,
      // hsnCode: item?.hsn_code || '',
      quantity: item?.new_sqm || item?.sqm || item?.cbm || item?.cmt || 0,
      qtyUnit: item?.unit || 'SQM',
      cgstRate: item?.gst_details?.cgst_percentage,
      sgstRate: item?.gst_details?.sgst_percentage,
      igstRate: item?.gst_details?.igst_percentage,
      // cessRate: item?.cess_rate || 0,
      taxableAmount: item?.discount_amount, //item amount after discount
    })),

    totalValue: dispatch_details?.base_amount_without_gst || 0,

    cgstValue: (dispatch_items || []).reduce(
      (sum, item) => sum + (item?.gst_details?.cgst_amount || 0),
      0
    ),
    sgstValue: (dispatch_items || []).reduce(
      (sum, item) => sum + (item?.gst_details?.sgst_amount || 0),
      0
    ),
    igstValue: (dispatch_items || []).reduce(
      (sum, item) => sum + (item?.gst_details?.igst_amount || 0),
      0
    ),
    // cessValue: dispatch_details?.cess_value || 0,
    totInvValue: dispatch_details?.final_total_amount || 0,
  };

  console.log('ewayBillBody', ewayBillBody, 'ewayBillBody');

  const ewayBillResponse = await axios.post(
    `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/genewaybill?email=${process.env.EWAY_BILL_EMAIL_ID}`,
    ewayBillBody,
    {
      headers: {
        ...EwayBillHeaderVariable,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('ewayBillResponse', ewayBillResponse.data, 'ewayBillResponse');

  if (ewayBillResponse?.data?.status_cd === '1') {
    // Update dispatch details with IRN number and IRP
    // dispatch_details.dispatch_status = dispatch_status?.cancelled;
    dispatch_details.eway_bill_no = ewayBillResponse?.data?.data?.EwbNo;
    dispatch_details.eway_bill_date = ewayBillResponse?.data?.data?.EwbDt;
    await dispatch_details.save();
  } else {
    // Extract and format error message from ewayBillResponse
    let errorMessage = 'Unknown error occurred';
    const error = ewayBillResponse?.data?.error;

    if (error && typeof error === 'object' && error.message) {
      const message = error.message;

      // Handle multiple validation errors: "[#/field1: error1, #/field2: error2]"
      const arrayMatch = message.match(/\[(.*?)\]/);
      if (arrayMatch?.[1]) {
        const errors = arrayMatch[1].split(/, #\//);
        if (errors.length > 0) {
          let firstError = errors[0].trim();
          if (firstError.startsWith('#/')) {
            firstError = firstError.substring(2);
          }
          errorMessage = firstError;
        } else {
          errorMessage = message;
        }
      }
      // Handle JSON error codes: '{"errorCodes":"100"}'
      else {
        try {
          const parsedError = JSON.parse(message);
          if (parsedError?.errorCodes) {
            const errorCode = parsedError.errorCodes.split(',')[0]?.trim();
            if (errorCode) {
              // Build error code map for lookup
              const errorCodeMap = {};
              if (
                errorCodeMapForEwayBill &&
                Array.isArray(errorCodeMapForEwayBill)
              ) {
                for (const e of errorCodeMapForEwayBill) {
                  errorCodeMap[e.errorCode] = e.errorDesc;
                }
              }
              errorMessage =
                errorCodeMap[errorCode] ||
                `Eway Bill API Error. Error Code: ${errorCode}`;
            } else {
              errorMessage = message;
            }
          } else {
            // Handle single validation error: "#/itemList/0/qtyUnit: expected minLength: 3, actual: 0"
            const singleMatch = message.match(/#\/(.+)/);
            errorMessage = singleMatch?.[1]?.trim() || message;
          }
        } catch {
          // Handle single validation error if JSON parse fails: "#/itemList/0/qtyUnit: expected minLength: 3, actual: 0"
          const singleMatch = message.match(/#\/(.+)/);
          errorMessage = singleMatch?.[1]?.trim() || message;
        }
      }
    }

    throw new ApiError(
      `Eway Bill Generation Failed. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }
  // console.log('Irn response', ewayBillResponse, 'Irn response');
  // Optionally: req.body.irnBody = irnBody

  return res.status(200).json({
    success: true,
    message: 'IRN Number Cancelled successfully.',
    result: ewayBillResponse?.data,
  });
});

export const cancel_ewaybill = catchAsync(async (req, res, next) => {
  const { cancelRmrk, cancelRsnCode } = req.body;

  const dispatch_id = req.params.id;
  const dispatch_details = await dispatchModel.findById(dispatch_id);

  if (!dispatch_details) {
    throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
  }

  // if (!dispatch_details?.eway_bill_no) {
  //   throw new ApiError(
  //     'Eway bill number not found for this dispatch',
  //     StatusCodes.BAD_REQUEST
  //   );
  // }

  const ewayBillCancelBody = {
    ewbNo: dispatch_details?.eway_bill_no,
    // ewbNo: 125643,
    cancelRmrk: cancelRmrk,
    cancelRsnCode: Number(cancelRsnCode),
    // cancelRsnCode: cancelRsnCode,
  };
  // console.log(ewayBillCancelBody, 'ewayBillCancelBody');

  const ewayBillCancelResponse = await axios.post(
    `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/canewb?email=${process.env.EWAY_BILL_EMAIL_ID}`,
    ewayBillCancelBody,
    {
      headers: {
        ...EwayBillHeaderVariable,
        // 'auth-token': authToken,
        'Content-Type': 'application/json',
      },
    }
  );

  // console.log(
  //   'ewayBillCancelResponse',
  //   ewayBillCancelResponse.data,
  //   'ewayBillCancelResponse'
  // );

  if (ewayBillCancelResponse?.data?.status_cd === '1') {
    // Update dispatch details with IRN number and IRP
    // dispatch_details.dispatch_status = dispatch_status?.cancelled;
    // await dispatch_details.save();
    console.log('Eway Bill Cancelled successfully.');
  } else {
    // Extracting error details from ewayBillCancelResponse and throwing an error
    let errorMessage = 'Unknown error occurred';

    if (ewayBillCancelResponse?.data?.error) {
      if (
        typeof ewayBillCancelResponse.data.error === 'object' &&
        ewayBillCancelResponse.data.error.message
      ) {
        const message = ewayBillCancelResponse.data.error.message;

        const arrayMatch = message.match(/\[(.*?)\]/);
        if (arrayMatch && arrayMatch[1]) {
          // Handle "required key" style error messages
          const errors = arrayMatch[1].split(/, #\//);
          if (errors.length > 0) {
            let firstError = errors[0].trim();
            if (firstError.startsWith('#/')) {
              firstError = firstError.substring(2);
            }
            errorMessage = firstError;
          } else {
            errorMessage = message;
          }
        } else if (/^\{.*errorCodes.*\}$/.test(message)) {
          // Handle JSON error style messages, e.g. '{"errorCodes":"312,"}'
          let errorCode = null;
          try {
            const parsed = JSON.parse(message);
            if (parsed?.errorCodes) {
              // Sometimes there may be a trailing comma, split and clean
              errorCode = parsed.errorCodes.split(',')[0]?.trim();
            }
          } catch (e) { }
          // Provide specific error messages for known error codes
          // You can expand or modify this map as needed
          const errorCodeMap = {};
          // Build a map from the imported array for fast lookup
          for (const errorObj of errorCodeMapForEwayBill) {
            errorCodeMap[errorObj.errorCode] = errorObj.errorDesc;
          }
          if (errorCode && errorCodeMap[errorCode]) {
            errorMessage = errorCodeMap[errorCode];
          } else if (errorCode) {
            errorMessage = `Eway Bill API Error. Error Code: ${errorCode}`;
          } else {
            errorMessage = message;
          }
        } else {
          errorMessage = message;
        }
      }
    }

    throw new ApiError(
      `Eway Bill Cancellation Failed. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }

  return res.status(200).json({
    success: true,
    message: 'Eway Bill Cancelled successfully.',
    result: ewayBillCancelResponse?.data,
  });
});

export const get_ewaybill_details = catchAsync(async (req, res, next) => {
  const dispatch_id = req.params.id;
  const dispatch_details = await dispatchModel.findById(dispatch_id);

  if (!dispatch_details) {
    throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
  }

  const docType = 'INV';
  const docNo = dispatch_details?.invoice_no;
  // console.log(ewayBillCancelBody, 'ewayBillCancelBody');

  const getEwayBillResponse = await axios.get(
    `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/getewaybillgeneratedbyconsigner?email=${process.env.EWAY_BILL_EMAIL_ID}
    &docType=${docType}&docNo=${docNo}`,
    {
      headers: {
        ...EwayBillHeaderVariable,
        // 'auth-token': authToken,
        'Content-Type': 'application/json',
      },
    }
  );

  // console.log(
  //   'getEwayBillResponse',
  //   getEwayBillResponse.data,
  //   'getEwayBillResponse'
  // );

  if (getEwayBillResponse?.data?.status_cd === '1') {
    // Update dispatch details with IRN number and IRP
    dispatch_details.dispatch_status = dispatch_status?.cancelled;
    await dispatch_details.save();
  } else {
    // Extracting error details from getEwayBillResponse and throwing an error
    let errorMessage = 'Unknown error occurred';

    if (getEwayBillResponse?.data?.error) {
      if (
        typeof getEwayBillResponse.data.error === 'object' &&
        getEwayBillResponse.data.error.message
      ) {
        const message = getEwayBillResponse.data.error.message;

        const arrayMatch = message.match(/\[(.*?)\]/);
        if (arrayMatch && arrayMatch[1]) {
          // Handle "required key" style error messages
          const errors = arrayMatch[1].split(/, #\//);
          if (errors.length > 0) {
            let firstError = errors[0].trim();
            if (firstError.startsWith('#/')) {
              firstError = firstError.substring(2);
            }
            errorMessage = firstError;
          } else {
            errorMessage = message;
          }
        } else if (/^\{.*errorCodes.*\}$/.test(message)) {
          // Handle JSON error style messages, e.g. '{"errorCodes":"312,"}'
          let errorCode = null;
          try {
            const parsed = JSON.parse(message);
            if (parsed?.errorCodes) {
              // Sometimes there may be a trailing comma, split and clean
              errorCode = parsed.errorCodes.split(',')[0]?.trim();
            }
          } catch (e) { }
          // Provide specific error messages for known error codes
          // You can expand or modify this map as needed
          const errorCodeMap = {};
          // Build a map from the imported array for fast lookup
          for (const errorObj of errorCodeMapForEwayBill) {
            errorCodeMap[errorObj.errorCode] = errorObj.errorDesc;
          }
          if (errorCode && errorCodeMap[errorCode]) {
            errorMessage = errorCodeMap[errorCode];
          } else if (errorCode) {
            errorMessage = `Eway Bill API Error. Error Code: ${errorCode}`;
          } else {
            errorMessage = message;
          }
        } else {
          errorMessage = message;
        }
      }
    }

    throw new ApiError(
      `Eway Bill Details Fetch Failed. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }

  return res.status(200).json({
    success: true,
    message: 'Eway Bill Details Fetched successfully.',
    result: getEwayBillResponse?.data,
  });
});

export const update_ewaybill_transporter = catchAsync(
  async (req, res, next) => {
    const dispatch_id = req.params.id;
    const bodyData = req.body;
    console.log(bodyData, 'bodyData');

    const dispatch_details = await dispatchModel.findById(dispatch_id);
    // console.log(
    //   'start dispatch details',
    //   dispatch_details,
    //   'end dispatch details'
    // );
    if (!dispatch_details) {
      throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
    }

    if (!dispatch_details?.eway_bill_no) {
      throw new ApiError(
        'Eway bill number not found for this dispatch',
        StatusCodes.BAD_REQUEST
      );
    }

    const transporterDetails = await transporterModel.findById(
      bodyData?.transporter_id
    );
    if (!transporterDetails) {
      throw new ApiError(
        'Transporter details not found',
        StatusCodes.NOT_FOUND
      );
    }

    const ewayBillBody = {
      ewbNo: Number(dispatch_details?.eway_bill_no),
      transporterId: transporterDetails?.transport_id,
    };

    const ewayBillUpdateTransporterResponse = await axios.post(
      `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/updatetransporter?email=${process.env.E_INVOICE_EMAIL_ID}`,
      ewayBillBody,
      {
        headers: {
          ...EInvoiceHeaderVariable,
          'Content-Type': 'application/json',
        },
      }
    );

    if (ewayBillUpdateTransporterResponse?.data?.status_cd === '1') {
      // Update dispatch details with IRN number and IRP
      // dispatch_details.dispatch_status = dispatch_status?.cancelled;
      dispatch_details.transporter_details = transporterDetails;
      dispatch_details.transporter_id = transporterDetails?._id;
      await dispatch_details.save();
    } else {
      // Extracting error details from ewayBillUpdateTransporterResponse and throwing an error
      let errorMessage = 'Unknown error occurred';

      const statusDescArr = JSON.parse(
        ewayBillUpdateTransporterResponse.data.status_desc
      );
      if (Array.isArray(statusDescArr) && statusDescArr.length > 0) {
        errorMessage = statusDescArr[0]?.ErrorMessage || errorMessage;
      }

      throw new ApiError(
        `IRN Cancellation Failed. Error : ${errorMessage}`,
        StatusCodes.BAD_REQUEST
      );
    }
    // console.log('Irn response', ewayBillUpdateTransporterResponse, 'Irn response');
    // Optionally: req.body.irnBody = irnBody

    return res.status(200).json({
      success: true,
      message: 'IRN Number Cancelled successfully.',
      result: ewayBillUpdateTransporterResponse?.data,
    });
  }
);
export const update_ewaybill_partB = catchAsync(async (req, res, next) => {
  const bodyData = req.body;

  const dispatch_id = req.params.id;
  const dispatch_details = await dispatchModel.findById(dispatch_id);
  // console.log(
  //   'start dispatch details',
  //   dispatch_details,
  //   'end dispatch details'
  // );
  if (!dispatch_details) {
    throw new ApiError('Dispatch details not found', StatusCodes.NOT_FOUND);
  }

  if (!dispatch_details?.eway_bill_no) {
    throw new ApiError(
      'Eway bill number not found for this dispatch. Cant update Part B.',
      StatusCodes.BAD_REQUEST
    );
  }

  const updateEwaybillPartBBody = {
    fromPlace: bodyData?.fromPlace,
    fromState: getStateCode(bodyData?.fromState),
    reasonCode: bodyData?.reasonCode,
    reasonRem: bodyData?.reasonRem,
    transMode: bodyData?.transMode,
    ewbNo: Number(bodyData?.ewbNo),
    vehicleNo: bodyData?.vehicleNo,
    transDocNo: bodyData?.transDocNo,
    transDocDate: bodyData?.transDocDate,
  };

  const updateEwaybillPartBResponse = await axios.post(
    `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/vehewb?email=${process.env.E_INVOICE_EMAIL_ID}`,
    updateEwaybillPartBBody,
    {
      headers: {
        ...EInvoiceHeaderVariable,
        'Content-Type': 'application/json',
      },
    }
  );

  if (updateEwaybillPartBResponse?.data?.status_cd === '1') {
    // Update dispatch details with IRN number and IRP
    dispatch_details.dispatch_status = dispatch_status?.cancelled;
    await dispatch_details.save();
  } else {
    // Extracting error details from updateEwaybillPartBResponse and throwing an error
    let errorMessage = 'Unknown error occurred';

    const statusDescArr = JSON.parse(
      updateEwaybillPartBResponse.data.status_desc
    );
    if (Array.isArray(statusDescArr) && statusDescArr.length > 0) {
      errorMessage = statusDescArr[0]?.ErrorMessage || errorMessage;
    }

    throw new ApiError(
      `IRN Cancellation Failed. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }
  // console.log('Irn response', updateEwaybillPartBResponse, 'Irn response');
  // Optionally: req.body.irnBody = irnBody

  return res.status(200).json({
    success: true,
    message: 'IRN Number Cancelled successfully.',
    result: updateEwaybillPartBResponse?.data,
  });
});

//mobile api
export const fetch_dispatch_details_by_invoice_no = catchAsync(
  async (req, res) => {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      throw new ApiError('Invalid Invoice No', StatusCodes.NOT_FOUND);
    }
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
    ];
    const dispatch_details = await dispatchModel.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Dispatch Details Fetched Successfully',
      dispatch_details
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_purchase_history = catchAsync(async (req, res) => {
  const {
    customerId,
    fromDate,
    toDate,
    startRowIndex,
    maximumRows,
    strSearch,
  } = req.body;

  for (let field of ['fromDate', 'toDate', 'maximumRows']) {
    if (!req.body[field]) {
      throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
    }
  }

  const match_query = {
    invoice_date_time: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate),
    },
    ...(customerId && {
      customer_id: mongoose.Types.ObjectId.createFromHexString(customerId),
    }),
    ...(strSearch && {
      $or: [
        { invoice_no: { $regex: strSearch, $options: 'i' } },
        {
          'customer_details.company_name': { $regex: strSearch, $options: 'i' },
        },
        { 'customer_details.owner_name': { $regex: strSearch, $options: 'i' } },
        {
          'dispatch_item_details.packing_done_id': {
            $regex: strSearch,
            $options: 'i',
          },
        },
      ],
    }),
  };

  const pipeline = [
    {
      $match: match_query,
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
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'grouping_done_items_details',
        localField: 'dispatch_items_details.group_no',
        foreignField: 'group_no',
        as: 'grouping_done_item_details',
      },
    },
    {
      $unwind: {
        path: '$grouping_done_item_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        InvoiceId: '$invoice_no',
        OrdrNo: '$dispatch_items_details.order_no',
        InvoiceDate: '$invoice_date_time',
        SalesItemName: '$dispatch_items_details.product_name',
        PhotoNumber: '$grouping_done_item_details.photo_no',
        Length: '$dispatch_items_details.length',
        Width: '$dispatch_items_details.width',
        NoOfSheets: '$dispatch_items_details.no_of_sheets',
        SQMtr: '$dispatch_items_details.sqm',
        Rate: '$dispatch_items_details.rate',
        Amount: '$dispatch_items_details.amount',
      },
    },
  ];

  const result = await dispatchModel.aggregate(pipeline);

  return res.status(StatusCodes.OK).json(result);
});

export const fetch_invoices = catchAsync(async (req, res) => {
  const {
    customerId,
    fromDate,
    toDate,
    startRowIndex,
    maximumRows,
    strSearch,
  } = req.body;

  for (let field of ['fromDate', 'toDate', 'maximumRows']) {
    if (!req.body[field]) {
      throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
    }
  }

  const match_query = {
    invoice_date_time: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate),
    },
    ...(customerId && {
      customer_id: mongoose.Types.ObjectId.createFromHexString(customerId),
    }),
    ...(strSearch && {
      $or: [
        { invoice_no: { $regex: strSearch, $options: 'i' } },
        {
          'customer_details.company_name': { $regex: strSearch, $options: 'i' },
        },
        { 'customer_details.owner_name': { $regex: strSearch, $options: 'i' } },
        {
          'dispatch_item_details.packing_done_id': {
            $regex: strSearch,
            $options: 'i',
          },
        },
      ],
    }),
  };

  const pipeline = [
    {
      $match: match_query,
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
              total_amount: { $sum: '$amount' },
            },
          },
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
        TotalQuantity: {
          $arrayElemAt: ['$dispatch_items_details.total_quantity', 0],
        },
        TotalAmount: {
          $round: [
            { $arrayElemAt: ['$dispatch_items_details.total_amount', 0] },
            2,
          ],
        },
      },
    },
  ];

  const result = await dispatchModel.aggregate(pipeline);

  return res.status(StatusCodes.OK).json(result);
});
export const fetch_packing_details_by_customer_id = catchAsync(
  async (req, res) => {
    const {
      customerId,
      fromDate,
      toDate,
      startRowIndex,
      maximumRows,
      strSearch,
    } = req.body;

    for (let field of ['fromDate', 'toDate', 'maximumRows']) {
      if (!req.body[field]) {
        throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
      }
    }

    const match_query = {
      invoice_date_time: {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      },
      ...(customerId && {
        customer_id: mongoose.Types.ObjectId.createFromHexString(customerId),
      }),
      ...(strSearch && {
        $or: [
          { invoice_no: { $regex: strSearch, $options: 'i' } },
          {
            'customer_details.company_name': {
              $regex: strSearch,
              $options: 'i',
            },
          },
          {
            'customer_details.owner_name': { $regex: strSearch, $options: 'i' },
          },
          {
            'packing_details.packing_id': { $regex: strSearch, $options: 'i' },
          },
        ],
      }),
    };

    const pipeline = [
      {
        $match: match_query,
      },
      {
        $lookup: {
          from: 'dispatch_items',
          localField: '_id',
          foreignField: 'dispatch_id',
          as: 'dispatch_items',
        },
      },
      {
        $lookup: {
          from: 'packing_done_other_details',
          localField: 'dispatch_items.packing_done_other_details_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                packing_id: 1,
                packing_date: 1,
              },
            },
          ],
          as: 'packing_details',
        },
      },
      {
        $unwind: {
          path: '$packing_details',
          preserveNullAndEmptyArrays: true,
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
          InvoiceId: '$invoice_no',
          InvoiceDate: '$invoice_date_time',
          PackingId: '$packing_details.packing_id',
          PackingDate: '$packing_details.packing_date',
          CreatedOn: '$createdAt',
          ModifiedOn: '$updatedAt',
        },
      },
    ];

    const result = await dispatchModel.aggregate(pipeline);

    return res.status(StatusCodes.OK).json(result);
  }
);

export const invoice_no_dropdown = catchAsync(async (req, res, next) => {
  try {
    const InvoiceNo = await dispatchModel
      .find({}, { _id: 1, invoice_no: 1 })
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      result: InvoiceNo.map((i) => ({
        _id: i._id,
        invoice_no: i.invoice_no,
      })),
    });
  } catch (err) {
    next(err);
  }
});
