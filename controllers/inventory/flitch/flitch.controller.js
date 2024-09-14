import mongoose from "mongoose";
import {
  flitch_inventory_invoice_model,
  flitch_inventory_items_model,
  flitch_inventory_items_view_model,
} from "../../../database/schema/inventory/Flitch/flitch.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { StatusCodes } from "../../../utils/constants.js";
import { createFlitchLogsExcel } from "../../../config/downloadExcel/Logs/Inventory/flitch/flitchLogs.js";

// export const listing_flitch_inventory = catchAsync(async (req, res, next) => {
//     const { page = 1, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;

//     const List_flitch_inventory_details = await flitch_inventory_items_model.aggregate([
//         {
//             $lookup: {
//                 from: "flitch_inventory_invoice_model",
//                 localField: "invoice_id",
//                 foreignField: "_id",
//                 as: "flitch_invoice_details"
//             }
//         },
//         {
//             $unwind: {
//                 path: "$flitch_invoice_details",
//                 preserveNullAndEmptyArrays: true
//             }
//         },
//         {
//             $skip: (parseInt(page) - 1) * parseInt(limit)
//         },
//         {
//             $limit: parseInt(limit)
//         },
//     ]);

//     return res.status(200).json({
//         statusCode:200,
//         status: "success",
//         data:List_flitch_inventory_details,
//         message:"Data fetched successfully"
//     })
// })

export const listing_flitch_inventory = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "updatedAt",
    sort = "desc",
    search = "",
  } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const filter = req.body?.filter;

  let search_query = {};
  if (search != "" && req?.body?.searchFields) {
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
        message: "Results Not Found",
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
  };

  const aggregate_stage = [
    {
      $match: match_query,
    },
    {
      $sort: {
        [sortBy]: sort === "desc" ? -1 : 1,
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

  const totalPage = await flitch_inventory_items_view_model.countDocuments({
    ...match_query
  });

  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: List_flitch_inventory_details,
    totalPage:totalPage,
    message: "Data fetched successfully",
  });
});

export const item_sr_no_dropdown = catchAsync(async (req,res,next)=>{
    const item_sr_no = await flitch_inventory_items_model.distinct("item_sr_no");
    return res.status(200).json({
        statusCode:200,
        status:"success",
        data:item_sr_no,
        message:"Item Sr No Dropdown fetched successfully",
    })
});

export const inward_sr_no_dropdown = catchAsync(async (req,res,next)=>{
    const item_sr_no = await flitch_inventory_invoice_model.distinct("inward_sr_no");
    return res.status(200).json({
        statusCode:200,
        status:"success",
        data:item_sr_no,
        message:"Inward Sr No Dropdown fetched successfully",
    })
})

export const add_flitch_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { inventory_invoice_details, inventory_items_details } = req.body;

    const inward_sr_no = await flitch_inventory_invoice_model.aggregate([
      {
        $group: {
          _id: null,
          latest_inward_sr_no: { $max: "$inward_sr_no" },
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
      return next(new ApiError("Failed to add invoice", 400));
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
      return next(new ApiError("Failed to add Items Details", 400));
    }

    await session.commitTransaction();
    session.endSession();
    return res.status(201).json({
      statusCode: 201,
      status: "Created",
      data: {
        add_invoice_details,
        add_items_details,
      },
      message: "Inventory has added successfully",
    });
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
      return next(new ApiError("Please provide valid invoice id", 400));
    }

    const add_item_details = await flitch_inventory_items_model.create({
      ...item_details,
    });

    return res.status(200).json({
      statusCode: 200,
      status: "success",
      data: add_item_details,
      message: "Inventory Item has added successfully",
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
    return next(new ApiError("Failed to update item details", 400));
  }

  return res.status(200).json({
    statusCode: 200,
    status: "Updated",
    data: update_item_details,
    message: "Inventory Item has updated successfully",
  });
});

export const edit_flitch_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params?.invoice_id;
    const invoice_details = req.body?.invoice_details;

    const update_voice_details =
      await flitch_inventory_invoice_model.updateOne(
        { _id: invoice_id },
        {
          $set: invoice_details,
        }
      );

    if (
      !update_voice_details?.acknowledged &&
      update_voice_details?.modifiedCount <= 0
    ) {
      return next(new ApiError("Failed to update item details", 400));
    }

    return res.status(200).json({
      statusCode: 200,
      status: "Updated",
      data: update_voice_details,
      message: "Inventory Invoice has updated successfully",
    });
  }
);

export const flitchLogsCsv = catchAsync(async (req, res) => {
  const { search = "" } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const filter = req.body?.filter;

  let search_query = {};
  if (search != "" && req?.body?.searchFields) {
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
        message: "Results Not Found",
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
  };

  const allData = await flitch_inventory_items_view_model.find(match_query);
  if (allData.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(new ApiResponse(StatusCodes.NOT_FOUND, "NO Data found..."));
  }
  const excelLink = await createFlitchLogsExcel(allData);
  console.log("link => ", excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, "Csv downloaded successfully...", excelLink)
  );
});
