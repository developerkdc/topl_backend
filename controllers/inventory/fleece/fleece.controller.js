import mongoose from 'mongoose';
import { createLogLogsExcel } from '../../../config/downloadExcel/Logs/Inventory/log/log.js';
import {
  fleece_inventory_invoice_modal,
  fleece_inventory_items_modal,
  fleece_inventory_items_view_modal,
} from '../../../database/schema/inventory/fleece/fleece.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { createFleeceHistoryExcel, createFleeceLogsExcel } from '../../../config/downloadExcel/Logs/Inventory/fleece/fleece.js';
import {
  fleece_approval_inventory_invoice_model,
  fleece_approval_inventory_items_model,
} from '../../../database/schema/inventory/fleece/fleeceApproval.schema.js';
import fleece_history_model from '../../../database/schema/inventory/fleece/fleece.history.schema.js';

export const listing_fleece_inventory = catchAsync(async (req, res, next) => {
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
    available_sqm: { $ne: 0 },
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
  // console.log(!(sortBy === 'updatedAt' && sort === "desc"))
  // if (!(sortBy === 'updatedAt' && sort === "desc")){
  //     aggregate_stage[1] = {
  //         $sort: {
  //             [sortBy]: sort === "desc" ? -1 : 1
  //         }
  //     }
  // }

  const List_fleece_inventory_details =
    await fleece_inventory_items_view_modal.aggregate(aggregate_stage);

  const totalCount = await fleece_inventory_items_view_modal.countDocuments({
    ...match_query,
  });

  const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: List_fleece_inventory_details,
    totalPage: totalPage,
    message: 'Data fetched successfully',
  });
});

export const add_fleece_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { inventory_invoice_details, inventory_items_details } = req.body;
    const created_by = req.userDetails.id; //extract userid from req.userDetails
    const inward_sr_no = await fleece_inventory_invoice_modal.aggregate([
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

    const add_invoice_details = await fleece_inventory_invoice_modal.create(
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

    const add_items_details = await fleece_inventory_items_modal.insertMany(
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
    return res.status(201).json(
      new ApiResponse(StatusCodes.CREATED, 'Inventory has added successfully', {
        add_invoice_details,
        add_items_details,
      })
    );
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});

export const add_single_fleece_item_inventory = catchAsync(
  async (req, res, next) => {
    const item_details = req.body?.item_details;

    const invoice_id = item_details?.invoice_id;

    if (!invoice_id || !mongoose.isValidObjectId(invoice_id)) {
      return next(new ApiError('Please provide valid invoice id', 400));
    }

    const add_item_details = await fleece_inventory_items_modal.create({
      ...item_details,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          StatusCodes.CREATED,
          'Inventory has added successfully',
          add_item_details
        )
      );
  }
);

export const edit_fleece_item_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const invoice_id = req.params?.invoice_id;
      const items_details = req.body?.inventory_items_details;
      const invoice_details = req.body?.inventory_invoice_details;
      const sendForApproval = req.sendForApproval;
      const user = req.userDetails;

      const fetchInvoiceData = await fleece_inventory_invoice_modal.findOne({
        _id: invoice_details,
      });
      if (fetchInvoiceData.approval_status?.sendForApproval?.status)
        return next(new ApiError('Already send for approval'));

      if (!sendForApproval) {
        const update_invoice_details =
          await fleece_inventory_invoice_modal.updateOne(
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

        const all_invoice_items = await fleece_inventory_items_modal.deleteMany(
          { invoice_id: invoice_id },
          { session }
        );

        if (
          !all_invoice_items.acknowledged ||
          all_invoice_items.deletedCount <= 0
        )
          return next(new ApiError('Failed to update invoice items', 400));

        const updated_items = items_details?.map((item) => {
          item.available_number_of_roll = item?.number_of_roll;
          (item.available_sqm = item?.total_sq_meter),
            (item.available_amount = item?.amount);
          return item;
        });
        const update_item_details =
          await fleece_inventory_items_modal.insertMany([...updated_items], {
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
          await fleece_approval_inventory_invoice_model.create(
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

        await fleece_inventory_invoice_modal.updateOne(
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
            fleece_item_id: _id ? _id : new mongoose.Types.ObjectId(),
            approval_invoice_id: add_invoice_details[0]?._id,
          };
        });

        const updated_items = itemDetailsData?.map((item) => {
          item.available_number_of_roll = item?.number_of_roll;
          (item.available_sqm = item?.total_sq_meter),
            (item.available_amount = item?.amount);
          return item;
        });
        const add_approval_item_details =
          await fleece_approval_inventory_items_model.insertMany(
            updated_items,
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

export const edit_fleece_item_inventory = catchAsync(async (req, res, next) => {
  const item_id = req.params?.item_id;
  const item_details = req.body?.item_details;

  const update_item_details = await fleece_inventory_items_modal.updateOne(
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
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        'Inventory item  updated successfully',
        update_item_details
      )
    );
});

export const edit_fleece_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params?.invoice_id;
    const invoice_details = req.body?.invoice_details;

    const update_voice_details = await fleece_inventory_invoice_modal.updateOne(
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
          'Inventory invoice has updated successfully',
          update_voice_details
        )
      );
  }
);

export const fleeceCsv = catchAsync(async (req, res) => {
  const { search = '' } = req.query;
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

  const allData = await fleece_inventory_items_view_modal.find(match_query);

  const excelLink = await createLogLogsExcel(allData);
  console.log('link => ', excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, 'Csv downloaded successfully...', excelLink)
  );
});

export const item_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no = await fleece_inventory_items_modal.distinct('item_sr_no');
  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: item_sr_no,
    message: 'Item Sr No Dropdown fetched successfully',
  });
});

export const inward_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no =
    await fleece_inventory_invoice_modal.distinct('inward_sr_no');
  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: item_sr_no,
    message: 'Inward Sr No Dropdown fetched successfully',
  });
});

export const fleece_item_listing_by_invoice = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params.invoice_id;

    const aggregate_stage = [
      {
        $match: {
          'fleece_invoice_details._id': new mongoose.Types.ObjectId(invoice_id),
        },
      },
      {
        $sort: {
          item_sr_no: 1,
        },
      },
      {
        $project: {
          fleece_invoice_details: 0,
        },
      },
    ];

    const single_invoice_List_fleece_inventory_details =
      await fleece_inventory_items_view_modal.aggregate(aggregate_stage);

    // const totalCount = await fleece_inventory_items_view_modal.countDocuments({
    //   ...match_query,
    // });

    // const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: 'success',
      data: single_invoice_List_fleece_inventory_details,
      // totalPage: totalPage,
      message: 'Data fetched successfully',
    });
  }
);

// export const fleeceLogsCsv = catchAsync(async (req, res) => {
//   console.log('called');
//   const { search = '' } = req.query;
//   const {
//     string,
//     boolean,
//     numbers,
//     arrayField = [],
//   } = req?.body?.searchFields || {};
//   const filter = req.body?.filter;

//   let search_query = {};
//   if (search != '' && req?.body?.searchFields) {
//     const search_data = DynamicSearch(
//       search,
//       boolean,
//       numbers,
//       string,
//       arrayField
//     );
//     if (search_data?.length == 0) {
//       return res.status(404).json({
//         statusCode: 404,
//         status: false,
//         data: {
//           data: [],
//         },
//         message: 'Results Not Found',
//       });
//     }
//     search_query = search_data;
//   }

//   const filterData = dynamic_filter(filter);

//   const match_query = {
//     ...filterData,
//     ...search_query,
//   };

//   const allData = await fleece_inventory_items_view_modal.find(match_query);

//   const excelLink = await createFleeceLogsExcel(allData);

//   return res.json(
//     new ApiResponse(StatusCodes.OK, 'Csv downloaded successfully...', excelLink)
//   );
// });

export const fleeceLogsCsv = catchAsync(async (req, res) => {
  const {
    search = '',
    sortBy = 'updatedAt',
    sort = 'desc'
  } = req.query;

  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  // Build search query
  let search_query = {};
  if (search !== '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: { data: [] },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  // Build filter query
  const filterData = dynamic_filter(filter);

  // Final MongoDB match query
  const match_query = {
    ...filterData,
    ...search_query,

  };

  // Build sort options
  const sortOrder = sort === 'desc' ? -1 : 1;
  const sortOptions = { [sortBy]: sortOrder };

  // Final Mongo query with sort
  const allData = await fleece_inventory_items_view_modal
    .find(match_query)
    .sort(sortOptions);

  if (allData.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(new ApiResponse(StatusCodes.NOT_FOUND, 'NO Data found...'));
  }

  console.log(allData.length)
  console.log('FILTER USED IN CSV EXPORT:', JSON.stringify(filterData, null, 2));
  console.log('SEARCH QUERY USED:', JSON.stringify(search_query, null, 2));
  console.log('FINAL MATCH QUERY:', JSON.stringify(match_query, null, 2));
  const excelLink = await createFleeceLogsExcel(allData);
  console.log('link => ', excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, 'Csv downloaded successfully...', excelLink)
  );
});

function normalizeFilterKeys(filter = {}) {
  const flatFilter = {};
  const flatRange = {};

  const remapKeys = {
    'fleece_item_details.fleece_invoice_details.inward_sr_no': 'fleece_invoice_details.inward_sr_no',
    'fleece_item_details.fleece_invoice_details.inward_date': 'fleece_invoice_details.inward_date',
    'fleece_item_details.fleece_invoice_details.supplier_details.company_details.supplier_name':
      'fleece_invoice_details.supplier_details.company_details.supplier_name',
  };

  for (const key in filter) {
    if (key === 'range' && filter.range?.date) {
      for (const dateKey in filter.range.date) {
        const mappedKey = remapKeys[dateKey] || dateKey;
        const { from, to } = filter.range.date[dateKey];
        flatRange[mappedKey] = {};
        if (from) flatRange[mappedKey]['$gte'] = new Date(from);
        if (to) flatRange[mappedKey]['$lte'] = new Date(to);
      }
    } else {
      const mappedKey = remapKeys[key] || key;
      flatFilter[mappedKey] = filter[key];
    }
  }

  return { ...flatFilter, ...flatRange };
}

export const fleeceHistoryLogsCsv = catchAsync(async (req, res) => {
  const {
    search = '',
    sortBy = 'updatedAt',
    sort = 'desc',
  } = req.query;

  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  let search_query = {};
  if (search !== '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(search, boolean, numbers, string, arrayField);
    if (search_data?.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const normalizedFilter = normalizeFilterKeys(filter);
  const filterData = dynamic_filter(normalizedFilter);
  const match_query = { ...filterData, ...search_query, issue_status: { $ne: null } };

  const pipeline = [
    {
      $lookup: {
        from: 'fleece_inventory_items_views',
        foreignField: '_id',
        localField: 'fleece_item_id',
        as: 'fleece_item_details',
        pipeline: [
          {
            $project: {
              item_sr_no: 1,
              item_name: 1,
              supplier_item_name: 1,
              length: 1,
              width: 1,
              thickness: 1,
              number_of_sheets: 1,
              total_sq_meter: 1,
              grade_name: 1,
              rate_in_currency: 1,
              rate_in_inr: 1,
              exchange_rate: 1,
              gst_val: 1,
              invoice_id: 1,
              remark: 1,
            },
          },
        ],
      },
    },
    { $unwind: { path: '$fleece_item_details', preserveNullAndEmptyArrays: false } },

    {
      $lookup: {
        from: 'fleece_inventory_invoice_details',
        localField: 'fleece_item_details.invoice_id',
        foreignField: '_id',
        as: 'fleece_invoice_details',
      },
    },
    { $unwind: { path: '$fleece_invoice_details', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        pipeline: [
          { $project: { first_name: 1, last_name: 1, user_name: 1, email_id: 1 } },
        ],
        as: 'created_user_details',
      },
    },
    { $unwind: { path: '$created_user_details', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'users',
        localField: 'updated_by',
        foreignField: '_id',
        pipeline: [
          { $project: { first_name: 1, last_name: 1, user_name: 1 } },
        ],
        as: 'updated_user_details',
      },
    },
    { $unwind: { path: '$updated_user_details', preserveNullAndEmptyArrays: true } },

    { $match: match_query },

    {
      $project: {
        invoice_no: { $ifNull: ['$fleece_invoice_details.invoice_Details.invoice_no', ''] },
        total_item_amount: { $ifNull: ['$fleece_invoice_details.invoice_Details.total_item_amount', 0] },
        transporter_details: { $ifNull: ['$fleece_invoice_details.invoice_Details.transporter_details', ''] },
        gst_percentage: { $ifNull: ['$fleece_invoice_details.invoice_Details.gst_percentage', 0] },
        invoice_value_with_gst: { $ifNull: ['$fleece_invoice_details.invoice_Details.invoice_value_with_gst', 0] },

        number_of_sheets: { $ifNull: ['$fleece_item_details.number_of_sheets', 0] },
        grade_name: { $ifNull: ['$fleece_item_details.grade_name', ''] },
        gst_val: { $ifNull: ['$fleece_item_details.gst_val', 0] },
        remark: { $ifNull: ['$fleece_item_details.remark', ''] },

        no_of_workers: { $ifNull: ['$fleece_invoice_details.workers_details.no_of_workers', null] },
        shift: { $ifNull: ['$fleece_invoice_details.workers_details.shift', null] },
        working_hours: { $ifNull: ['$fleece_invoice_details.workers_details.working_hours', null] },

        company_details: { $ifNull: ['$fleece_invoice_details.supplier_details.company_details', {}] },
        branch_detail: { $ifNull: ['$fleece_invoice_details.supplier_details.branch_detail', {}] },
        contact_person: { $ifNull: ['$fleece_invoice_details.supplier_details.branch_detail.contact_person', []] },

        fleece_item_details: 1,
        fleece_invoice_details: 1,
        created_user_details: 1,
        updated_user_details: 1,
        created_by: 1,
        updated_by: 1,
        createdAt: 1,
        updatedAt: 1,
        issued_number_of_roll: 1,
        issued_sqm: 1,
        issued_amount: 1,
        issue_status: 1,
      },
    },

    { $sort: { [sortBy]: sort === 'desc' ? -1 : 1 } },
  ];

  const allData = await fleece_history_model.aggregate(pipeline);

  if (!allData.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(new ApiResponse(StatusCodes.NOT_FOUND, 'No data found for export'));
  }

  const excelLink = await createFleeceHistoryExcel(allData);

  return res.json(
    new ApiResponse(StatusCodes.OK, 'Fleece History CSV downloaded successfully', excelLink)
  );
});

export const fetch_fleece_history = catchAsync(async (req, res, next) => {
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
      from: 'fleece_inventory_items_views',
      foreignField: '_id',
      localField: 'fleece_item_id',
      as: 'fleece_item_details',
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
      path: '$fleece_item_details',
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

  const result = await fleece_history_model.aggregate(list_aggregate);

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

  const total_docs = await fleece_history_model.aggregate(count_total_docs);

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
