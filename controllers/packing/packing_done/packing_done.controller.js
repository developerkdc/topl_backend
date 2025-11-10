import mongoose, { isValidObjectId } from 'mongoose';
import issue_for_order_model from '../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import finished_ready_for_packing_model from '../../../database/schema/packing/issue_for_packing/finished_ready_for_packing/finished_ready_for_packing.schema.js';
import {
  packing_done_items_model,
  packing_done_other_details_model,
} from '../../../database/schema/packing/packing_done/packing_done.schema.js';
import { order_category } from '../../../database/Utils/constants/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { approval_status, StatusCodes } from '../../../utils/constants.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import {
  generatePackingPDF,
  generatePDF,
} from '../../../utils/generatePDF/generatePDFBuffer.js';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment';
import { approval_packing_done_items_model, approval_packing_done_other_details_model } from '../../../database/schema/packing/packing_done/approval.packing_done_schema.js';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const create_packing = catchAsync(async (req, res) => {
  const { other_details, packing_done_item_details } = req.body;

  const issue_for_packing_set = new Set();
  const user = req.userDetails;

  for (let field of ['packing_done_item_details', 'other_details']) {
    if (!req.body[field]) {
      throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
    }
  }

  if (
    !Array.isArray(packing_done_item_details) ||
    packing_done_item_details.length === 0
  ) {
    throw new ApiError(
      'Atleast one packing item is required.',
      StatusCodes.BAD_REQUEST
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // 🔹 Find the latest packing_id and increment it
    const lastPacking = await packing_done_other_details_model
      .findOne({}, { packing_id: 1 })
      .sort({ packing_id: -1 })
      .lean()
      .session(session);

    const next_packing_id = lastPacking ? lastPacking.packing_id + 1 : 1;

    const updated_other_details_payload = {
      ...other_details,
      packing_id: next_packing_id,
      created_by: user._id,
      updated_by: user._id,
    };

    const [create_packing_done_other_details_result] =
      await packing_done_other_details_model.create(
        [updated_other_details_payload],
        { session }
      );

    if (!create_packing_done_other_details_result) {
      throw new ApiError(
        'Failed to create packing done other details.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const updated_packing_done_item_details_payload =
      packing_done_item_details?.map((item) => {
        issue_for_packing_set?.add(item?.issue_for_packing_id);
        return {
          ...item,
          packing_done_other_details_id:
            create_packing_done_other_details_result._id,
          created_by: user._id,
          updated_by: user._id,
        };
      });

    const create_packing_done_item_details_result =
      await packing_done_items_model.insertMany(
        updated_packing_done_item_details_payload,
        { session }
      );

    if (
      !create_packing_done_item_details_result ||
      create_packing_done_item_details_result.length === 0
    ) {
      throw new ApiError(
        'Failed to create packing done item details.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const update_issue_for_order_result = await (
      other_details?.order_category === order_category?.raw
        ? issue_for_order_model
        : finished_ready_for_packing_model
    ).updateMany(
      { _id: { $in: [...issue_for_packing_set] } },
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
      StatusCodes.CREATED,
      'Packing Created Successfully',
      {
        other_details: create_packing_done_other_details_result,
        item_details: create_packing_done_item_details_result,
      }
    );

    await session.commitTransaction();
    res.status(response.statusCode).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const update_packing_details = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { other_details, packing_done_item_details } = req.body;
  const user = req.userDetails;
  // const send_for_approval = req.sendForApproval;
  const send_for_approval = true; //for testing it will always be sent for approval
  if (!id) {
    throw new ApiError('Packing ID is required.', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid Packing ID.', StatusCodes.BAD_REQUEST);
  }
  for (let field of ['packing_done_item_details', 'other_details']) {
    if (!req.body[field]) {
      throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
    }
  }

  if (
    !Array.isArray(packing_done_item_details) ||
    packing_done_item_details?.length === 0
  ) {
    throw new ApiError(
      'Atleast one packing item is required.',
      StatusCodes.BAD_REQUEST
    );
  }
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const packing_done_other_details = await packing_done_other_details_model
      .findById(id)
      .session(session);
    if (!packing_done_other_details) {
      throw new ApiError(
        'Packing done other details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    if (!send_for_approval) {
      const old_packing_done_items = await packing_done_items_model
        .find({ packing_done_other_details_id: id }, { issue_for_packing_id: 1 })
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

      const updated_other_details_payload = {
        ...other_details,
        updated_by: user._id,
      };
      const update_packing_done_other_details_result =
        await packing_done_other_details_model.findOneAndUpdate(
          { _id: id },
          { $set: updated_other_details_payload },
          { session, new: true, runValidators: true }
        );
      if (!update_packing_done_other_details_result) {
        throw new ApiError(
          'Failed to update packing done other details.',
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const delete_old_packing_done_item_result =
        await packing_done_items_model.deleteMany(
          {
            packing_done_other_details_id:
              update_packing_done_other_details_result?._id,
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
        packing_done_item_details?.map((item) => {
          return {
            ...item,
            packing_done_other_details_id:
              update_packing_done_other_details_result._id,
            created_by: user._id,
            updated_by: user._id,
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
          packing_done_item_details?.map((item) => item?.issue_for_packing_id)
        ),
      ];
      console.log(issue_for_packing_set);

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
        'Packing Items Updated Successfully',
        {
          other_details: update_packing_done_other_details_result,
          item_details: create_packing_done_item_details_result,
        }
      );
      await session.commitTransaction();
      return res.status(response.statusCode).json(response);
    }
    const { _id, createdAt, ...rest_order_details } = other_details;
    const updated_approval_status = {
      ...approval_status,
      sendForApproval: {
        status: true,
        remark: 'Approval Pending',
      },
    };
    const updated_approval_other_details_payload = {
      ...rest_order_details,
      approval_packing_id: packing_done_other_details?._id,
      packing_id: packing_done_other_details?.packing_id,
      sales_item_name: packing_done_other_details?.sales_item_name,
      approval_status: updated_approval_status,
      approval: {
        editedBy: user?._id,
        approvalPerson: user?.approver_id,
      },
      created_by: user?._id,
      updated_by: user?._id,

    };

    const [add_approval_packing_done_other_deatils_result] = await approval_packing_done_other_details_model.create(
      [updated_approval_other_details_payload],
      { session }
    );

    if (!add_approval_packing_done_other_deatils_result) {
      throw new ApiError(
        'Failed to send for approval',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_packing_done_other_details_status_result = await packing_done_other_details_model.updateOne(
      { _id: packing_done_other_details?._id },
      {
        $set: { approval_status: updated_approval_status },
      },
      { session }
    );

    if (update_packing_done_other_details_status_result?.matchedCount === 0) {
      throw new ApiError(
        'Packing Details not found for approval',
        StatusCodes.NOT_FOUND
      );
    }
    if (
      !update_packing_done_other_details_status_result?.acknowledged ||
      update_packing_done_other_details_status_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update packing done approval status',
        StatusCodes.BAD_REQUEST
      );
    }

    const updated_item_details = packing_done_item_details?.map((item) => {
      const { _id, item_id, createdAt, updatedAt, ...rest_item_details } = item;
      return {
        ...rest_item_details,
        approval_packing_done_other_details_id: add_approval_packing_done_other_deatils_result?._id,
        packing_done_other_details_id: add_approval_packing_done_other_deatils_result?.approval_packing_id,
        packing_item_id: item_id ? item_id : new mongoose.Types.ObjectId(),
        created_by: item.created_by ? item?.created_by : user?._id,
        updated_by: item.updated_by ? item?.updated_by : user?._id,
      };
    });

    const add_approval_packing_items_result =
      await approval_packing_done_items_model.insertMany(updated_item_details, {
        session,
      });

    if (
      !add_approval_packing_items_result ||
      add_approval_packing_items_result.length === 0
    ) {
      throw new ApiError(
        'Failed to add approval packing items',
        StatusCodes.BAD_REQUEST
      );
    }

    await session?.commitTransaction();
    const response = new ApiResponse(
      StatusCodes.OK,
      'Packing Details Sent for Approval Successfully.',
      {
        order_details: add_approval_packing_done_other_deatils_result,
        item_details: add_approval_packing_items_result,
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

export const revert_packing_done_items = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (!id) {
    throw new ApiError('Packing ID is required.', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid Packing ID.', StatusCodes.BAD_REQUEST);
  }

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const packing_done_other_details = await packing_done_other_details_model
      .findById(id)
      .session(session)
      .lean();

    if (!packing_done_other_details) {
      throw new ApiError(
        'Packing done other details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    const packing_done_items = await packing_done_items_model
      .find({ packing_done_other_details_id: id })
      .session(session)
      .lean();

    if (packing_done_items?.length === 0) {
      throw new ApiError('No packing done items found.', StatusCodes.NOT_FOUND);
    }

    const delete_packing_done_other_details_result =
      await packing_done_other_details_model.deleteOne(
        { _id: id },
        { session }
      );

    if (
      !delete_packing_done_other_details_result?.acknowledged ||
      delete_packing_done_other_details_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete packing done other details.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const delete_packing_done_items_result =
      await packing_done_items_model.deleteMany(
        { packing_done_other_details_id: id },
        { session }
      );

    if (
      !delete_packing_done_items_result?.acknowledged ||
      delete_packing_done_items_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete packing done items.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const issue_for_packing_set = [
      ...new Set(
        packing_done_items
          ?.map((item) => item?.issue_for_packing_id)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      ),
    ];

    // ✅ Log for debugging (safe to keep or remove)
    console.log('Updating issue_for_packing IDs:', issue_for_packing_set);
    console.log(
      'Target model:',
      packing_done_other_details?.order_category === order_category?.raw
        ? 'issue_for_order_model'
        : 'finished_ready_for_packing_model'
    );

    const update_issue_for_order_result = await (
      packing_done_other_details?.order_category === order_category?.raw
        ? issue_for_order_model
        : finished_ready_for_packing_model
    ).updateMany(
      { _id: { $in: issue_for_packing_set } },
      {
        $set: {
          is_packing_done: false,
          updated_by: user._id,
        },
      },
      { session }
    );

    if (!update_issue_for_order_result?.acknowledged) {
      throw new ApiError(
        'Failed to update issued for packing item status.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Just warn if no documents matched/updated
    if (update_issue_for_order_result.matchedCount === 0) {
      console.warn(
        '⚠️ No matching issued for packing items found for IDs:',
        issue_for_packing_set
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Packing Items Reverted Successfully',
      {
        other_details: delete_packing_done_other_details_result,
        item_details: delete_packing_done_items_result,
      }
    );

    await session.commitTransaction();
    return res.status(response.statusCode).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

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
  };

  const aggregatePackingDoneItems = {
    $lookup: {
      from: 'packing_done_items',
      foreignField: 'packing_done_other_details_id',
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
            company_name: 1,
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
  const aggFlattenProductType = {
    $addFields: {
      sort_product_type: {
        $reduce: {
          input: "$product_type",
          initialValue: "",
          in: {
            $concat: [
              "$$value",
              { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
              "$$this"
            ]
          }
        }
      }
    }
  };


  // const aggSort = {
  //   $sort: {
  //     ...(sortBy === 'product_type'
  //       ? { __sort_product_type: sort === 'desc' ? -1 : 1 }
  //       : sortBy === 'customer_details.owner_name'
  //         ? { 'customer_details.owner_name': sort === 'desc' ? -1 : 1 }
  //         : sortBy === 'customer_details'
  //           ? { 'customer_details.customer_details': sort === 'desc' ? -1 : 1 }
  //           : { [sortBy]: sort === 'desc' ? -1 : 1 }),
  //   },
  // };

  // const aggSort = {
  //     $sort: {
  //       [sortBy]: sort === 'desc' ? -1 : 1,
  //     },
  //   };
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
    await packing_done_other_details_model.aggregate(list_aggregate);

  const totalPages = Math.ceil(
    (issue_for_raw_packing[0]?.totalCount?.[0]?.totalCount || 0) / limit
  );

  const response = new ApiResponse(
    StatusCodes.OK,
    'Packing Done Data Fetched Successfully',
    {
      data: issue_for_raw_packing[0]?.data || [],
      totalPages: totalPages,
    }
  );

  return res.status(StatusCodes.OK).json(response);
});

export const fetch_single_packing_done_item = catchAsync(async (req, res) => {
  const { request_id } = req.params;
  const id = request_id?.trim();
  let issue_for_packing_model;

  if (!id) {
    throw new ApiError('Packing Done ID is required.', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid Packing ID.', StatusCodes.BAD_REQUEST);
  }

  const { customer_id, order_type, product_type } = req.query;
  const match_query = {
    is_packing_done: false,
    'order_details.customer_id':
      mongoose.Types.ObjectId.createFromHexString(customer_id),
  };

  const models_map = {
    raw: 'raw_order_item_details',
    decorative: 'decorative_order_item_details',
    'series product': 'series_product_order_item_details',
  };

  if (order_type === order_category?.raw) {
    match_query.issued_from = product_type;
    match_query['order_details.order_category'] = order_type;
  } else {
    match_query.product_type = product_type;
    match_query.order_category = order_type;
  }

  if (order_type === order_category?.raw) {
    issue_for_packing_model = 'issued_for_order_items';
  } else {
    issue_for_packing_model = 'finished_ready_for_packing_details';
  }

  // ✅ FIX: ensure the 'from' value is always a valid string
  const lookupCollection =
    models_map[order_type?.toLowerCase()] || 'raw_order_item_details';

  const pipeline = [
    {
      $match: { _id: mongoose.Types.ObjectId.createFromHexString(id) },
    },
    {
      $lookup: {
        from: 'packing_done_items',
        localField: '_id',
        foreignField: 'packing_done_other_details_id',
        as: 'packing_items',
        pipeline: [
          {
            $lookup: {
              from: 'finished_ready_for_packing_details',
              localField: 'issue_for_packing_id',
              foreignField: '_id',
              as: 'issue_for_packing_details',
            },
          },
          {
            $group: {
              _id: '$issue_for_packing_id',
              issue_for_packing_details: {
                $first: '$issue_for_packing_details',
              },
              items: { $push: '$$ROOT' },
            },
          },
          {
            $unset: 'items.issue_for_packing_details',
          },
          {
            $project: {
              _id: 0,
              issue_for_packing_details: {
                $mergeObjects: [
                  { $arrayElemAt: ['$issue_for_packing_details', 0] },
                  { items: '$items' },
                ],
              },
            },
          },
        ],
      },
    },
    {
      $unionWith: {
        coll: issue_for_packing_model,
        pipeline: [
          {
            $lookup: {
              from: 'orders',
              localField: 'order_id',
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
            // ✅ FIXED: using safe variable for 'from'
            $lookup: {
              from: lookupCollection,
              localField: 'order_item_id',
              foreignField: '_id',
              as: 'order_item_details',
            },
          },
          {
            $unwind: {
              path: '$order_item_details',
              preserveNullAndEmptyArrays: true,
            },
          },
          { $match: match_query },
          {
            $project: {
              order_details: 0,
            },
          },
        ],
      },
    },
  ];

  const result = await packing_done_other_details_model.aggregate(pipeline);
  const response = new ApiResponse(
    StatusCodes?.OK,
    'Packing Done Items Fetched Successfully',
    result
  );

  return res.status(response.statusCode).json(response);
});

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

export const generatePackingSlip = catchAsync(async (req, res) => {
  const { id } = req.params;

  const item = await packing_done_items_model.findById(id).lean();
  if (!item) {
    return res
      .status(404)
      .json({ status: false, message: 'Packing item not found' });
  }

  const otherDetails = await packing_done_other_details_model
    .findById(item.packing_done_other_details_id)
    .lean();

  console.log('otherDetails', otherDetails?.sales_item_name);
  if (!otherDetails) {
    return res
      .status(404)
      .json({ status: false, message: 'Packing details not found' });
  }

  const allItems = await packing_done_items_model
    .find({ packing_done_other_details_id: item.packing_done_other_details_id })
    .lean();

  const formattedPackingDate = otherDetails.packing_date
    ? moment(otherDetails.packing_date).format('DD-MM-YYYY')
    : '';

  const totalSheets = allItems.reduce(
    (sum, i) => sum + (i.no_of_sheets || 0),
    0
  );
  const totalSqMtr = allItems.reduce((sum, i) => sum + (i.sqm || 0), 0);

  const summaryMap = {};
  for (const i of allItems) {
    const key = `${i.item_name || ' '}_${i.length || 0}x${i.width || 0}`;
    if (!summaryMap[key]) {
      summaryMap[key] = {
        item_name:
          Array.isArray(otherDetails?.order_category) &&
          otherDetails.order_category.includes('RAW')
            ? i.item_name || ' '
            : otherDetails.sales_item_name || i.item_name || ' ',

        size: `${i.length || 0} x ${i.width || 0}`,
        sheets: 0,
        sqm: 0,
      };
    }
    summaryMap[key].sheets += i.no_of_sheets || 0;
    summaryMap[key].sqm += i.sqm || 0;
  }

  const item_summary = Object.values(summaryMap);

  console.log('item_summary', item_summary);

  const itemsWithExtraFields = allItems.map((i) => ({
    ...i,
    photo_no: otherDetails.photo_no || '',
    remark: otherDetails.remark || '',
    sales_item_name: otherDetails?.order_category.includes('RAW')
      ? i?.item_name
      : otherDetails.sales_item_name,
    bundle_no: otherDetails.bundle_no,
    bundle_description: otherDetails.bundle_description,
    total_no_of_bundles: otherDetails.total_no_of_bundles,
  }));

  let customer_name = '';
  if (typeof otherDetails.customer_details === 'string') {
    customer_name = otherDetails.customer_details;
  } else if (
    otherDetails.customer_details &&
    typeof otherDetails.customer_details === 'object' &&
    otherDetails.customer_details.owner_name
  ) {
    customer_name = otherDetails.customer_details.owner_name;
  }

  let productDisplayName = '';
  const productType =
    typeof otherDetails.product_type === 'string'
      ? otherDetails.product_type.trim()
      : String(otherDetails.product_type || '').trim();

  switch (productType) {
    case 'CROSSCUTTING':
      productDisplayName = 'Log';
      break;
    case 'FLITCHING_FACTORY':
      productDisplayName = 'Flitch';
      break;
    case 'DRESSING_FACTORY':
    case 'GROUPING_FACTORY':
      productDisplayName = 'Veneer';
      break;
    default:
      productDisplayName = productType;
      break;
  }

  const combinedData = {
    ...otherDetails,
    product_display_type: productDisplayName,
    customer_name,
    packing_date: formattedPackingDate,
    packing_done_item_details: itemsWithExtraFields,
    totalSheets,
    totalSqMtr,
    item_summary,
    sales_item_name: otherDetails.sales_item_name || '',
    order_category: otherDetails.order_category,
  };

  console.log('otherDetails', otherDetails);

  const pdfBuffer = await generatePackingPDF({
    templateName: 'packing_slip',
    templatePath: path.join(
      __dirname,
      '..',
      '..',
      '..',
      'views',
      'packing_done',
      'packing_slip.hbs'
    ),
    data: combinedData,
  });

  // const safeCustomerName = (customer_name || 'Unknown')
  //   .replace(/[^a-zA-Z0-9-_]/g, '_')
  //   .substring(0, 50);

  const safeCustomerName = (customer_name || 'Unknown')
    .trim()
    .replace(/\s+/g, '-') // replace spaces with hyphen
    .replace(/[^a-zA-Z0-9-_.]/g, '') // keep letters, numbers, dash, underscore, dot
    .substring(0, 50);

  const safePackingDate = (formattedPackingDate || 'NoDate').replace(
    /[^0-9-]/g,
    '_'
  );
  const packing_id = otherDetails?.packing_id;

  const fileName = `${packing_id}_${safeCustomerName}_${safePackingDate}.pdf`;

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Access-Control-Expose-Headers': 'Content-Disposition',
    'Content-Length': pdfBuffer.length,
  });
  return res.status(200).end(pdfBuffer);
});
