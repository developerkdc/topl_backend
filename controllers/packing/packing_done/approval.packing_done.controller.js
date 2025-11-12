import mongoose, { isValidObjectId } from 'mongoose';
import { order_category } from '../../../database/Utils/constants/constants.js';
import issue_for_order_model from '../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import finished_ready_for_packing_model from '../../../database/schema/packing/issue_for_packing/finished_ready_for_packing/finished_ready_for_packing.schema.js';
import { approval_packing_done_items_model, approval_packing_done_other_details_model } from '../../../database/schema/packing/packing_done/approval.packing_done_schema.js';
import { packing_done_items_model, packing_done_other_details_model } from '../../../database/schema/packing/packing_done/packing_done.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { approval_status, StatusCodes } from '../../../utils/constants.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';


export const fetch_all_packing_done_items = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'updatedAt',
    sort = 'desc',
    search = '',
  } = req.query;

  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

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
    ...filterData,
    ...search_query,
    'approval.approvalPerson': _id,
  };

  const aggregatePackingDoneItems = {
    $lookup: {
      from: 'approval_packing_done_items',
      foreignField: 'approval_packing_done_other_details_id',
      localField: '_id',
      as: 'packing_done_item_details',

    },
  };

  const aggCreatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'created_by',
    },
  };

  const aggUpdatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'updated_by',
    },
  };

  const aggCreatedByUnwind = {
    $unwind: {
      path: '$created_by',
      preserveNullAndEmptyArrays: true,
    },
  };

  const aggUpdatedByUnwind = {
    $unwind: {
      path: '$updated_by',
      preserveNullAndEmptyArrays: true,
    },
  };

  const aggCustomerDetailsLookup = {
    $lookup: {
      from: 'customers',
      localField: 'customer_id',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            owner_name: 1,
            // customer_details: 1,
            company_name: 1
          },
        },
      ],
      as: 'customer_details',
    },
  };

  const aggCustomerDetailsUnwind = {
    $unwind: {
      path: '$customer_details',
      preserveNullAndEmptyArrays: true,
    },
  };

  const aggMatch = {
    $match: {
      ...match_query,
    },
  };

  const aggComputeProductTypeSort = {
    $addFields: {
      __sort_product_type: {
        $cond: [
          { $eq: ['$order_category', 'RAW'] },
          // if RAW -> use top-level product_type
          '$product_type',
          // else -> use packing_done_item_details[0].product_type if exists, otherwise top-level product_type
          {
            $ifNull: [
              { $arrayElemAt: ['$packing_done_item_details.product_type', 0] },
              '$product_type',
            ],
          },
        ],
      },
    },
  };


  const aggSort = {
    $sort: {
      ...(sortBy === "product_type"
        ? { sort_product_type: sort === "desc" ? -1 : 1 }
        : { [sortBy]: sort === "desc" ? -1 : 1 }),
    },
  };

  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };

  const aggLimit = {
    $limit: parseInt(limit),
  };

  const listAggregate = [
    aggregatePackingDoneItems,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggCustomerDetailsLookup,
    aggCustomerDetailsUnwind,
    // aggComputeProductTypeSort,
    // aggMatch,
    aggComputeProductTypeSort,
    aggSort,
    aggSkip,
    aggLimit,
  ];

  const list_aggregate = [
    aggMatch,
    {
      $facet: {
        data: listAggregate,
        totalCount: [
          {
            $count: 'totalCount',
          },
        ],
      },
    },
  ];

  const issue_for_raw_packing =
    await approval_packing_done_other_details_model.aggregate(list_aggregate);

  const totalPages = Math.ceil(
    (issue_for_raw_packing[0]?.totalCount?.[0]?.totalCount || 0) / limit
  );

  const response = new ApiResponse(
    StatusCodes.OK,
    'Approval Packing Done Data Fetched Successfully',
    {
      data: issue_for_raw_packing[0]?.data || [],
      totalPages: totalPages,
    }
  );

  return res.status(StatusCodes.OK).json(response);
});

export const fetch_all_packing_items_by_packing_done_other_details_id = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.BAD_REQUEST);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const pakcing_done_other_details_result = await approval_packing_done_other_details_model.findById(id).lean();

    if (!pakcing_done_other_details_result) {
      throw new ApiError('Order not found', StatusCodes.NOT_FOUND);
    }

    const is_approval_sent =
      pakcing_done_other_details_result?.approval_status?.sendForApproval?.status;

    // if (!is_approval_sent) {
    //   throw new ApiError('Approval not sent for this order', StatusCodes.BAD_REQUEST);
    // };

    const previous_packing_items_details_pipeline = [
      {
        $lookup: {
          from: 'packing_done_items',
          foreignField: '_id',
          localField: 'packing_item_id',
          as: 'previous_packing_item_details',
        },
      },
      {
        $unwind: {
          path: '$previous_packing_item_details',
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
              from: 'packing_done_other_details',
              foreignField: '_id',
              localField: 'approval_packing_id',
              as: 'previous_packing_done_other_details',
            },
          },
          {
            $unwind: {
              path: '$previous_packing_done_other_details',
              preserveNullAndEmptyArrays: true,
            },
          },
        ]
        : []),

      {
        $lookup: {
          from: 'approval_packing_done_items',
          foreignField: 'approval_packing_done_other_details_id',
          localField: '_id',
          as: 'packing_items_details',
          pipeline: is_approval_sent ? previous_packing_items_details_pipeline : [],
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

    const [result] = await approval_packing_done_other_details_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'All Items of packing fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const approve_packing_details = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.userDetails;

  if (!id) {
    throw new ApiError('Packing ID is required', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid Packing ID', StatusCodes.BAD_REQUEST);
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

    const packing_done_other_details_approval_result = await approval_packing_done_other_details_model
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
    if (!packing_done_other_details_approval_result) {
      throw new ApiError(
        'Failed to update packing details',
        StatusCodes.BAD_REQUEST
      );
    }

    const { _id, approval_packing_id, approvalBy, ...rest_order_Details } = packing_done_other_details_approval_result;

    const update_packing_done_details_result = await packing_done_other_details_model.updateOne(
      { _id: approval_packing_id },
      {
        $set: { ...rest_order_Details },
      },
      { session }
    ).lean();

    if (update_packing_done_details_result?.matchedCount === 0) {
      throw new ApiError('Order details not found', StatusCodes.BAD_REQUEST);
    }

    if (
      !update_packing_done_details_result?.acknowledged ||
      update_packing_done_details_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to approve packing done details',
        StatusCodes.BAD_REQUEST
      );
    }

    const approval_item_details =
      await approval_packing_done_items_model
        .find({ approval_packing_done_other_details_id: id, packing_done_other_details_id: approval_packing_id })
        .session(session)
        .lean();
    if (approval_item_details?.length <= 0) {
      throw new ApiError(
        'No approval item details found',
        StatusCodes.BAD_REQUEST
      );
    }

    const old_packing_done_items = await packing_done_items_model
      .find({ packing_done_other_details_id: packing_done_other_details_approval_result?.approval_packing_id }, { issue_for_packing_id: 1 })
      .session(session);

    const old_packing_done_item_ids = old_packing_done_items?.map(
      (item) => item?.issue_for_packing_id
    );

    const update_existing_packing_done_item_status = await (
      other_details?.order_category === order_category?.raw
        ? issue_for_order_model
        : finished_ready_for_packing_model
    ).updateMany(
      { _id: { $in: old_packing_done_item_ids } },
      {
        $set: {
          is_packing_done: false,
        },
      },
      { session }
    );
    if (
      !update_existing_packing_done_item_status?.acknowledged ||
      update_existing_packing_done_item_status.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issued for packing item status.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    const delete_old_packing_done_item_result =
      await packing_done_items_model.deleteMany(
        {
          packing_done_other_details_id:
            packing_done_other_details_approval_result?._id,
        },
        { session }
      );

    if (
      !delete_old_packing_done_item_result?.acknowledged ||
      delete_old_packing_done_item_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete old packing done item details.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const updated_packing_done_item_details_payload =
      approval_item_details?.map((item) => {
        return {
          ...item,
          packing_done_other_details_id:
            packing_done_other_details_approval_result?.approval_packing_id,
          created_by: item.created_by ? item?.created_by : user?._id,
          updated_by: user._id,
          createdAt: item.createdAt ? item?.createdAt : new Date(),
          updatedAt: new Date(),
        };
      });

    const create_packing_done_item_details_result =
      await packing_done_items_model.insertMany(
        updated_packing_done_item_details_payload,
        { session }
      );
    if (
      !create_packing_done_item_details_result ||
      create_packing_done_item_details_result?.length === 0
    ) {
      throw new ApiError(
        'Failed to create packing done item details.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const issue_for_packing_set = [
      ...new Set(
        approval_item_details?.map((item) => item?.issue_for_packing_id)
      ),
    ];
    const update_issue_for_order_result = await (
      other_details?.order_category.toUpperCase() === order_category?.raw
        ? issue_for_order_model
        : finished_ready_for_packing_model
    ).updateMany(
      { _id: { $in: issue_for_packing_set } },
      {
        $set: {
          is_packing_done: true,
          updated_by: user._id,
        },
      },
      { session }
    );

    if (
      !update_issue_for_order_result?.acknowledged ||
      update_issue_for_order_result.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issued for packing item status.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    const response = new ApiResponse(
      StatusCodes.OK,
      'Packing Details Approved Successfully',
      {
        other_details: update_packing_done_details_result,
        item_details: create_packing_done_item_details_result,
      }
    );
    await session.commitTransaction();
    return res.status(response.statusCode).json(response);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session?.endSession();
  }
});
export const reject_packing_details = catchAsync(async (req, res) => {
  const { packing_done_other_details_id } = req.params;
  const user = req.userDetails;

  if (!packing_done_other_details_id) {
    throw new ApiError('Packing Done other details ID is required', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(packing_done_other_details_id)) {
    throw new ApiError('Invalid Packing Done other details ID', StatusCodes.BAD_REQUEST);
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

    const packing_done_other_details_approval_status_result = await approval_packing_done_other_details_model
      .findOneAndUpdate(
        {
          _id: packing_done_other_details_id,
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

    if (!packing_done_other_details_approval_status_result) {
      throw new ApiError(
        'Failed to update packing done other details details',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_packing_doone_other_details_result = await packing_done_other_details_model.updateOne(
      { _id: packing_done_other_details_approval_status_result?.approval_packing_id },
      {
        $set: { approval_status: updated_approval_status },
      },
      { session }
    ).lean();

    if (update_packing_doone_other_details_result?.matchedCount === 0) {
      throw new ApiError('Packing Done details not found', StatusCodes.BAD_REQUEST);
    }
    if (
      !update_packing_doone_other_details_result?.acknowledged ||
      update_packing_doone_other_details_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to reject packing done details',
        StatusCodes.BAD_REQUEST
      );
    }
    await session.commitTransaction();

    const response = new ApiResponse(
      StatusCodes.OK,
      'Packing Details Rejected successfully'
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    await session?.endSession();
  }
});
