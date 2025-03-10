import { isValidObjectId } from "mongoose";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import { StatusCodes } from "../../../utils/constants.js";
import { RawOrderItemDetailsModel } from "../../../database/schema/order/raw_order/raw_order_item_details.schema.js";
import { mdf_inventory_items_details } from "../../../database/schema/inventory/mdf/mdf.schema.js";
import ApiResponse from "../../../utils/ApiResponse.js";

//fetching all mdf 
export const fetch_all_mdf_pallet_no_item_name=catchAsync(async(req,res)=>{
    const {id}=req.params;
    if(!isValidObjectId(id)){
        throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST);
    }

    const order_item_data=await RawOrderItemDetailsModel.findById(id);

    if(!order_item_data){
        throw new ApiError("Order Item Data not found", StatusCodes.NOT_FOUND);
    }
    const search_query={};
    if(order_item_data?.item_name){
        search_query['item_name']=order_item_data?.item_name;
    }

    const match_query={
        ...search_query,
        no_of_sheet:{
            $lte:order_item_data.no_of_sheet
        }
    };

    const pipeline = [
        { $match: { ...match_query } },
        {
          $project: {
            pallet_number: 1,
          },
        },
    ];

    const result = await mdf_inventory_items_details
        ?.aggregate(pipeline)
        .collation({ caseLevel: true, locale: 'en' });
    
      const response = new ApiResponse(
        StatusCodes.OK,
        'Pallet No Dropdown fetched successfully',
        result
      );
    return res.status(StatusCodes.OK).json(response);
})


//fetch MDF details by Id(pallet dropdown)
export const fetch_mdf_details_by_id = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const mdf_item_details = await mdf_inventory_items_details.findById(id);
  const response = new ApiResponse(
    StatusCodes.OK,
    'MDF Item Details fetched successfully',
    mdf_item_details
  );
  return res.status(StatusCodes.OK).json(response);
});