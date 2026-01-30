import mongoose, { STATES } from 'mongoose';
import {
  flitch_inventory_invoice_model,
  flitch_inventory_items_model,
  flitch_inventory_items_view_model,
} from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import {
  createFlitchLogsExcel,
  createFlitchStockReportExcel,
  createInwardItemWiseStockReportExcel,
} from '../../../config/downloadExcel/Logs/Inventory/flitch/flitchLogs.js';
import {
  flitch_approval_inventory_invoice_model,
  flitch_approval_inventory_items_model,
} from '../../../database/schema/inventory/Flitch/flitchApproval.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import {
  log_inventory_invoice_model,
  log_inventory_items_model,
} from '../../../database/schema/inventory/log/log.schema.js';
import { issues_for_crosscutting_model } from '../../../database/schema/factory/crossCutting/issuedForCutting.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { issues_for_flitching_model } from '../../../database/schema/factory/flitching/issuedForFlitching.schema.js';
import { issues_for_peeling_model } from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling.schema.js';

export const listing_flitch_inventory = catchAsync(async (req, res, next) => {
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
    issue_status: null,
  };

  const aggregate_stage = [
    {
      $match: match_query,
    },
    {
      $sort: {
        [sortBy]: sort === 'desc' ? -1 : 1,
      },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ];
  // console.log(sortBy !== 'updatedAt' && sort !== "desc")
  // if (sortBy !== 'updatedAt' && sort !== "desc"){
  //     console.log("first")
  //     aggregate_stage[1] = {
  //         $sort: {
  //             [sortBy]: sort === "desc" ? -1 : 1
  //         }
  //     }
  // }

  const List_flitch_inventory_details =
    await flitch_inventory_items_view_model.aggregate(aggregate_stage);

  const totalItems = await flitch_inventory_items_view_model.countDocuments({
    ...match_query,
  });
  const totalPage = Math.ceil(totalItems / parseInt(limit));

  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: List_flitch_inventory_details,
    totalPage: totalPage,
    message: 'Data fetched successfully',
  });
});

export const item_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no = await flitch_inventory_items_model.distinct('item_sr_no');
  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: item_sr_no,
    message: 'Item Sr No Dropdown fetched successfully',
  });
});

export const inward_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no =
    await flitch_inventory_invoice_model.distinct('inward_sr_no');
  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: item_sr_no,
    message: 'Inward Sr No Dropdown fetched successfully',
  });
});

export const add_flitch_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { inventory_invoice_details, inventory_items_details } = req.body;

    const inward_sr_no = await flitch_inventory_invoice_model.aggregate([
      {
        $group: {
          _id: null,
          latest_inward_sr_no: { $max: '$inward_sr_no' },
        },
      },
    ]);

    const latest_inward_sr_no =
      inward_sr_no?.length > 0 && inward_sr_no?.[0]?.latest_inward_sr_no
        ? inward_sr_no?.[0]?.latest_inward_sr_no + 1
        : 1;

    const add_invoice_details = await flitch_inventory_invoice_model.create(
      [
        {
          inward_sr_no: latest_inward_sr_no,
          ...inventory_invoice_details,
        },
      ],
      { session }
    );

    if (add_invoice_details && add_invoice_details?.length < 0) {
      return next(new ApiError('Failed to add invoice', 400));
    }

    const invoice_details_id = add_invoice_details?.[0]?._id;
    const items_details = inventory_items_details?.map((elm, index) => {
      // elm.item_sr_no = index + 1;
      elm.invoice_id = invoice_details_id;
      return elm;
    });

    const add_items_details = await flitch_inventory_items_model.insertMany(
      items_details,
      {
        session,
      }
    );

    if (add_items_details && add_items_details?.length < 0) {
      return next(new ApiError('Failed to add Items Details', 400));
    }

    await session.commitTransaction();
    session.endSession();
    return res
      .status(StatusCodes.CREATED)
      .json(
        new ApiResponse(
          StatusCodes.CREATED,
          'Inventory has added successfully',
          { add_invoice_details, add_items_details }
        )
      );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});

export const add_single_flitch_item_inventory = catchAsync(
  async (req, res, next) => {
    const item_details = req.body?.item_details;

    const invoice_id = item_details?.invoice_id;

    if (!invoice_id || !mongoose.isValidObjectId(invoice_id)) {
      return next(new ApiError('Please provide valid invoice id', 400));
    }

    const add_item_details = await flitch_inventory_items_model.create({
      ...item_details,
    });

    return res.status(200).json({
      statusCode: 200,
      status: 'success',
      data: add_item_details,
      message: 'Inventory Item has added successfully',
    });
  }
);

export const edit_flitch_item_inventory = catchAsync(async (req, res, next) => {
  const item_id = req.params?.item_id;
  const item_details = req.body?.item_details;

  const update_item_details = await flitch_inventory_items_model.updateOne(
    { _id: item_id },
    {
      $set: {
        ...item_details,
      },
    }
  );

  if (
    !update_item_details?.acknowledged &&
    update_item_details?.modifiedCount <= 0
  ) {
    return next(new ApiError('Failed to update item details', 400));
  }

  return res.status(200).json({
    statusCode: 200,
    status: 'Updated',
    data: update_item_details,
    message: 'Inventory Item has updated successfully',
  });
});

export const edit_flitch_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params?.invoice_id;
    const invoice_details = req.body?.invoice_details;

    const update_voice_details = await flitch_inventory_invoice_model.updateOne(
      { _id: invoice_id },
      {
        $set: invoice_details,
      }
    );

    if (
      !update_voice_details?.acknowledged &&
      update_voice_details?.modifiedCount <= 0
    ) {
      return next(new ApiError('Failed to update item details', 400));
    }

    return res.status(200).json({
      statusCode: 200,
      status: 'Updated',
      data: update_voice_details,
      message: 'Inventory Invoice has updated successfully',
    });
  }
);

//csv inventory
export const flitchLogsCsv = catchAsync(async (req, res) => {
  const { search = '' } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  // 1. Build search query
  let search_query = {};
  if (search && req?.body?.searchFields) {
    string?.forEach((field) => {
      search_query[field] = { $regex: search, $options: 'i' };
    });

    boolean?.forEach((field) => {
      if (search.toLowerCase() === 'true' || search.toLowerCase() === 'false') {
        search_query[field] = search.toLowerCase() === 'true';
      }
    });

    if (!isNaN(search)) {
      numbers?.forEach((field) => {
        search_query[field] = Number(search);
      });
    }

    arrayField?.forEach((field) => {
      search_query[field] = { $in: [search] };
    });

    if (Object.keys(search_query).length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: [],
        message: 'Results Not Found',
      });
    }
  }

  // 2. Get filter query
  const filterData = dynamic_filter(filter);

  // 3. Clean invalid/empty values
  const cleanMatchQuery = (query) => {
    const cleaned = {};
    for (const key in query) {
      const value = query[key];

      if (value === undefined || value === '' || value === null) continue;

      if (typeof value === 'object' && ('$gte' in value || '$lte' in value)) {
        const range = {};
        if (
          value.$gte !== '' &&
          value.$gte !== null &&
          value.$gte !== undefined
        ) {
          range.$gte = value.$gte;
        }
        if (
          value.$lte !== '' &&
          value.$lte !== null &&
          value.$lte !== undefined
        ) {
          range.$lte = value.$lte;
        }
        if (Object.keys(range).length > 0) {
          cleaned[key] = range;
        }
        continue;
      }

      cleaned[key] = value;
    }
    return cleaned;
  };

  // 4. Merge, clean, and finalize query
  const fullQuery = {
    ...filterData,
    ...search_query,
  };

  const cleanedQuery = cleanMatchQuery(fullQuery);

  const match_query = {
    issue_status: null, // Match listing API exactly
    ...cleanedQuery,
  };

  // 5. Build aggregation
  const aggregate_stage = [
    {
      $match: match_query,
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
  ];

  // 6. Fetch Data
  const allData =
    await flitch_inventory_items_view_model.aggregate(aggregate_stage);

  if (allData.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(new ApiResponse(StatusCodes.NOT_FOUND, 'NO Data found...'));
  }

  // 7. Generate Excel
  const excelLink = await createFlitchLogsExcel(allData);
  console.log('link => ', excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, 'CSV downloaded successfully...', excelLink)
  );
});

export const flitch_item_listing_by_invoice = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params.invoice_id;

    const aggregate_stage = [
      {
        $match: {
          'flitch_invoice_details._id': new mongoose.Types.ObjectId(invoice_id),
        },
      },
      {
        $sort: {
          item_sr_no: 1,
        },
      },
      {
        $project: {
          flitch_invoice_details: 0,
        },
      },
    ];

    const single_invoice_list_flitch_inventory_details =
      await flitch_inventory_items_view_model.aggregate(aggregate_stage);

    // const totalCount = await log_inventory_items_view_model.countDocuments({
    //   ...match_query,
    // });

    // const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: 'success',
      data: single_invoice_list_flitch_inventory_details,
      // totalPage: totalPage,
      message: 'Data fetched successfully',
    });
  }
);

export const edit_flitch_item_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const invoice_id = req.params?.invoice_id;
      const items_details = req.body?.inventory_items_details;
      const invoice_details = req.body?.inventory_invoice_details;
      const sendForApproval = req.sendForApproval;
      const user = req.userDetails;

      const fetchInvoiceData = await flitch_inventory_invoice_model.findOne({
        _id: invoice_details,
      });
      if (fetchInvoiceData.approval_status?.sendForApproval?.status)
        return next(new ApiError('Already send for approval'));

      if (!sendForApproval) {
        const update_invoice_details =
          await flitch_inventory_invoice_model.updateOne(
            { _id: invoice_id },
            {
              $set: {
                ...invoice_details,
                approval_status: {
                  sendForApproval: {
                    status: false,
                    remark: null,
                  },
                  approved: {
                    status: false,
                    remark: null,
                  },
                  rejected: {
                    status: false,
                    remark: null,
                  },
                },
              },
            },
            { session }
          );

        if (
          !update_invoice_details.acknowledged ||
          update_invoice_details.modifiedCount <= 0
        )
          return next(new ApiError('Failed to update invoice', 400));

        const all_invoice_items = await flitch_inventory_items_model.deleteMany(
          { invoice_id: invoice_id },
          { session }
        );

        if (
          !all_invoice_items.acknowledged ||
          all_invoice_items.deletedCount <= 0
        )
          return next(new ApiError('Failed to update invoice items', 400));

        const update_item_details =
          await flitch_inventory_items_model.insertMany([...items_details], {
            session,
          });

        await session.commitTransaction();
        session.endSession();
        return res
          .status(StatusCodes.OK)
          .json(
            new ApiResponse(
              StatusCodes.OK,
              'Inventory item updated successfully',
              update_item_details
            )
          );
      } else {
        const edited_by = user?.id;
        const approval_person = user.approver_id;
        const { _id, createdAt, updatedAt, ...invoiceDetailsData } =
          invoice_details;

        const add_invoice_details =
          await flitch_approval_inventory_invoice_model.create(
            [
              {
                ...invoiceDetailsData,
                invoice_id: invoice_id,
                approval_status: {
                  sendForApproval: {
                    status: true,
                    remark: 'Approval Pending',
                  },
                  approved: {
                    status: false,
                    remark: null,
                  },
                  rejected: {
                    status: false,
                    remark: null,
                  },
                },
                approval: {
                  editedBy: edited_by,
                  approvalPerson: approval_person,
                },
              },
            ],
            { session }
          );

        if (!add_invoice_details?.[0])
          return next(new ApiError('Failed to add invoice approval', 400));

        await flitch_inventory_invoice_model.updateOne(
          { _id: invoice_id },
          {
            $set: {
              approval_status: {
                sendForApproval: {
                  status: true,
                  remark: 'Approval Pending',
                },
                approved: {
                  status: false,
                  remark: null,
                },
                rejected: {
                  status: false,
                  remark: null,
                },
              },
            },
          },
          { session }
        );

        const itemDetailsData = items_details.map((ele) => {
          const { _id, createdAt, updatedAt, ...itemData } = ele;
          return {
            ...itemData,
            flitch_item_id: _id ? _id : new mongoose.Types.ObjectId(),
            approval_invoice_id: add_invoice_details[0]?._id,
          };
        });

        const add_approval_item_details =
          await flitch_approval_inventory_items_model.insertMany(
            itemDetailsData,
            { session }
          );

        await session.commitTransaction();
        session.endSession();
        return res
          .status(StatusCodes.OK)
          .json(
            new ApiResponse(
              StatusCodes.OK,
              'Inventory item send for approval successfully',
              add_approval_item_details
            )
          );
      }
    } catch (error) {
      console.log(error);
      await session.abortTransaction();
      session.endSession();
      return next(error);
    }
  }
);

export const listing_flitch_history_inventory = catchAsync(
  async (req, res, next) => {
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
      issue_status: { $ne: null },
    };

    const aggregate_stage = [
      {
        $match: match_query,
      },
      {
        $sort: {
          [sortBy]: sort === 'desc' ? -1 : 1,
          _id: sort === 'desc' ? -1 : 1,
        },
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ];

    const List_flitch_inventory_details =
      await flitch_inventory_items_view_model.aggregate(aggregate_stage);

    const totalCount = await flitch_inventory_items_view_model.countDocuments({
      ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: 'success',
      data: List_flitch_inventory_details,
      totalPage: totalPage,
      message: 'Data fetched successfully',
    });
  }
);

export const flitchHistoryCsv = catchAsync(async (req, res) => {
  const { search = '' } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  // 1. Build search query using DynamicSearch
  let search_query = {};
  if (search !== '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (!search_data || Object.keys(search_data).length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: [],
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  // 2. Get filter query
  const filterData = dynamic_filter(filter);

  // ✅ 3. Clean empty/null/invalid filter values
  const cleanMatchQuery = (query) => {
    const cleaned = {};
    for (const key in query) {
      const value = query[key];

      if (value === undefined || value === '' || value === null) continue;

      if (
        typeof value === 'object' &&
        value !== null &&
        ('$gte' in value || '$lte' in value)
      ) {
        const range = {};
        if (
          value.$gte !== '' &&
          value.$gte !== null &&
          value.$gte !== undefined
        ) {
          range.$gte = value.$gte;
        }
        if (
          value.$lte !== '' &&
          value.$lte !== null &&
          value.$lte !== undefined
        ) {
          range.$lte = value.$lte;
        }
        if (Object.keys(range).length > 0) {
          cleaned[key] = range;
        }
        continue;
      }

      cleaned[key] = value;
    }
    return cleaned;
  };

  // 4. Merge & clean the final match query
  const mergedQuery = {
    ...filterData,
    ...search_query,
  };

  const cleanedQuery = cleanMatchQuery(mergedQuery);

  const match_query = {
    issue_status: { $ne: null },
    ...cleanedQuery,
  };

  console.log('Final MATCH_QUERY =>', JSON.stringify(match_query, null, 2));

  // 5. Aggregation pipeline
  const aggregate_stage = [
    {
      $match: match_query,
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
  ];

  // 6. Fetch data
  const allData =
    await flitch_inventory_items_view_model.aggregate(aggregate_stage);

  if (!allData || allData.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(new ApiResponse(StatusCodes.NOT_FOUND, 'NO Data found...'));
  }

  // 7. Generate Excel
  const excelLink = await createFlitchLogsExcel(allData);
  console.log('link => ', excelLink);

  // 8. Respond
  return res.json(
    new ApiResponse(StatusCodes.OK, 'CSV downloaded successfully...', excelLink)
  );
});

/**
 * Generate Flitch Stock Report
 * Aggregates data from both flitch inventory and factory flitching done
 */
export const flitchStockReportCsv = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Stock Report Request - Start Date:', startDate);
  console.log('Stock Report Request - End Date:', endDate);
  console.log('Stock Report Request - Filter:', filter);

  // Validate required parameters
  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  // Build filter for item_name if provided
  const itemFilter = {};
  if (filter.item_name) {
    itemFilter.item_name = filter.item_name;
  }

  try {
    // Step 1: Get all unique item names from both sources
    // Source 1: Flitch Inventory
    const inventoryItems = await flitch_inventory_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
        },
      },
    ]);

    // Source 2: Flitching Done (Factory)
    const factoryItems = await flitching_done_model.aggregate([
      {
        $match: {
          deleted_at: null,
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
        },
      },
    ]);

    // Combine unique item names
    const allItemNames = [
      ...new Set([
        ...inventoryItems.map((i) => i._id),
        ...factoryItems.map((i) => i._id),
      ]),
    ].filter((name) => name); // Remove null/undefined

    if (allItemNames.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          new ApiResponse(
            StatusCodes.NOT_FOUND,
            'No stock data found for the selected period'
          )
        );
    }

    // Step 2: For each item name, calculate stock movements
    const stockData = await Promise.all(
      allItemNames.map(async (item_name) => {
        // Current available CMT from inventory (where issue_status = null)
        const currentInventoryCmt = await flitch_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
              $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        // Current available CMT from factory (where issue_status = null)
        const currentFactoryCmt = await flitching_done_model.aggregate([
          {
            $match: {
              item_name,
              deleted_at: null,
              $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        const currentAvailableCmt =
          (currentInventoryCmt[0]?.total_cmt || 0) +
          (currentFactoryCmt[0]?.total_cmt || 0);

        // Flitch Received (inventory inward during period)
        const flitchReceived = await flitch_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
            },
          },
          {
            $lookup: {
              from: 'flitch_inventory_invoice_details',
              localField: 'invoice_id',
              foreignField: '_id',
              as: 'invoice',
            },
          },
          {
            $unwind: '$invoice',
          },
          {
            $match: {
              'invoice.inward_date': { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        // CC Received (factory flitching done during period)
        const ccReceived = await flitching_done_model.aggregate([
          {
            $match: {
              item_name,
              deleted_at: null,
              'worker_details.flitching_date': { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        // Issued from inventory (order and challan during period)
        const inventoryIssued = await flitch_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
              issue_status: { $in: ['order', 'challan'] },
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        // Issued from factory (order and challan during period)
        const factoryIssued = await flitching_done_model.aggregate([
          {
            $match: {
              item_name,
              deleted_at: null,
              issue_status: { $in: ['order', 'challan'] },
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        // Extract values
        const flitchReceivedCmt = flitchReceived[0]?.total_cmt || 0;
        const ccReceivedCmt = ccReceived[0]?.total_cmt || 0;
        const totalIssuedCmt =
          (inventoryIssued[0]?.total_cmt || 0) + (factoryIssued[0]?.total_cmt || 0);

        // Calculate opening balance
        // Opening = Current Available + Issued - Received
        const totalReceived = flitchReceivedCmt + ccReceivedCmt;
        const openingBalance = currentAvailableCmt + totalIssuedCmt - totalReceived;

        // Calculate closing balance
        // Closing = Opening + Received - Issued
        const closingBalance = openingBalance + totalReceived - totalIssuedCmt;

        return {
          item_name,
          physical_cmt: Math.max(0, closingBalance), // Same as closing
          cc_received: ccReceivedCmt,
          op_bal: Math.max(0, openingBalance),
          flitch_received: flitchReceivedCmt,
          fl_issued: totalIssuedCmt,
          fl_closing: Math.max(0, closingBalance),
        };
      })
    );

    // Filter out items with no activity (all zeros)
    const activeStockData = stockData.filter(
      (item) =>
        item.op_bal > 0 ||
        item.flitch_received > 0 ||
        item.cc_received > 0 ||
        item.fl_issued > 0 ||
        item.fl_closing > 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          new ApiResponse(
            StatusCodes.NOT_FOUND,
            'No stock data found for the selected period'
          )
        );
    }

    // Generate Excel file
    const excelLink = await createFlitchStockReportExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Stock report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating flitch stock report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate stock report', 500)
    );
  }
});

/**
 * Generate Inward Item Wise Stock Report
 * Tracks complete journey from log inward through crosscutting, flitching, peeling to sales
 */
export const inwardItemWiseStockReportCsv = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Inward ItemWise Stock Report Request - Start Date:', startDate);
  console.log('Inward ItemWise Stock Report Request - End Date:', endDate);
  console.log('Inward ItemWise Stock Report Request - Filter:', filter);

  // Validate required parameters
  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include full end date

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  // Build filter for item_name if provided
  const itemFilter = {};
  if (filter.item_name) {
    itemFilter.item_name = filter.item_name;
  }

  try {
    // Step 1: Get all unique item names from log inventory
    const allItemNames = await log_inventory_items_model.aggregate([
      {
        $match: itemFilter,
      },
      {
        $group: {
          _id: '$item_name',
        },
      },
    ]);

    const itemNames = allItemNames.map((i) => i._id).filter((name) => name);

    if (itemNames.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          new ApiResponse(
            StatusCodes.NOT_FOUND,
            'No stock data found for the selected period'
          )
        );
    }

    // Step 2: For each item name, calculate stock movements
    const stockData = await Promise.all(
      itemNames.map(async (item_name) => {
        // Get current available CMT from log_inventory (where issue_status = null)
        const currentLogCmt = await log_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
              $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$physical_cmt' },
            },
          },
        ]);

        // Get current available CMT from crosscutting_done (where issue_status = null)
        const currentCrosscutCmt = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
              $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);

        // Get current available CMT from flitching_done (where issue_status = null)
        const currentFlitchCmt = await flitching_done_model.aggregate([
          {
            $match: {
              item_name,
              deleted_at: null,
              $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        const currentAvailableCmt =
          (currentLogCmt[0]?.total_cmt || 0) +
          (currentCrosscutCmt[0]?.total_cmt || 0) +
          (currentFlitchCmt[0]?.total_cmt || 0);

        // ROUND LOG DETAILS - Logs received during period (Invoice/Indian/Actual CMT)
        const logsReceived = await log_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
            },
          },
          {
            $lookup: {
              from: 'log_inventory_invoice_details',
              localField: 'invoice_id',
              foreignField: '_id',
              as: 'invoice',
            },
          },
          {
            $unwind: '$invoice',
          },
          {
            $match: {
              'invoice.inward_date': { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              invoice_cmt: { $sum: '$invoice_cmt' },
              indian_cmt: { $sum: '$indian_cmt' },
              actual_cmt: { $sum: '$physical_cmt' },
            },
          },
        ]);

        const invoiceCmt = logsReceived[0]?.invoice_cmt || 0;
        const indianCmt = logsReceived[0]?.indian_cmt || 0;
        const actualCmt = logsReceived[0]?.actual_cmt || 0;

        // CROSS CUT DETAILS - Issue for CC
        const issuedForCC = await log_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
              issue_status: 'crosscutting',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$physical_cmt' },
            },
          },
        ]);

        const issueForCc = issuedForCC[0]?.total_cmt || 0;

        // CC Received - Crosscutting completed during period
        const ccReceived = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);

        const ccReceivedCmt = ccReceived[0]?.total_cmt || 0;
        const diffCmt = issueForCc - ccReceivedCmt;

        // FLITCHING - Crosscut items issued for flitching
        const flitchingIssued = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
              issue_status: 'flitching',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);

        const flitchingCmt = flitchingIssued[0]?.total_cmt || 0;

        // PEEL - Crosscut items issued for peeling
        const peelingIssued = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
              issue_status: 'peeling',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);

        const peelCmt = peelingIssued[0]?.total_cmt || 0;

        // SALES - Items issued to orders/challan from logs
        const logSales = await log_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
              issue_status: { $in: ['order', 'challan'] },
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$physical_cmt' },
            },
          },
        ]);

        // Sales from crosscut items
        const crosscutSales = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
              issue_status: { $in: ['order', 'challan'] },
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);

        // Sales from flitch items
        const flitchSales = await flitching_done_model.aggregate([
          {
            $match: {
              item_name,
              deleted_at: null,
              issue_status: { $in: ['order', 'challan'] },
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        const salesCmt =
          (logSales[0]?.total_cmt || 0) +
          (crosscutSales[0]?.total_cmt || 0) +
          (flitchSales[0]?.total_cmt || 0);

        // Calculate total issued during period (for opening calculation)
        const totalIssuedCmt = issueForCc + salesCmt;

        // Calculate total received during period (for opening calculation)
        const totalReceivedCmt = actualCmt + ccReceivedCmt;

        // Opening Balance = Current Available + Issued - Received
        const openingBalanceCmt = currentAvailableCmt + totalIssuedCmt - totalReceivedCmt;

        // Closing Balance = Opening + Actual Received - Issue for CC + CC Received - Flitching - Peel - Sales
        const closingBalanceCmt = openingBalanceCmt + actualCmt - issueForCc + ccReceivedCmt - flitchingCmt - peelCmt - salesCmt;

        return {
          item_name,
          opening_stock_cmt: Math.max(0, openingBalanceCmt),
          invoice_cmt: invoiceCmt,
          indian_cmt: indianCmt,
          actual_cmt: actualCmt,
          issue_for_cc: issueForCc,
          cc_received: ccReceivedCmt,
          diff: diffCmt,
          flitching: flitchingCmt,
          sawing: 0, // Placeholder - needs clarification
          wooden_tile: 0, // Placeholder - needs clarification
          unedge: 0, // Placeholder - needs clarification
          peel: peelCmt,
          sales: salesCmt,
          closing_stock_cmt: Math.max(0, closingBalanceCmt),
        };
      })
    );

    // Filter out items with no activity (all zeros)
    const activeStockData = stockData.filter(
      (item) =>
        item.opening_stock_cmt > 0 ||
        item.invoice_cmt > 0 ||
        item.indian_cmt > 0 ||
        item.actual_cmt > 0 ||
        item.issue_for_cc > 0 ||
        item.cc_received > 0 ||
        item.flitching > 0 ||
        item.peel > 0 ||
        item.sales > 0 ||
        item.closing_stock_cmt > 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          new ApiResponse(
            StatusCodes.NOT_FOUND,
            'No stock data found for the selected period'
          )
        );
    }

    // Generate Excel file
    const excelLink = await createInwardItemWiseStockReportExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Inward itemwise stock report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating inward itemwise stock report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate stock report', 500)
    );
  }
});
