import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import mongoose, { isValidObjectId } from 'mongoose';
import {
  core_inventory_invoice_details,
  core_inventory_items_details,
  core_inventory_items_view_modal,
} from '../../../database/schema/inventory/core/core.schema.js';

//fetching all pallet no dropdown
export const fetch_all_core_inward_sr_no_for_plywood_production = catchAsync(
  async (req, res) => {
   
 console.log("fetch_all_core_inward_sr_no_for_plywood_production");
    const match_query = {
      available_sheets: {
        $gt: 0
      },
      "invoice_details.approval_status.sendForApproval.status": false
    };

    
    const pipeline = [
      {
        $lookup: {
          from: "core_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "invoice_details"
        }
      },
      { $unwind: "$invoice_details" },
      { $match: { ...match_query } },
      
      {
        $group: {
          _id: "$invoice_details._id",
          inward_sr_no: { $first: "$invoice_details.inward_sr_no" },
          invoice_id: { $first: "$invoice_details._id" }
        }
      },
      {
        $project: {
          _id: "$invoice_id",
          inward_sr_no: 1
        }
      },
      {
        $sort:{
          inward_sr_no:1
        }
      }
    ];


    const result = await core_inventory_items_details.aggregate(pipeline);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Inward Sr.No Dropdown fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_all_core_sr_no_by_inward_sr_no_for_plywood_production = catchAsync(
  async (req, res) => {
    const { id } = req.params;
    console.log("fetch_all_core_sr_no_by_inward_sr_no_for_plywood_production")
    const match_query = {
      invoice_id: mongoose.Types.ObjectId.createFromHexString(id),
     
      available_sheets: {
        $gt: 0
      },
    };

    const pipeline = [
      { $match: { ...match_query } },
      {
        $project: {
          item_sr_no: 1,
        },
      },
      {
        $sort:{
          item_sr_no:1
        }
      }
    ];

    const result = await core_inventory_items_details
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

// export const fetch_core_details_by_id = catchAsync(async (req, res) => {
//   const { id } = req.params;

//   if (!id || !isValidObjectId(id)) {
//     throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
//   }

//   const result = await core_inventory_items_details.findById(id);
//   const response = new ApiResponse(
//     StatusCodes.OK,
//     'core Item Details fetched successfully',
//     result
//   );
//   return res.status(StatusCodes.OK).json(response);
// });
