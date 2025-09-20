import mongoose, { isValidObjectId } from 'mongoose';
import issue_for_order_model from '../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import finished_ready_for_packing_model from '../../../database/schema/packing/issue_for_packing/finished_ready_for_packing/finished_ready_for_packing.schema.js';
import {
  packing_done_items_model,
  packing_done_other_details_model,
} from '../../../database/schema/packing/packing_done/packing_done.schema.js';
import { order_category } from '../../../database/Utils/constants/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { generatePDF } from '../../../utils/generatePDF/generatePDFBuffer.js';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment';

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

    const updated_other_details_payload = {
      ...other_details,
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

    const old_packing_done_items = await packing_done_items_model
      .find({ packing_done_other_details_id: id }, { issue_for_packing_id: 1 })
      .session(session);

    const old_packing_done_item_ids = old_packing_done_items?.map(
      (item) => item?.issue_for_packing_id
    );

    const update_existing_pakcing_done_item_status = await (
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
      !update_existing_pakcing_done_item_status?.acknowledged ||
      update_existing_pakcing_done_item_status.modifiedCount === 0
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
    const update_issue_for_order_result = await (
      other_details?.order_category === order_category?.raw
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
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const revert_packing_done_items = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.userDetails;
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
      ...new Set(packing_done_items?.map((item) => item?.issue_for_packing_id)),
    ];
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
    is_dispatch_done: false,
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
  // const aggPackingDoneItemsUnwind = {
  //     $unwind: {
  //         path: '$packing_done_item_details',
  //         preserveNullAndEmptyArrays: true,
  //     },
  // };
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
  const aggMatch = {
    $match: {
      ...match_query,
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

  const listAggregate = [
    aggregatePackingDoneItems,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    // aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipeline

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
  // const aggCount = {
  //     $count: 'totalCount',
  // }; // count aggregation stage

  // const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  // const totalDocument =
  //     await packing_done_other_details_model.aggregate(totalAggregate);

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
  const { id } = req.params;
  if (!id) {
    throw new ApiError('Packing Done ID is required.', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid Packing ID.', StatusCodes.BAD_REQUEST);
  };
  const { customer_id, order_type, product_type } = req.query;
  const match_query = {
    is_packing_done: false,
    product_type: product_type,
    order_category: order_type,
    'order_details.customer_id':
      mongoose.Types.ObjectId.createFromHexString(customer_id),
  };


  const pipeline = [
    {
      $match: { _id: mongoose.Types.ObjectId.createFromHexString(id) }
    },
    {
      $lookup: {
        from: "packing_done_items",
        localField: "_id",
        foreignField: "packing_done_other_details_id",
        as: "packing_items",
        pipeline: [
          {
            $lookup: {
              from: "finished_ready_for_packing_details",
              localField: "issue_for_packing_id",
              foreignField: "_id",
              as: "issue_for_packing_details"
            }
          },
          {
            $group: {
              _id: "$issue_for_packing_id",
              issue_for_packing_details: { $first: "$issue_for_packing_details" },
              items: { $push: "$$ROOT" }
            }
          },
          {
            $unset: "items.issue_for_packing_details"
          },
          {
            $project: {
              _id: 0,
              issue_for_packing_details: {
                $mergeObjects: [
                  { $arrayElemAt: ["$issue_for_packing_details", 0] },
                  { items: "$items" }
                ]
              }
            }
          }
        ]
      }
    },
    {
      $unionWith: {
        coll: "finished_ready_for_packing_details",
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
          { $match: match_query },
          {
            $project: {
              order_details: 0,
            },
          },
        ]
      }
    }
  ]
  const result = await packing_done_other_details_model.aggregate(pipeline);
  // const result = await finished_ready_for_packing_model.aggregate(pipeline);
  const response = new ApiResponse(StatusCodes?.OK, 'Packing Done Items Fetched Successfully', result);

  return res.status(response.statusCode).json(response);
})

export const generatePackingSlip = catchAsync(async (req, res) => {
  const { id } = req.params;

  const item = await packing_done_items_model.findById(id).lean();
  if (!item) {
    return res.status(404).json({ status: false, message: 'Packing item not found' });
  }

  const otherDetails = await packing_done_other_details_model
    .findById(item.packing_done_other_details_id)
    .lean();

  if (!otherDetails) {
    return res.status(404).json({ status: false, message: 'Packing details not found' });
  }

  const allItems = await packing_done_items_model
    .find({ packing_done_other_details_id: item.packing_done_other_details_id })
    .lean();

  const formattedPackingDate = otherDetails.packing_date
    ? moment(otherDetails.packing_date).format('DD-MM-YYYY')
    : '';

  // Compute totals
  const totalSheets = allItems.reduce((sum, i) => sum + (i.no_of_sheets || 0), 0);
  const totalSqMtr = allItems.reduce((sum, i) => sum + (i.sqm || 0), 0);

  // Compute item_summary (group by item + size)
  const summaryMap = {};
  for (const i of allItems) {
    const key = `${i.item_name || ' '}_${i.length || 0}x${i.width || 0}`;
    if (!summaryMap[key]) {
      summaryMap[key] = {
        item_name: i.item_name || ' ',
        size: `${i.length || 0} x ${i.width || 0}`,
        sheets: 0,
        sqm: 0,
      };
    }
    summaryMap[key].sheets += i.no_of_sheets || 0;
    summaryMap[key].sqm += i.sqm || 0;
  }

  const item_summary = Object.values(summaryMap);

  // Prepare final data for Handlebars
  const combinedData = {
    ...otherDetails,
    packing_date: formattedPackingDate,
    packing_done_item_details: allItems,
    totalSheets,
    totalSqMtr,
    item_summary,
  };

  const pdfBuffer = await generatePDF({
    templateName: 'packing_slip',
    templatePath: path.join(__dirname, '..', '..', '..', 'views', 'packing_done', 'packing_slip.hbs'),
    data: combinedData,
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="packing-slip.pdf"',
    'Content-Length': pdfBuffer.length,
  });

  return res.status(200).end(pdfBuffer);
});


