import mongoose from 'mongoose';
import {
  othergoods_inventory_invoice_details,
  othergoods_inventory_items_details,
  othergoods_inventory_items_view_modal,
} from '../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import {
  GenerateOtherGoodsLogs,
  GenerateOtherGoodsLogsHistory,
  createOtherGoodsStockReportExcel,
} from '../../../config/downloadExcel/Logs/Inventory/OtherGoods/otherGoods.js';
import {
  otherGoods_approval_inventory_invoice_model,
  otherGoods_approval_inventory_items_model,
} from '../../../database/schema/inventory/otherGoods/otherGoodsApproval.schema.js';
import other_goods_history_model from '../../../database/schema/inventory/otherGoods/otherGoods.history.schema.js';

export const listing_otherGodds_inventory = catchAsync(
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
      available_quantity: {
        $ne: 0,
      },
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
    // const aggregate_stage = [
    //   {
    //     $match: match_query,
    //   },
    //   {
    //     $sort: {
    //       [sortBy]: sort === "desc" ? -1 : 1,
    //     },
    //   },
    //   {
    //     $skip: (parseInt(page) - 1) * parseInt(limit),
    //   },
    //   {
    //     $limit: parseInt(limit),
    //   },
    //   {
    //     $addFields: {
    //       "created_user": {
    //         user_name: "$created_user.user_name",
    //         first_name: "$created_user.first_name",
    //         last_name: "$created_user.last_name",
    //       },
    //     },
    //   },
    // ];

    const List_otherGoods_inventory_details =
      await othergoods_inventory_items_view_modal.aggregate(aggregate_stage);
    const totalItems =
      await othergoods_inventory_items_view_modal.countDocuments({
        ...match_query,
      });
    const totalPage = Math.ceil(totalItems / parseInt(limit));

    return res.status(200).json(
      new ApiResponse(StatusCodes.OK, 'Data fetched successfully', {
        List_otherGoods_inventory_details,
        totalPage,
      })
    );
  }
);

export const add_otherGoods_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { inventory_invoice_details, inventory_items_details } = req.body;
    const created_by = req.userDetails.id; //extract userid from req.userDetails

    const inward_sr_no = await othergoods_inventory_invoice_details.aggregate([
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
    inventory_invoice_details.created_by = created_by;
    const add_invoice_details =
      await othergoods_inventory_invoice_details.create(
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
      elm.created_by = created_by;
      return elm;
    });

    const add_items_details =
      await othergoods_inventory_items_details.insertMany(items_details, {
        session,
      });

    if (add_items_details && add_items_details?.length < 0) {
      return next(new ApiError('Failed to add Items Details', 400));
    }

    await session.commitTransaction();
    session.endSession();
    return res.status(200).json(
      new ApiResponse(StatusCodes.OK, 'Inventory has added successfully', {
        add_invoice_details,
        add_items_details,
      })
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});

export const add_single_otherGoods_item_inventory = catchAsync(
  async (req, res, next) => {
    const item_details = req.body?.item_details;

    const invoice_id = item_details?.invoice_id;

    if (!invoice_id || !mongoose.isValidObjectId(invoice_id)) {
      return next(new ApiError('Please provide valid invoice id', 400));
    }

    const add_item_details = await othergoods_inventory_items_details.create({
      ...item_details,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'Inventory Item has added successfully',
          add_item_details
        )
      );
  }
);

export const edit_otherGoods_item_inventory = catchAsync(
  async (req, res, next) => {
    const item_id = req.params?.item_id;
    const item_details = req.body?.item_details;

    const update_item_details =
      await othergoods_inventory_items_details.updateOne(
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

    return res
      .status(200)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'Inventory Item has updated successfully',
          update_item_details
        )
      );
  }
);

export const edit_otherGoods_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params?.invoice_id;
    const invoice_details = req.body?.invoice_details;

    const update_voice_details =
      await othergoods_inventory_invoice_details.updateOne(
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

    return res
      .status(200)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'Inventory Invoice has updated successfully',
          update_voice_details
        )
      );
  }
);

//csv inventory
export const otherGoodsLogsCsv = catchAsync(async (req, res) => {
  const { search = '' } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const filter = req.body?.filter;

  // 1. Search Query
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
        data: { data: [] },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  // 2. Get Filter Query
  const filterData = dynamic_filter(filter);

  // 3. Clean Invalid/Empty Filter Values
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

  // 4. Merge and clean
  const fullQuery = {
    ...filterData,
    ...search_query,
  };

  const cleanedQuery = cleanMatchQuery(fullQuery);

  // 5. Final Query with mandatory condition
  const match_query = {
    available_quantity: { $ne: 0 },
    ...cleanedQuery,
  };

  // Rest remains the same
  const allData = await othergoods_inventory_items_view_modal.find(match_query);
  if (allData.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(new ApiResponse(StatusCodes.NOT_FOUND, 'NO Data found...'));
  }

  const excelLink = await GenerateOtherGoodsLogs(allData);
  console.log('link => ', excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, 'Csv downloaded successfully...', excelLink)
  );
});

export const edit_othergoods_item_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const invoice_id = req.params?.invoice_id;
      const items_details = req.body?.inventory_items_details;
      const invoice_details = req.body?.inventory_invoice_details;
      const sendForApproval = req.sendForApproval;
      const user = req.userDetails;

      const fetchInvoiceData =
        await othergoods_inventory_invoice_details.findOne({
          _id: invoice_details,
        });
      if (fetchInvoiceData.approval_status?.sendForApproval?.status)
        return next(new ApiError('Already send for approval'));

      if (!sendForApproval) {
        const update_invoice_details =
          await othergoods_inventory_invoice_details.updateOne(
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

        const all_invoice_items =
          await othergoods_inventory_items_details.deleteMany(
            { invoice_id: invoice_id },
            { session }
          );

        if (
          !all_invoice_items.acknowledged ||
          all_invoice_items.deletedCount <= 0
        )
          return next(new ApiError('Failed to update invoice items', 400));
        // get latest pallet number for newly added item
        // const get_pallet_no = await othergoods_inventory_items_details.aggregate([
        //   {
        //     $group: {
        //       _id: null,
        //       latest_pallet_no: { $max: "$pallet_number" },
        //     },
        //   },
        // ]);
        // let latest_pallet_no =
        //   get_pallet_no?.length > 0 && get_pallet_no?.[0]?.latest_pallet_no
        //     ? get_pallet_no?.[0]?.latest_pallet_no + 1
        //     : 1;

        // for (let i = 0; i < items_details.length; i++) {
        //   if (
        //     !items_details[i]?.pallet_number &&
        //     !items_details[i]?.pallet_number > 0
        //   ) {
        //     items_details[i].pallet_number = latest_pallet_no;
        //     latest_pallet_no += 1;
        //   }
        // }
        const updated_items = items_details?.map((item) => {
          item.available_amount = item?.amount;
          item.available_quantity = item?.total_quantity;
          return item;
        });
        const update_item_details =
          await othergoods_inventory_items_details.insertMany(updated_items, {
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
          await otherGoods_approval_inventory_invoice_model.create(
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

        await othergoods_inventory_invoice_details.updateOne(
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
            otherGoods_item_id: _id ? _id : new mongoose.Types.ObjectId(),
            approval_invoice_id: add_invoice_details[0]?._id,
            available_amount: ele?.amount,
            available_quantity: ele?.total_quantity,
          };
        });

        const add_approval_item_details =
          await otherGoods_approval_inventory_items_model.insertMany(
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

export const othergoods_item_listing_by_invoice = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params.invoice_id;

    const aggregate_stage = [
      {
        $match: {
          'othergoods_invoice_details._id': new mongoose.Types.ObjectId(
            invoice_id
          ),
        },
      },
      {
        $sort: {
          item_sr_no: 1,
        },
      },
      {
        $project: {
          othergoods_invoice_details: 0,
        },
      },
    ];

    const single_invoice_list_log_inventory_details =
      await othergoods_inventory_items_view_modal.aggregate(aggregate_stage);

    // const totalCount = await log_inventory_items_view_model.countDocuments({
    //   ...match_query,
    // });

    // const totalPage = Math.ceil(totalCount / limit);

    return res
      .status(200)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'Data fetched successfully',
          single_invoice_list_log_inventory_details
        )
      );
  }
);

export const item_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no =
    await othergoods_inventory_items_details.distinct('item_sr_no');
  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: item_sr_no,
    message: 'Item Sr No Dropdown fetched successfully',
  });
});

export const inward_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no =
    await othergoods_inventory_invoice_details.distinct('inward_sr_no');
  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: item_sr_no,
    message: 'Inward Sr No Dropdown fetched successfully',
  });
});

export const fetch_other_goods_history = catchAsync(async (req, res, next) => {
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
  const aggMatch = {
    $match: {
      ...match_query,
    },
  };

  const aggLookupPlwoodItemDetails = {
    $lookup: {
      from: 'othergoods_inventory_items_views',
      foreignField: '_id',
      localField: 'other_goods_item_id',
      as: 'other_goods_item_details',
      pipeline: [
        {
          $project: {
            created_user: 0,
          },
        },
      ],
    },
  };
  // const aggLookupPlywoodInvoiceDetails = {
  //   $lookup: {
  //     from: 'plywood_inventory_invoice_details',
  //     foreignField: '_id',
  //     localField: 'plywood_item_details.invoice_id',
  //     as: 'plywood_invoice_details',
  //   },
  // };
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
          },
        },
      ],
      as: 'updated_user_details',
    },
  };
  const aggUnwindCreatedUser = {
    $unwind: {
      path: '$created_user_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUnwindUpdatdUser = {
    $unwind: {
      path: '$updated_user_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUnwindPlywoodItemDetails = {
    $unwind: {
      path: '$other_goods_item_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  // const aggUnwindPlywoodInvoiceDetails = {
  //   $unwind: {
  //     path: '$plywood_invoice_details',
  //     preserveNullAndEmptyArrays: true,
  //   },
  // };

  const aggLimit = {
    $limit: parseInt(limit),
  };

  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };

  const aggSort = {
    $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
  };
  const list_aggregate = [
    aggLookupPlwoodItemDetails,
    aggUnwindPlywoodItemDetails,
    // aggLookupPlywoodInvoiceDetails,
    // aggUnwindPlywoodInvoiceDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatdUser,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ];

  const result = await other_goods_history_model.aggregate(list_aggregate);

  const aggCount = {
    $count: 'totalCount',
  };

  const count_total_docs = [
    aggLookupPlwoodItemDetails,
    aggUnwindPlywoodItemDetails,
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatdUser,
    aggMatch,
    aggCount,
  ];

  const total_docs =
    await other_goods_history_model.aggregate(count_total_docs);

  const totalPages = Math.ceil((total_docs[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Data fetched successfully...',
    {
      data: result,
      totalPages: totalPages,
    }
  );

  return res.status(StatusCodes.OK).json(response);
});

export const otherGoodsLogsCsvHistory = catchAsync(async (req, res) => {
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

  // 1. Search Logic
  let search_query = {};
  if (search !== '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    console.log('🔍 Dynamic Search Result:', search_data);

    if (!search_data || Object.keys(search_data).length === 0) {
      console.log('❌ No results from DynamicSearch');
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          new ApiResponse(StatusCodes.NOT_FOUND, 'Results Not Found', {
            data: [],
          })
        );
    }
    search_query = search_data;
  }

  // 2. Filter Logic
  const filterData = dynamic_filter(filter);
  console.log('🧪 Filter Data:', filterData);

  // 3. Clean invalid values
  const cleanMatchQuery = (query) => {
    const cleaned = {};
    for (const key in query) {
      const value = query[key];
      if (value === undefined || value === '' || value === null) continue;

      if (typeof value === 'object' && ('$gte' in value || '$lte' in value)) {
        const range = {};
        if (value.$gte !== '' && value.$gte !== null) range.$gte = value.$gte;
        if (value.$lte !== '' && value.$lte !== null) range.$lte = value.$lte;
        if (Object.keys(range).length > 0) cleaned[key] = range;
        continue;
      }

      cleaned[key] = value;
    }
    return cleaned;
  };

  const fullQuery = { ...search_query, ...filterData };
  const cleanedQuery = cleanMatchQuery(fullQuery);

  // 4. Final Match Query
  const match_query = { ...cleanedQuery };
  console.log('🧩 Final Match Query:', JSON.stringify(match_query, null, 2));

  // 5. Aggregation Pipeline (to fetch all data without pagination for CSV)
  const aggregationPipeline = [
    {
      $lookup: {
        from: 'othergoods_inventory_items_views',
        foreignField: '_id',
        localField: 'other_goods_item_id',
        as: 'other_goods_item_details',
        pipeline: [{ $project: { created_user: 0 } }],
      },
    },
    {
      $unwind: {
        path: '$other_goods_item_details',
        preserveNullAndEmptyArrays: true,
      },
    },
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
        as: 'created_user_details',
      },
    },
    {
      $unwind: {
        path: '$created_user_details',
        preserveNullAndEmptyArrays: true,
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
            },
          },
        ],
        as: 'updated_user_details',
      },
    },
    {
      $unwind: {
        path: '$updated_user_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    { $match: match_query },
    { $sort: { [sortBy]: sort === 'desc' ? -1 : 1 } },
  ];

  const result = await other_goods_history_model.aggregate(aggregationPipeline);
  console.log(`📦 Aggregation Result Count: ${result.length}`);
  if (result.length > 0) {
    console.log('✅ First Result Sample:', JSON.stringify(result[0], null, 2));
  }

  if (!result.length) {
    console.log('⚠️ No matching records found in aggregation.');
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(
        new ApiResponse(StatusCodes.NOT_FOUND, 'No data found', { data: [] })
      );
  }

  // 6. Generate CSV
  const excelLink = await GenerateOtherGoodsLogsHistory(result); // Replace this with correct function if renamed
  console.log('📤 CSV Download Link:', excelLink);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        'CSV downloaded successfully...',
        excelLink
      )
    );
});

export const otherGoodsStockReportCsv = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.body;
  const filter = req.body?.filter || {};

  console.log('Stock Report Request - Start Date:', startDate);
  console.log('Stock Report Request - End Date:', endDate);
  console.log('Stock Report Request - Filter:', filter);

  // Validate date parameters
  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  // Build filter for item name if provided
  const itemFilter = {};
  if (filter.item_name) {
    itemFilter.item_name = filter.item_name;
  }

  try {
    // Step 1: Get all unique other goods items with their current available stock
    const currentInventory = await othergoods_inventory_items_view_modal.aggregate([
      {
        $match: {
          deleted_at: null,
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: {
            item_name: '$item_name',
            item_sub_category_name: '$item_sub_category_name',
          },
          current_quantity: { $sum: '$available_quantity' },
          current_amount: { $sum: '$available_amount' },
          item_ids: { $push: '$_id' },
        },
      },
    ]);

    // Step 2: For each unique combination, calculate stock movements
    const stockData = await Promise.all(
      currentInventory.map(async (item) => {
        const { item_name, item_sub_category_name } = item._id;
        const itemIds = item.item_ids;

        // Calculate receives during the period (new inward)
        const receives = await othergoods_inventory_items_details.aggregate([
          {
            $match: {
              item_name,
              item_sub_category_name,
              deleted_at: null,
            },
          },
          {
            $lookup: {
              from: 'othergoods_inventory_invoice_details',
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
              total_quantity: { $sum: '$total_quantity' },
              total_amount: { $sum: '$amount' },
            },
          },
        ]);

        // Calculate consumption (issues for order)
        const consumption = await other_goods_history_model.aggregate([
          {
            $match: {
              other_goods_item_id: { $in: itemIds },
              issue_status: 'order',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_quantity: { $sum: '$issued_quantity' },
              total_amount: { $sum: '$issued_amount' },
            },
          },
        ]);

        // Calculate sales (issues for challan)
        const sales = await other_goods_history_model.aggregate([
          {
            $match: {
              other_goods_item_id: { $in: itemIds },
              issue_status: 'challan',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_quantity: { $sum: '$issued_quantity' },
              total_amount: { $sum: '$issued_amount' },
            },
          },
        ]);

        // Get receives from the result
        const receiveQuantity = receives[0]?.total_quantity || 0;
        const receiveAmount = receives[0]?.total_amount || 0;

        // Get consumption from the result
        const consumeQuantity = consumption[0]?.total_quantity || 0;
        const consumeAmount = consumption[0]?.total_amount || 0;

        // Get sales from the result
        const salesQuantity = sales[0]?.total_quantity || 0;
        const salesAmount = sales[0]?.total_amount || 0;

        // Current available stock
        const currentQuantity = item.current_quantity || 0;
        const currentAmount = item.current_amount || 0;

        // Calculate opening stock
        // Opening = Current + (Consume + Sales) - Receive
        const openingQuantity = currentQuantity + consumeQuantity + salesQuantity - receiveQuantity;
        const openingAmount = currentAmount + consumeAmount + salesAmount - receiveAmount;

        // Calculate closing stock
        // Closing = Opening + Receive - Consume - Sales
        const closingQuantity = openingQuantity + receiveQuantity - consumeQuantity - salesQuantity;
        const closingAmount = openingAmount + receiveAmount - consumeAmount - salesAmount;

        return {
          item_name: item_name,
          item_sub_category_name: item_sub_category_name,
          opening_quantity: Math.max(0, openingQuantity),
          opening_amount: Math.max(0, openingAmount),
          receive_quantity: receiveQuantity,
          receive_amount: receiveAmount,
          consume_quantity: consumeQuantity,
          consume_amount: consumeAmount,
          sales_quantity: salesQuantity,
          sales_amount: salesAmount,
          closing_quantity: Math.max(0, closingQuantity),
          closing_amount: Math.max(0, closingAmount),
        };
      })
    );

    // Filter out items with no activity (all zeros)
    const activeStockData = stockData.filter(
      (item) =>
        item.opening_quantity > 0 ||
        item.receive_quantity > 0 ||
        item.consume_quantity > 0 ||
        item.sales_quantity > 0 ||
        item.closing_quantity > 0
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
    const excelLink = await createOtherGoodsStockReportExcel(
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
    console.error('Error generating stock report:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});
