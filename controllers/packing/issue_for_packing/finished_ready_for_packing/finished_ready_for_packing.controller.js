import mongoose, { isValidObjectId } from 'mongoose';
import {
  item_issued_for,
  item_issued_from,
  order_category,
} from '../../../../database/Utils/constants/constants.js';
import { bunito_done_details_model } from '../../../../database/schema/factory/bunito/bunito_done/bunito_done.schema.js';
import bunito_history_model from '../../../../database/schema/factory/bunito/bunito_history/bunito.history.schema.js';
import { issue_for_bunito_view_model } from '../../../../database/schema/factory/bunito/issue_for_bunito/issue_for_bunito.schema.js';
import { canvas_done_details_model } from '../../../../database/schema/factory/canvas/canvas_done/canvas_done.schema.js';
import canvas_history_model from '../../../../database/schema/factory/canvas/canvas_history/canvas.history.schema.js';
import { issue_for_canvas_view_model } from '../../../../database/schema/factory/canvas/issue_for_canvas/issue_for_canvas.schema.js';
import { cnc_done_details_model } from '../../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';
import cnc_history_model from '../../../../database/schema/factory/cnc/cnc_history/cnc.history.schema.js';
import { issue_for_cnc_view_model } from '../../../../database/schema/factory/cnc/issue_for_cnc/issue_for_cnc.schema.js';
import { color_done_details_model } from '../../../../database/schema/factory/colour/colour_done/colour_done.schema.js';
import color_history_model from '../../../../database/schema/factory/colour/colour_history/colour_history.schema.js';
import { issue_for_colour_view_model } from '../../../../database/schema/factory/colour/issue_for_colour/issue_for_colour.schema.js';
import { issue_for_polishing_view_model } from '../../../../database/schema/factory/polishing/issue_for_polishing/issue_for_polishing.schema.js';
import { polishing_done_details_model } from '../../../../database/schema/factory/polishing/polishing_done/polishing_done.schema.js';
import polishing_history_model from '../../../../database/schema/factory/polishing/polishing_history/polishing.history.schema.js';
import { pressing_done_details_model } from '../../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_done_history_model } from '../../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import issue_for_order_model from '../../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import finished_ready_for_packing_model from '../../../../database/schema/packing/issue_for_packing/finished_ready_for_packing/finished_ready_for_packing.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { generatePDF_packing } from '../../../../utils/generatePDF/generatePDFBuffer.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  packing_done_items_model,
  packing_done_other_details_model,
} from '../../../../database/schema/packing/packing_done/packing_done.schema.js';
import moment from 'moment';
import dispatchModel from '../../../../database/schema/dispatch/dispatch.schema.js';
import dispatchItemsModel from '../../../../database/schema/dispatch/dispatch_items.schema.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const issued_from_map = {
  [item_issued_from?.pressing_factory]: pressing_done_details_model,
  [item_issued_from?.cnc_factory]: cnc_done_details_model,
  [item_issued_from?.bunito_factory]: bunito_done_details_model,
  [item_issued_from?.color_factory]: color_done_details_model,
  [item_issued_from?.canvas_factory]: canvas_done_details_model,
  [item_issued_from?.polishing_factory]: polishing_done_details_model,
};
const issued_from_history_map = {
  [item_issued_from?.pressing_factory]: pressing_done_history_model,
  [item_issued_from?.cnc_factory]: cnc_history_model,
  [item_issued_from?.bunito_factory]: bunito_history_model,
  [item_issued_from?.color_factory]: color_history_model,
  [item_issued_from?.canvas_factory]: canvas_history_model,
  [item_issued_from?.polishing_factory]: polishing_history_model,
};

const issued_from_issue_for_map = {
  [item_issued_from?.pressing_factory]: pressing_done_details_model,
  [item_issued_from?.cnc_factory]: issue_for_cnc_view_model,
  [item_issued_from?.bunito_factory]: issue_for_bunito_view_model,
  [item_issued_from?.color_factory]: issue_for_colour_view_model,
  [item_issued_from?.canvas_factory]: issue_for_canvas_view_model,
  [item_issued_from?.polishing_factory]: issue_for_polishing_view_model,
};

export const add_finished_ready_for_packing = catchAsync(async (req, res) => {
  const {
    issued_sheets,
    issued_amount,
    issued_sqm,
    issued_from_id,
    issued_from,
  } = req.body;

  const user = req.userDetails;
  for (let field of [
    'issued_sheets',
    'issued_amount',
    'issued_sqm',
    'issued_from_id',
    'issued_from',
  ]) {
    if (!req.body[field]) {
      throw new ApiError(`${field?.split("_")?.join(" ")} is required.`,StatusCodes.BAD_REQUEST );
    }
  }
  if (!isValidObjectId(issued_from_id)) {
    throw new ApiError('Invalid Issued From ID.',StatusCodes.BAD_REQUEST);
  }

  const issued_from_model = issued_from_map[issued_from];

  if (!issued_from_model) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid issued from type.');
  }
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const issued_from_details = await issued_from_model
      .findById(issued_from_id)
      .session(session);
    if (!issued_from_details) {
      throw new ApiError(
      
        'Issued from details not found.',  StatusCodes.NOT_FOUND,
      );
    }

    let issued_item_issue_id = null;
    let issue_for_field_key = null;

    if (issued_from !== item_issued_from?.pressing_factory) {
      const factory_key = issued_from?.toLowerCase();
      issue_for_field_key = `issue_for_${factory_key}_id`;

      issued_item_issue_id = issued_from_details?.[issue_for_field_key];
      if (!issued_item_issue_id) {
        throw new ApiError(
          `${issue_for_field_key} not found in issued_from_details.`,
          StatusCodes.BAD_REQUEST
        );
      }
    }
    const issue_for_id =
      issued_from === item_issued_from?.pressing_factory
        ? issued_from_details?._id
        : issued_item_issue_id;

    const [pressing_done_details] = await issued_from_issue_for_map[
      issued_from
    ].aggregate([
      {
        $match: {
          _id: issue_for_id,
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'order_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                _id: 1,
                order_no: 1,
                order_category: 1,
              },
            },
          ],
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
          from: 'series_product_order_item_details',
          localField: 'order_item_id',
          foreignField: '_id',
          as: 'series_items',
          pipeline: [
            {
              $project: {
                _id: 1,
                item_no: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'decorative_order_item_details',
          localField: 'order_item_id',
          foreignField: '_id',
          as: 'decorative_items',
          pipeline: [
            {
              $project: {
                _id: 1,
                item_no: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          order_item_details: {
            $cond: {
              if: {
                $gt: [{ $size: '$series_items' }, 0],
              },
              then: {
                $arrayElemAt: ['$series_items', 0],
              },
              else: {
                $arrayElemAt: ['$decorative_items', 0],
              },
            },
          },
        },
      },
    ]);

    if (!pressing_done_details) {
      throw new ApiError( 'Order details not found.',StatusCodes.NOT_FOUND);
    }

    const payload = {
      issued_from_id: issued_from_id,
      issued_from: issued_from,
      issued_for: item_issued_for?.order,
      pressing_id:
        pressing_done_details?.pressing_id ||
        pressing_done_details?.pressing_details?.pressing_id,
      pressing_details_id:
        pressing_done_details?._id ||
        pressing_done_details?.pressing_details?._id,
      order_id:
        pressing_done_details?.order_id ||
        pressing_done_details?.pressing_details?.order_id,
      order_item_id:
        pressing_done_details?.order_item_id ||
        pressing_done_details?.pressing_details?.order_item_id,
      order_number: pressing_done_details?.order_details?.order_no,
      order_item_no:
        pressing_done_details?.series_items?.[0]?.item_no ||
        pressing_done_details?.decorative_items?.[0]?.item_no,
      group_no:
        pressing_done_details?.group_no ||
        pressing_done_details?.pressing_details?.group_no,
      group_no_id:
        pressing_done_details?.group_no_id ||
        pressing_done_details?.pressing_details?.group_no_id,
      length:
        pressing_done_details?.length ||
        pressing_done_details?.pressing_details?.length,
      width:
        pressing_done_details?.width ||
        pressing_done_details?.pressing_details?.width,
      thickness:
        pressing_done_details?.thickness ||
        pressing_done_details?.pressing_details?.thickness,
      order_category:
        pressing_done_details?.order_category ||
        pressing_done_details?.order_details?.order_category,
      product_type:
        pressing_done_details?.product_type ||
        pressing_done_details?.pressing_details?.product_type,
      no_of_sheets: issued_sheets,
      sqm: issued_sqm,
      amount: issued_amount,
      // product_type: pressing_done_details?.product_type,
      remark:
        pressing_done_details?.remark ||
        pressing_done_details?.pressing_details?.remark ||
        null,
      created_by: user?._id,
      updated_by: user?._id,
    };

    const [add_finished_ready_for_packing_result] =
      await finished_ready_for_packing_model.create([payload], { session });
    if (!add_finished_ready_for_packing_result) {
      throw new ApiError(
    
        'Failed to add finished ready for packing details.',  StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const update_issued_item_details = await issued_from_model.updateOne(
      { _id: issued_from_details?._id },
      {
        $inc: {
          'available_details.no_of_sheets': Number(
            Number(-issued_sheets)?.toFixed(2)
          ),
          'available_details.sqm': Number(Number(-issued_sqm)?.toFixed(3)),
          'available_details.amount': Number(
            Number(-issued_amount)?.toFixed(2)
          ),
        },
        $set: {
          isEditable: false,
          updated_by: user?._id,
        },
      },
      { session }
    );

    if (update_issued_item_details?.matchedCount === 0) {
      throw new ApiError(
     
        'Issued item details not found for update.',   StatusCodes.NOT_FOUND
      );
    }

    if (
      !update_issued_item_details?.acknowledged ||
      update_issued_item_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        
        'Failed to update issued item details.',StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const [max_histroy_sr_no] = await issued_from_history_map[issued_from]
      .aggregate([
        {
          $group: {
            _id: null,
            max_sr_no: {
              $max: '$sr_no',
            },
          },
        },
      ])
      .session(session);
    const history_payload = {
      sr_no: max_histroy_sr_no?.max_sr_no + 1 || 1,
      issued_item_id: issued_from_details?._id,
      pressing_id: pressing_done_details?.pressing_id,
      pressing_details_id: pressing_done_details?._id,
      order_id:
        pressing_done_details?.order_id ||
        pressing_done_details?.order_details?._id,
      order_item_id:
        pressing_done_details?.order_item_id ||
        pressing_done_details?.order_item_details?._id,
      order_number: pressing_done_details?.order_details?.order_no,
      order_item_no:
        pressing_done_details?.series_items?.[0]?.item_no ||
        pressing_done_details?.decorative_items?.[0]?.item_no,
      group_no:
        pressing_done_details?.group_no ||
        pressing_done_details?.pressing_details?.group_no,
      group_no_id:
        pressing_done_details?.group_no_id ||
        pressing_done_details?.pressing_details?.group_no_id,
      length:
        pressing_done_details?.length ||
        pressing_done_details?.pressing_details?.length,
      width:
        pressing_done_details?.width ||
        pressing_done_details?.pressing_details?.width,
      thickness:
        pressing_done_details?.thickness ||
        pressing_done_details?.pressing_details?.thickness,
      no_of_sheets: issued_sheets,
      sqm: issued_sqm,
      amount: issued_amount,
      product_type:
        pressing_done_details?.product_type ||
        pressing_done_details?.pressing_details?.product_type,
      order_category:
        pressing_done_details?.order_category ||
        pressing_done_details?.pressing_details?.order_category,
      issued_from: item_issued_from,
      issued_for: item_issued_for?.order,
      issued_for_id: add_finished_ready_for_packing_result?._id,
      remark:
        pressing_done_details?.remark ||
        pressing_done_details?.pressing_details?.remark ||
        null,
      issue_status: item_issued_from?.packing,
      created_by: user?._id,
      updated_by: user?._id,
    };

    if (issue_for_field_key && issued_item_issue_id) {
      history_payload[issue_for_field_key] = issued_item_issue_id;
    }
    const [create_history_result] = await issued_from_history_map[
      issued_from
    ].create([history_payload], { session });

    if (!create_history_result) {
      throw new ApiError(
        
        'Failed to create history for issued item.',StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Finished ready for packing details added successfully.',
      add_finished_ready_for_packing_result
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

export const fetch_all_finished_ready_for_packing = catchAsync(
  async (req, res) => {
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
      is_packing_done: false,
    };

    const aggGroupingDetails = {
      $lookup: {
        from: 'grouping_done_items_details',
        localField: 'group_no',
        foreignField: 'group_no',
        as: 'grouping_details',
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
    const aggUnwindGroupingDetails = {
      $unwind: {
        path: '$grouping_details',
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
      aggGroupingDetails,
      aggUnwindGroupingDetails,
      aggCreatedByLookup,
      aggCreatedByUnwind,
      aggUpdatedByLookup,
      aggUpdatedByUnwind,
      aggMatch,
      aggSort,
      aggSkip,
      aggLimit,
    ]; // aggregation pipiline

    const issue_for_raw_packing =
      await finished_ready_for_packing_model.aggregate(listAggregate);

    const aggCount = {
      $count: 'totalCount',
    }; // count aggregation stage

    const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

    const totalDocument =
      await finished_ready_for_packing_model.aggregate(totalAggregate);

    const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Issued For Finished Ready for Packing Data Fetched Successfully',
      {
        data: issue_for_raw_packing,
        totalPages: totalPages,
      }
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const revert_finished_ready_for_packing = catchAsync(
  async (req, res) => {
    const { id } = req.params;
    const user = req.userDetails;

    if (!id || !isValidObjectId(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid ID ');
    }

    const session = await mongoose.startSession();
    try {
      await session.startTransaction();

      const finished_ready_for_packing_details =
        await finished_ready_for_packing_model
          .findById(id)
          .session(session)
          .lean();
      if (!finished_ready_for_packing_details) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Finished ready for packing details not found.'
        );
      }

      const issued_from_model =
        issued_from_map[finished_ready_for_packing_details?.issued_from];
      if (!issued_from_model) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Invalid issued from type.'
        );
      }

      const issued_from_details = await issued_from_model
        .findById(finished_ready_for_packing_details?.issued_from_id)
        .session(session);
      if (!issued_from_details) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Issued from details not found.'
        );
      }

      const update_issued_item_details = await issued_from_model.updateOne(
        { _id: issued_from_details?._id },
        {
          $inc: {
            'available_details.no_of_sheets': Number(
              Number(finished_ready_for_packing_details?.no_of_sheets)?.toFixed(
                2
              )
            ),
            'available_details.sqm': Number(
              Number(finished_ready_for_packing_details?.sqm)?.toFixed(3)
            ),
            'available_details.amount': Number(
              Number(finished_ready_for_packing_details?.amount)?.toFixed(2)
            ),
          },
          $set: {
            isEditable: true,
            updated_by: user?._id,
          },
        },
        { session }
      );

      if (update_issued_item_details?.matchedCount === 0) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Issued item details not found for update.'
        );
      }

      if (
        !update_issued_item_details?.acknowledged ||
        update_issued_item_details?.modifiedCount === 0
      ) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to update issued item details.'
        );
      }

      const delete_finished_ready_for_packing_result =
        await finished_ready_for_packing_model
          .deleteOne({ _id: id })
          .session(session);
      if (
        !delete_finished_ready_for_packing_result?.acknowledged ||
        delete_finished_ready_for_packing_result.deletedCount === 0
      ) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Failed to delete finished ready for packing details.'
        );
      }

      const delete_history_result = await issued_from_history_map[
        finished_ready_for_packing_details?.issued_from
      ]
        .deleteOne({
          issued_for_id: id,
        })
        .session(session);

      if (
        !delete_history_result?.acknowledged ||
        delete_history_result.deletedCount === 0
      ) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Failed to delete history for issued item.'
        );
      }
      const response = new ApiResponse(
        StatusCodes.OK,
        'Finished ready for packing details reverted successfully.'
      );
      await session.commitTransaction();
      return res.status(response.statusCode).json(response);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
);

export const fetch_issue_for_packing_items_by_customer_and_order_category =
  catchAsync(async (req, res) => {
    const { customer_id, order_type, product_type } = req.query;
    // console.log(customer_id, order_type, product_type, 'ohfkekuhkhg');
    const match_query = {
      is_packing_done: false,
      'order_details.customer_id':
        mongoose.Types.ObjectId.createFromHexString(customer_id),
    };

    if (order_type === order_category?.raw) {
      match_query.issued_from = product_type;
      match_query['order_details.order_category'] = order_type;
    } else {
      match_query.product_type = product_type;
      match_query.order_category = order_type;
    }

    const pipeline = [
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
    ];

    const issue_for_packing_items = await (
      order_type === order_category?.raw
        ? issue_for_order_model
        : finished_ready_for_packing_model
    ).aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Issue for packing items fetched successfully.',
      issue_for_packing_items
    );
    return res.status(response.statusCode).json(response);
  });

export const generatePackingInvoiceBillPDF = catchAsync(async (req, res) => {
  const { id } = req.params;

  const dispatch = await dispatchModel.findById(id).lean();
  if (!dispatch) {
    return res
      .status(404)
      .json({ status: false, message: 'Packing item not found' });
  }

  const other_dispatch_details = await dispatchItemsModel
    .find({ dispatch_id: id })
    .lean();
  if (!other_dispatch_details) {
    return res
      .status(404)
      .json({ status: false, message: 'other item details not found' });
  }

  const formattedDispatch = {
    ...dispatch,
    invoice_date_time: dispatch.invoice_date_time
      ? moment(dispatch.invoice_date_time).format('DD-MM-YYYY')
      : '',
    removal_of_good_date_time: dispatch.removal_of_good_date_time
      ? moment(dispatch.removal_of_good_date_time).format('DD-MM-YYYY')
      : '',
    trans_doc_date: dispatch.trans_doc_date
      ? moment(dispatch.trans_doc_date).format('DD-MM-YYYY')
      : '',
    eway_bill_date: dispatch.eway_bill_date
      ? moment(dispatch.eway_bill_date).format('DD-MM-YYYY')
      : '',
    acknowledgement_date: dispatch.acknowledgement_date
      ? moment(dispatch.acknowledgement_date).format('DD-MM-YYYY')
      : '',
    createdAt: dispatch.createdAt
      ? moment(dispatch.createdAt).format('DD-MM-YYYY')
      : '',
    updatedAt: dispatch.updatedAt
      ? moment(dispatch.updatedAt).format('DD-MM-YYYY')
      : '',
  };

  const packingEntry = dispatch.packing_done_ids?.[0];
  if (!packingEntry) {
    return res
      .status(404)
      .json({ status: false, message: 'No packing details found in dispatch' });
  }

  const otherDetails = {
    ...packingEntry,
    packing_date: packingEntry.packing_date
      ? moment(packingEntry.packing_date).format('DD-MM-YYYY')
      : '',
  };

  // const allItems = dispatch.packing_done_item_details?.filter(
  //     i => String(i.packing_done_other_details_id) === String(packingEntry.packing_done_other_details_id)
  // ) || [];

  const allItems = other_dispatch_details.filter(
    (i) =>
      String(i.packing_done_other_details_id) ===
      String(packingEntry.packing_done_other_details_id)
  );

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
        item_name: i.item_name || ' ',
        size: `${i.length || 0} x ${i.width || 0}`,
        sheets: 0,
        sqm: 0,
        rate: i.rate || 0,
        taxable_value: 0,
      };
    }
    summaryMap[key].sheets += i.no_of_sheets || 0;
    summaryMap[key].sqm += i.sqm || 0;
    summaryMap[key].taxable_value += (i.sqm || 0) * (i.rate || 0);
  }
  const item_summary = Object.values(summaryMap);

  const basic_amount = item_summary.reduce(
    (sum, i) => sum + i.taxable_value,
    0
  );
  const insurance = basic_amount * 0.00125; // 0.125%
  const freight = 500; // static for now or pull from dispatch
  const total = basic_amount + insurance + freight;
  const igst = total * 0.18;
  const grand_total = total + igst;

  const combinedData = {
    ...formattedDispatch,
    ...otherDetails,
    packing_done_item_details: allItems,
    totalSheets,
    totalSqMtr,
    item_summary,
    basic_amount: basic_amount.toFixed(2),
    insurance: insurance.toFixed(2),
    freight: freight.toFixed(2),
    total: total.toFixed(2),
    igst: igst.toFixed(2),
    grand_total: grand_total.toFixed(2),
  };

  const pdfBuffer = await generatePDF_packing({
    templateName: 'invoice_bill',
    templatePath: path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'views',
      'dispatch',
      'invoice_bill.hbs'
    ),
    data: combinedData,
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="invoice-bill.pdf"',
    'Content-Length': pdfBuffer.length,
  });

  return res.status(200).end(pdfBuffer);
});

export const generatePackingEwayBillPDF = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Fetch the dispatch record
  const dispatch = await dispatchModel.findById(id).lean();
  if (!dispatch) {
    return res
      .status(404)
      .json({ status: false, message: 'Dispatch not found' });
  }

  // Fetch the packing other details linked to this dispatch
  const packingDetails = await packing_done_other_details_model
    .findById(dispatch.packing_done_ids?.[0]?.packing_done_other_details_id)
    .lean();

  if (!packingDetails) {
    return res
      .status(404)
      .json({ status: false, message: 'Packing details not found' });
  }

  // Fetch all packing items linked to this packing other details
  const allItems = await packing_done_items_model
    .find({
      packing_done_other_details_id:
        dispatch.packing_done_ids?.[0]?.packing_done_other_details_id,
    })
    .lean();

  // Format dates
  const formattedPackingDate = packingDetails.packing_date
    ? moment(packingDetails.packing_date).format('DD-MM-YYYY')
    : '';
  const formattedEwayBillDate = dispatch.eway_bill_date
    ? moment(dispatch.eway_bill_date).format('DD-MM-YYYY')
    : '';

  // Calculate totals
  const totalSheets = allItems.reduce(
    (sum, i) => sum + (i.no_of_sheets || 0),
    0
  );
  const totalSqMtr = allItems.reduce((sum, i) => sum + (i.sqm || 0), 0);

  // Prepare item summary grouped by name and size
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

  // Combine all data for HBS template
  const combinedData = {
    dispatch_id: dispatch._id,
    packing_id: packingDetails.packing_id,
    packing_date: formattedPackingDate,
    eway_bill_no: dispatch.eway_bill_no || '',
    eway_bill_date: formattedEwayBillDate,
    customer_details: dispatch.customer_details || {},
    packing_done_item_details: allItems,
    totalSheets,
    totalSqMtr,
    item_summary,
  };

  // Generate PDF
  const pdfBuffer = await generatePDF_packing({
    templateName: 'dispatch_ewaybill',
    templatePath: path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'views',
      'dispatch',
      'eway.hbs'
    ),
    data: combinedData,
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="dispatch-eway-bill.pdf"',
    'Content-Length': pdfBuffer.length,
  });

  return res.status(200).end(pdfBuffer);
});
