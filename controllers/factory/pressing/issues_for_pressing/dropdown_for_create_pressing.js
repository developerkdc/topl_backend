import mongoose, { isValidObjectId } from 'mongoose';
import { issues_for_pressing_model } from '../../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';

import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import { plywood_inventory_items_details } from '../../../../database/schema/inventory/Plywood/plywood.schema.js';
import { plywood_resizing_done_details_model } from '../../../../database/schema/factory/plywood_resizing_factory/resizing_done/resizing.done.schema.js';
import { mdf_inventory_items_details } from '../../../../database/schema/inventory/mdf/mdf.schema.js';
import { plywood_production_model } from '../../../../database/schema/factory/plywood_production/plywood_production.schema.js';
import { fleece_inventory_items_modal } from '../../../../database/schema/inventory/fleece/fleece.schema.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';

export const fetch_all_group_no_based_on_issued_status = catchAsync(
  async (req, res) => {
    const { type, order_id, order_item_id } = req.query;
    const search_query = {
      issue_status: type,
    };
    if (type === issues_for_status?.order) {
      search_query.order_id = new mongoose.Types.ObjectId(order_id);
      search_query.order_item_id = new mongoose.Types.ObjectId(order_item_id);
    }
    const match_query = {
      ...search_query,
      'available_details.no_of_sheets': {
        $gt: 0,
      },
    };

    const pipeline = [
      { $match: { ...match_query } },
      {
        $project: {
          group_no: 1,
        },
      },
      {
        $sort: {
          group_no: 1,
        },
      },
    ];

    const result = await issues_for_pressing_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Group No Dropdown fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_issued_for_pressing_details_based_on_group_no = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const aggCommonMatch = {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(id),
      },
    };

    const aggGroupNoLookup = {
      $lookup: {
        from: 'grouping_done_items_details',
        localField: 'group_no',
        foreignField: 'group_no',
        pipeline: [
          {
            $project: {
              group_no: 1,
              photo_no: 1,
              photo_id: 1,
            },
          },
        ],
        as: 'grouping_done_items_details',
      },
    };
    const aggGroupNoUnwind = {
      $unwind: {
        path: '$grouping_done_items_details',
        preserveNullAndEmptyArrays: true,
      },
    };

    const list_aggregate = [aggCommonMatch, aggGroupNoLookup, aggGroupNoUnwind];
    // const result = await issues_for_pressing_model.findOne({ _id: id });
    const result = await issues_for_pressing_model.aggregate(list_aggregate);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Issued Item details fetched successfully',
      result[0] || {}
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

//dropdown for base details in create pressing consume from inventory only and for plywood
export const getPlywoodPalletDropdown = catchAsync(async (req, res) => {
  const { base_sub_category } = req.query;

  if (!base_sub_category) {
    throw new ApiError(
      'Base Sub Category is required',
      StatusCodes.BAD_REQUEST
    );
  }

  const pipeline = [
    {
      $match: {
        item_sub_category_name: base_sub_category,
        available_sheets: { $gt: 0 },
      },
    },
    { $project: { pallet_number: 1 } },
    { $sort: { pallet_number: 1 } },
  ];

  const result = await plywood_inventory_items_details.aggregate(pipeline);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Plywood Pallet numbers fetched successfully',
    result
  );

  return res.status(StatusCodes.OK).json(response);
});

export const getPlywoodDetailsByPalletNo = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const result = await plywood_inventory_items_details.findOne({ _id: id });

  if (!result) {
    throw new ApiError('Plywood details not found', StatusCodes?.NOT_FOUND);
  }
  const response = new ApiResponse(
    StatusCodes.OK,
    'Plywood base item details fetched successfully',
    result
  );

  return res.status(StatusCodes.OK).json(response);
});
//dropdown for base details in create pressing consume from inventory only and for MDF
export const getMdfPalletDropdown = catchAsync(async (req, res) => {
  const { consume_from, base_sub_category } = req.query;

  if (!base_sub_category) {
    throw new ApiError(
      'Base Sub Category is required',
      StatusCodes.BAD_REQUEST
    );
  }

  const pipeline = [
    {
      $match: {
        item_sub_category_name: base_sub_category,
        available_sheets: { $gt: 0 },
      },
    },
    { $project: { pallet_number: 1 } },
    { $sort: { pallet_number: 1 } },
  ];

  const result = await mdf_inventory_items_details.aggregate(pipeline);

  const response = new ApiResponse(
    StatusCodes.OK,
    'MDF Pallet numbers fetched successfully',
    result
  );

  return res.status(StatusCodes.OK).json(response);
});

export const getMdfDetailsByPalletNo = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const result = await mdf_inventory_items_details.findOne({ _id: id });

  if (!result) {
    throw new ApiError('MDF details not found', StatusCodes?.NOT_FOUND);
  }
  const response = new ApiResponse(
    StatusCodes.OK,
    'MDF base item details fetched successfully',
    result
  );

  return res.status(StatusCodes.OK).json(response);
});

//item name dropdown for base details for PLYWOOD
//cosume from resizing
export const getPlywoodResizingItemNameDropdown = catchAsync(
  async (req, res) => {
    const pipeline = [
      {
        $match: {
          'available_details.no_of_sheets': { $gt: 0 },
        },
      },
      {
        $project: {
          sr_no: 1,
          item_name: 1,
        },
      },
      {
        $sort: {
          sr_no: 1,
          item_name: 1,
        },
      },
    ];

    const result =
      await plywood_resizing_done_details_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Plywood Resizing item name dropdown fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const getPlywoodResizingItemDetails = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const result = await plywood_resizing_done_details_model.findOne({ _id: id });

  if (!result) {
    throw new ApiError(
      'Plywood Resizing record not found',
      StatusCodes.NOT_FOUND
    );
  }

  const response = new ApiResponse(
    StatusCodes.OK,
    'Plywood Resizing base item details fetched successfully',
    result
  );

  return res.status(StatusCodes.OK).json(response);
});

//cosume from production
export const getPlywoodProductionItemNameDropdown = catchAsync(
  async (req, res) => {
    const pipeline = [
      {
        $match: {
          available_no_of_sheets: { $gt: 0 },
        },
      },
      {
        $project: {
          sr_no: 1,
          item_name: 1,
        },
      },
      {
        $sort: {
          sr_no: 1,
          item_name: 1,
        },
      },
    ];

    const result = await plywood_production_model.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Plywood Production item name dropdown fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const getPlywoodProductionItemDetails = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const result = await plywood_production_model.findOne({ _id: id });

  if (!result) {
    throw new ApiError(
      'Plywood Production record not found',
      StatusCodes.NOT_FOUND
    );
  }

  const response = new ApiResponse(
    StatusCodes.OK,
    'Plywood Production base item details fetched successfully',
    result
  );

  return res.status(StatusCodes.OK).json(response);
});

// base details for fleece paper
export const fetch_all_fleece_paper_inward_sr_no = catchAsync(
  async (req, res) => {
    // if (!isValidObjectId(id)) {
    //   throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    // }

    const search_query = {};

    const match_query = {
      ...search_query,
      available_number_of_roll: {
        // $lte: order_item_data.no_of_sheet,
        $gt: 0,
      },
      'invoice_details.approval_status.sendForApproval.status': false,
    };

    const pipeline = [
      {
        $lookup: {
          from: 'fleece_inventory_invoice_details',
          localField: 'invoice_id',
          foreignField: '_id',
          as: 'invoice_details',
        },
      },
      { $unwind: '$invoice_details' },
      { $match: { ...match_query } },
      // {
      //   $project: {
      //     inward_sr_no: "$invoice_details.inward_sr_no",
      //     _id: "$invoice_details._id"
      //   },
      // },
      {
        $group: {
          _id: '$invoice_details._id',
          inward_sr_no: { $first: '$invoice_details.inward_sr_no' },
          invoice_id: { $first: '$invoice_details._id' },
        },
      },
      {
        $project: {
          _id: '$invoice_id',
          inward_sr_no: 1,
        },
      },
    ];

    const result = await fleece_inventory_items_modal.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Inward Sr.No Dropdown fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);
export const fetch_all_fleece_paper_sr_no_by_inward_sr_no = catchAsync(
  async (req, res) => {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const search_query = {};
    const match_query = {
      invoice_id: mongoose.Types.ObjectId.createFromHexString(id),
      ...search_query,
      available_number_of_roll: {
        // $lte: order_item_data.no_of_sheet,
        $gt: 0,
      },
    };

    const pipeline = [
      { $match: { ...match_query } },
      {
        $project: {
          item_sr_no: 1,
        },
      },
    ];

    const result = await fleece_inventory_items_modal
      .aggregate(pipeline)
      .collation({ caseLevel: true, locale: 'en' });

    const response = new ApiResponse(
      StatusCodes.OK,
      'Item Sr.No Dropdown fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);
export const fetch_fleece_paper_details_by_id = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const result = await fleece_inventory_items_modal.findById(id);
  const response = new ApiResponse(
    StatusCodes.OK,
    'Face Item Details fetched successfully',
    result
  );
  return res.status(StatusCodes.OK).json(response);
});
