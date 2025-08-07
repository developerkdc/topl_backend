import mongoose from 'mongoose';
import {
  mdf_inventory_invoice_details,
  mdf_inventory_items_details,
  mdf_inventory_items_view_modal,
} from '../../../database/schema/inventory/mdf/mdf.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { StatusCodes } from '../../../utils/constants.js';
import {
  createMdfHistoryExcel,
  createMdfLogsExcel,
} from '../../../config/downloadExcel/Logs/Inventory/mdf/mdf.js';
import {
  mdf_approval_inventory_invoice_model,
  mdf_approval_inventory_items_model,
} from '../../../database/schema/inventory/mdf/mdfApproval.schema.js';
import mdf_history_model from '../../../database/schema/inventory/mdf/mdf.history.schema.js';

export const listing_mdf_inventory = catchAsync(async (req, res, next) => {
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
    available_sheets: { $ne: 0 },
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

  const List_mdf_inventory_details =
    await mdf_inventory_items_view_modal.aggregate(aggregate_stage);

  const totalCount = await mdf_inventory_items_view_modal.countDocuments({
    ...match_query,
  });

  const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: List_mdf_inventory_details,
    totalPage: totalPage,
    message: 'Data fetched successfully',
  });
});

export const add_mdf_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { inventory_invoice_details, inventory_items_details } = req.body;
    const created_by = req.userDetails.id; //extract userid from req.userDetails

    // query for getting latest inward number
    const inward_sr_no = await mdf_inventory_invoice_details.aggregate([
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

    const add_invoice_details = await mdf_inventory_invoice_details.create(
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

    // query for getting latest pallet number
    const get_pallet_no = await mdf_inventory_items_details.aggregate([
      {
        $group: {
          _id: null,
          latest_pallet_no: { $max: '$pallet_number' },
        },
      },
    ]);

    let latest_pallet_no =
      get_pallet_no?.length > 0 && get_pallet_no?.[0]?.latest_pallet_no
        ? get_pallet_no?.[0]?.latest_pallet_no + 1
        : 1;

    const invoice_details_id = add_invoice_details?.[0]?._id;
    const items_details = inventory_items_details?.map((elm, index) => {
      elm.pallet_number = latest_pallet_no;
      latest_pallet_no += 1;
      // elm.item_sr_no = index + 1;
      elm.invoice_id = invoice_details_id;
      elm.created_by = created_by;
      return elm;
    });

    const add_items_details = await mdf_inventory_items_details.insertMany(
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
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});

export const add_single_mdf_item_inventory = catchAsync(
  async (req, res, next) => {
    const item_details = req.body?.item_details;

    const invoice_id = item_details?.invoice_id;

    if (!invoice_id || !mongoose.isValidObjectId(invoice_id)) {
      return next(new ApiError('Please provide valid invoice id', 400));
    }

    const add_item_details = await mdf_inventory_items_details.create({
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

export const edit_mdf_item_inventory = catchAsync(async (req, res, next) => {
  const item_id = req.params?.item_id;
  const item_details = req.body?.item_details;

  const update_item_details = await mdf_inventory_items_details.updateOne(
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

export const edit_mdf_invoice_inventory = catchAsync(async (req, res, next) => {
  const invoice_id = req.params?.invoice_id;
  const invoice_details = req.body?.invoice_details;

  const update_voice_details = await mdf_inventory_invoice_details.updateOne(
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
});

//csv inventory
export const mdfLogsCsv = catchAsync(async (req, res) => {
  const { search = '', sortBy = 'updatedAt', sort = 'desc' } = req.query;

  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  // 1. Build search query (match logLogsCsv logic)
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
        data: { data: [] },
        message: 'Results Not Found',
      });
    }
  }

  // 2. Get filter query
  const filterData = dynamic_filter(filter);

  // 3. Clean query (copied from logLogsCsv)
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

  // 5. Build final query
  const match_query = {
    ...cleanedQuery,
    available_sheets: { $ne: 0 }, // preserved from original
  };

  console.log('Final match_query =>', JSON.stringify(match_query, null, 2));

  // 6. Fetch data
  const sortedData = await mdf_inventory_items_view_modal
    .find(match_query)
    .sort({
      [sortBy]: sort === 'desc' ? -1 : 1,
      _id: sort === 'desc' ? -1 : 1,
    });

  // 7. Generate Excel
  const excelLink = await createMdfLogsExcel(sortedData);
  console.log('link => ', excelLink);

  // 8. Return
  return res.json(
    new ApiResponse(StatusCodes.OK, 'CSV downloaded successfully...', excelLink)
  );
});

export const edit_mdf_item_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const invoice_id = req.params?.invoice_id;
      const items_details = req.body?.inventory_items_details;
      const invoice_details = req.body?.inventory_invoice_details;
      const sendForApproval = req.sendForApproval;
      const user = req.userDetails;
      console.log(user);

      const fetchInvoiceData = await mdf_inventory_invoice_details.findOne({
        _id: invoice_details,
      });
      if (fetchInvoiceData.approval_status?.sendForApproval?.status)
        return next(new ApiError('Already send for approval'));

      // get latest pallet number for newly added item
      const get_pallet_no = await mdf_inventory_items_details.aggregate([
        {
          $group: {
            _id: null,
            latest_pallet_no: { $max: '$pallet_number' },
          },
        },
      ]);
      let latest_pallet_no =
        get_pallet_no?.length > 0 && get_pallet_no?.[0]?.latest_pallet_no
          ? get_pallet_no?.[0]?.latest_pallet_no + 1
          : 1;

      if (!sendForApproval) {
        const update_invoice_details =
          await mdf_inventory_invoice_details.updateOne(
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

        const all_invoice_items = await mdf_inventory_items_details.deleteMany(
          { invoice_id: invoice_id },
          { session }
        );

        if (
          !all_invoice_items.acknowledged ||
          all_invoice_items.deletedCount <= 0
        )
          return next(new ApiError('Failed to update invoice items', 400));

        for (let i = 0; i < items_details.length; i++) {
          if (
            !items_details[i]?.pallet_number &&
            !items_details[i]?.pallet_number > 0
          ) {
            items_details[i].pallet_number = latest_pallet_no;
            latest_pallet_no += 1;
          }
        }
        const updated_items = items_details?.map((ele) => {
          ele.available_sheets = ele?.sheets;
          ele.available_sqm = ele?.total_sq_meter;
          ele.available_amount = ele?.amount;
          return ele;
        });

        const update_item_details =
          await mdf_inventory_items_details.insertMany(updated_items, {
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
          await mdf_approval_inventory_invoice_model.create(
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

        await mdf_inventory_invoice_details.updateOne(
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
            mdf_item_id: _id ? _id : new mongoose.Types.ObjectId(),
            approval_invoice_id: add_invoice_details[0]?._id,
            available_sheets: ele?.sheets,
            available_sqm: ele?.total_sq_meter,
            available_amount: ele?.amount,
          };
        });

        const add_approval_item_details =
          await mdf_approval_inventory_items_model.insertMany(itemDetailsData, {
            session,
          });

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

export const mdf_item_listing_by_invoice = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params.invoice_id;

    const aggregate_stage = [
      {
        $match: {
          'mdf_invoice_details._id': new mongoose.Types.ObjectId(invoice_id),
        },
      },
      {
        $sort: {
          item_sr_no: 1,
        },
      },
      {
        $project: {
          mdf_invoice_details: 0,
        },
      },
    ];

    const single_invoice_list_mdf_inventory_details =
      await mdf_inventory_items_view_modal.aggregate(aggregate_stage);

    // const totalCount = await log_inventory_items_view_model.countDocuments({
    //   ...match_query,
    // });

    // const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: 'success',
      data: single_invoice_list_mdf_inventory_details,
      // totalPage: totalPage,
      message: 'Data fetched successfully',
    });
  }
);

export const item_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no = await mdf_inventory_items_details.distinct('item_sr_no');
  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: item_sr_no,
    message: 'Item Sr No Dropdown fetched successfully',
  });
});

export const inward_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no =
    await mdf_inventory_invoice_details.distinct('inward_sr_no');
  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: item_sr_no,
    message: 'Inward Sr No Dropdown fetched successfully',
  });
});

//fetch MDF history
export const fetch_mdf_history = catchAsync(async (req, res, next) => {
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
      from: 'mdf_inventory_items_views',
      foreignField: '_id',
      localField: 'mdf_item_id',
      as: 'mdf_item_details',
      pipeline: [
        {
          $project: {
            created_user: 0,
          },
        },
      ],
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
      path: '$mdf_item_details',
      preserveNullAndEmptyArrays: true,
    },
  };

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
    aggCreatedUserDetails,
    aggUpdatedUserDetails,
    aggUnwindCreatedUser,
    aggUnwindUpdatdUser,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ];

  const result = await mdf_history_model.aggregate(list_aggregate);

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

  const total_docs = await mdf_history_model.aggregate(count_total_docs);

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

// export const mdfLogsCsvHistory = catchAsync(async (req, res, next) => {
//   const { sortBy = 'updatedAt', sort = 'desc', search = '' } = req.query;
//   const {
//     string,
//     boolean,
//     numbers,
//     arrayField = [],
//   } = req?.body?.searchFields || {};
//   const filter = req.body?.filter;

//   // Handle search query building
//   let search_query = {};
//   if (search && req?.body?.searchFields) {
//     string?.forEach(field => {
//       search_query[field] = { $regex: search, $options: 'i' };
//     });

//     boolean?.forEach(field => {
//       if (['true', 'false'].includes(search.toLowerCase())) {
//         search_query[field] = search.toLowerCase() === 'true';
//       }
//     });

//     if (!isNaN(search)) {
//       numbers?.forEach(field => {
//         search_query[field] = Number(search);
//       });
//     }

//     arrayField?.forEach(field => {
//       search_query[field] = { $in: [search] };
//     });

//     if (Object.keys(search_query).length === 0) {
//       return res.status(StatusCodes.NOT_FOUND).json({
//         statusCode: StatusCodes.NOT_FOUND,
//         status: false,
//         data: [],
//         message: 'No matching data found for CSV export',
//       });
//     }
//   }

//   // Clean query from undefined/null/empty values
//   const cleanMatchQuery = query => {
//     const cleaned = {};
//     for (const key in query) {
//       const value = query[key];
//       if (value === undefined || value === '' || value === null) continue;

//       if (typeof value === 'object' && ('$gte' in value || '$lte' in value)) {
//         const range = {};
//         if (value.$gte !== '' && value.$gte != null) range.$gte = value.$gte;
//         if (value.$lte !== '' && value.$lte != null) range.$lte = value.$lte;
//         if (Object.keys(range).length > 0) cleaned[key] = range;
//         continue;
//       }

//       cleaned[key] = value;
//     }
//     return cleaned;
//   };

//   const filterData = dynamic_filter(filter); // assume dynamic_filter is already defined
//   const fullQuery = { ...filterData, ...search_query };
//   const cleanedQuery = cleanMatchQuery(fullQuery);

//   const aggregationPipeline = [
//     {
//       $lookup: {
//         from: 'mdf_inventory_items_views',
//         localField: 'mdf_item_id',
//         foreignField: '_id',
//         as: 'mdf_item_details',
//         pipeline: [
//           {
//             $lookup: {
//               from: 'mdf_invoice_details',
//               localField: 'mdf_invoice_details_id',
//               foreignField: '_id',
//               as: 'mdf_invoice_details',
//               pipeline: [
//                 {
//                   $lookup: {
//                     from: 'invoice_details',
//                     localField: 'invoice_id',
//                     foreignField: '_id',
//                     as: 'invoice_Details',
//                   },
//                 },
//                 { $unwind: { path: '$invoice_Details', preserveNullAndEmptyArrays: true } },
//                 {
//                   $lookup: {
//                     from: 'suppliers',
//                     localField: 'supplier_id',
//                     foreignField: '_id',
//                     as: 'supplier_details',
//                     pipeline: [
//                       {
//                         $lookup: {
//                           from: 'company_details',
//                           localField: 'company_id',
//                           foreignField: '_id',
//                           as: 'company_details',
//                         },
//                       },
//                       { $unwind: { path: '$company_details', preserveNullAndEmptyArrays: true } },
//                       {
//                         $lookup: {
//                           from: 'branch_details',
//                           localField: 'branch_id',
//                           foreignField: '_id',
//                           as: 'branch_detail',
//                           pipeline: [
//                             {
//                               $lookup: {
//                                 from: 'contacts',
//                                 localField: 'contact_ids',
//                                 foreignField: '_id',
//                                 as: 'contact_person',
//                               },
//                             },
//                           ],
//                         },
//                       },
//                       { $unwind: { path: '$branch_detail', preserveNullAndEmptyArrays: true } },
//                     ],
//                   },
//                 },
//                 { $unwind: { path: '$supplier_details', preserveNullAndEmptyArrays: true } },
//               ],
//             },
//           },
//           { $unwind: { path: '$mdf_invoice_details', preserveNullAndEmptyArrays: true } },
//         ],
//       },
//     },
//     { $unwind: { path: '$mdf_item_details', preserveNullAndEmptyArrays: true } },
//     {
//       $lookup: {
//         from: 'users',
//         localField: 'created_by',
//         foreignField: '_id',
//         as: 'created_user_details',
//       },
//     },
//     { $unwind: { path: '$created_user_details', preserveNullAndEmptyArrays: true } },
//     {
//       $lookup: {
//         from: 'users',
//         localField: 'updated_by',
//         foreignField: '_id',
//         as: 'updated_user_details',
//       },
//     },
//     { $unwind: { path: '$updated_user_details', preserveNullAndEmptyArrays: true } },
//     { $match: cleanedQuery },
//     { $sort: { [sortBy]: sort === 'desc' ? -1 : 1 } },
//   ];

//   const result = await mdf_history_model.aggregate(aggregationPipeline);

//   if (!result || result.length === 0) {
//     return res.status(StatusCodes.NOT_FOUND).json({
//       statusCode: StatusCodes.NOT_FOUND,
//       status: false,
//       data: [],
//       message: 'No data found for CSV export',
//     });
//   }

//   const flattenedData = result.map(item => {
//     const mdfDetails = item?.mdf_item_details || {};
//     const invoiceDetails = mdfDetails?.mdf_invoice_details || {};
//     const invoiceMeta = invoiceDetails?.invoice_Details || {};
//     const supplier = invoiceDetails?.supplier_details || {};
//     const company = supplier?.company_details || {};
//     const branch = supplier?.branch_detail || {};
//     const contact = branch?.contact_person?.[0] || {};

//     return {
//       issue_status: item.issue_status || '',
//       issued_sheets: item.issued_sheets || '',
//       issued_sqm: item.issued_sqm || '',
//       issued_amount: item.issued_amount || '',
//       createdAt: item.createdAt || '',
//       updatedAt: item.updatedAt || '',

//       // MDF Item
//       item_name: mdfDetails.item_name || '',
//       supplier_item_name: mdfDetails.supplier_item_name || '',
//       item_sub_category_name: mdfDetails.item_sub_category_name || '',
//       mdf_type: mdfDetails.mdf_type || '',
//       pallet_number: mdfDetails.pallet_number || '',

//       // Invoice
//       invoice_no: invoiceMeta.invoice_no || '',
//       invoice_date: invoiceMeta.invoice_date || '',
//       inward_sr_no: invoiceDetails.inward_sr_no || '',
//       currency: invoiceDetails.currency || '',
//       port_of_loading: invoiceMeta.port_of_loading || '',

//       // Supplier
//       supplier_name: company.supplier_name || '',
//       branch_name: branch.branch_name || '',
//       contact_person: contact.name || '',

//       // User Info
//       created_by: item?.created_user_details?.user_name || '',
//       created_email: item?.created_user_details?.email_id || '',
//       updated_by: item?.updated_user_details?.user_name || '',
//     };
//   });

//   const excelLink = await createMdfLogsExcel(flattenedData);
//   console.log('CSV link =>', excelLink);

//   return res.json(
//     new ApiResponse(StatusCodes.OK, 'CSV exported successfully...', excelLink)
//   );
// });

export const mdfLogsCsvHistory = catchAsync(async (req, res) => {
  const { search = '', sortBy = 'updatedAt', sort = 'desc' } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const filter = req.body?.filter;

  console.log('🔍 Search Term:', search);
  console.log('📦 searchFields:', req.body?.searchFields);
  console.log('📁 filter:', filter);

  // 1. Build search_query
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

    console.log('🔎 search_query:', search_query);

    if (Object.keys(search_query).length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: { data: [] },
        message: 'Results Not Found',
      });
    }
  }

  // 2. Dynamic Filter Cleaning
  const filterData = dynamic_filter(filter);
  console.log('🧾 filterData after dynamic_filter:', filterData);

  const fullQuery = { ...filterData, ...search_query };

  const cleanMatchQuery = (query) => {
    const cleaned = {};
    for (const key in query) {
      const value = query[key];
      if (value === undefined || value === '' || value === null) continue;

      if (typeof value === 'object' && ('$gte' in value || '$lte' in value)) {
        const range = {};
        if (value.$gte !== '') range.$gte = value.$gte;
        if (value.$lte !== '') range.$lte = value.$lte;
        if (Object.keys(range).length > 0) {
          cleaned[key] = range;
        }
        continue;
      }

      cleaned[key] = value;
    }
    return cleaned;
  };

  const cleanedQuery = cleanMatchQuery(fullQuery);
  console.log('🧹 Cleaned match query:', cleanedQuery);

  // 3. Separate filters: before and after lookup
  const preLookupMatch = {};
  const postLookupMatch = {};

  for (const key in cleanedQuery) {
    if (key.startsWith('mdf_item_details.')) {
      postLookupMatch[key] = cleanedQuery[key];
    } else {
      preLookupMatch[key] = cleanedQuery[key];
    }
  }

  console.log('🟩 preLookupMatch:', preLookupMatch);
  console.log('🟦 postLookupMatch:', postLookupMatch);

  const aggregationPipeline = [
    { $match: preLookupMatch },
    {
      $lookup: {
        from: 'mdf_inventory_items_views',
        localField: 'mdf_item_id',
        foreignField: '_id',
        as: 'mdf_item_details',
        pipeline: [{ $project: { created_user: 0 } }],
      },
    },
    {
      $unwind: { path: '$mdf_item_details', preserveNullAndEmptyArrays: true },
    },

    // Apply post-lookup filter
    ...(Object.keys(postLookupMatch).length > 0
      ? [{ $match: postLookupMatch }]
      : []),

    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
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
        localField: 'updated_by',
        foreignField: '_id',
        as: 'updated_user_details',
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
    {
      $sort: {
        [sortBy]: sort === 'desc' ? -1 : 1,
        _id: sort === 'desc' ? -1 : 1,
      },
    },
  ];

  const data = await mdf_history_model.aggregate(aggregationPipeline);

  console.log('📊 Aggregation result count:', data.length);

  const csvLink = await createMdfHistoryExcel(data);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(StatusCodes.OK, 'CSV downloaded successfully...', csvLink)
    );
});
