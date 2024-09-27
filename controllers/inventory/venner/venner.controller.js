import mongoose from "mongoose";
import {
  veneer_inventory_invoice_model,
  veneer_inventory_items_model,
  veneer_inventory_items_view_modal,
} from "../../../database/schema/inventory/venner/venner.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { StatusCodes } from "../../../utils/constants.js";
import { createMdfLogsExcel } from "../../../config/downloadExcel/Logs/Inventory/mdf/mdf.js";
import { createLogLogsExcel } from "../../../config/downloadExcel/Logs/Inventory/log/log.js";
import { createVeneerLogsExcel } from "../../../config/downloadExcel/Logs/Inventory/venner/venner.js";

export const listing_veneer_inventory = catchAsync(async (req, res, next) => {
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
        _id: sort === "desc" ? -1 : 1,
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

  const List_veneer_inventory_details =
    await veneer_inventory_items_view_modal.aggregate(aggregate_stage);

  const totalCount = await veneer_inventory_items_view_modal.countDocuments({
    ...match_query,
  });

  const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: List_veneer_inventory_details,
    totalPage: totalPage,
    message: "Data fetched successfully",
  });
});

export const add_veneer_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { inventory_invoice_details, inventory_items_details } = req.body;
    const created_by = req.userDetails.id; //extract userid from req.userDetails
    const inward_sr_no = await veneer_inventory_invoice_model.aggregate([
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

    inventory_invoice_details.created_by = created_by;

    const add_invoice_details = await veneer_inventory_invoice_model.create(
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
      elm.created_by = created_by;
      return elm;
    });

    const add_items_details = await veneer_inventory_items_model.insertMany(
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
    return res.status(201).json(
      new ApiResponse(StatusCodes.CREATED, "Inventory has added successfully", {
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

export const add_single_veneer_item_inventory = catchAsync(
  async (req, res, next) => {
    const item_details = req.body?.item_details;

    const invoice_id = item_details?.invoice_id;

    if (!invoice_id || !mongoose.isValidObjectId(invoice_id)) {
      return next(new ApiError("Please provide valid invoice id", 400));
    }

    const add_item_details = await veneer_inventory_items_model.create({
      ...item_details,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          StatusCodes.CREATED,
          "Inventory has added successfully",
          add_item_details
        )
      );
  }
);

export const edit_veneer_item_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const invoice_id = req.params?.invoice_id;
      const items_details = req.body?.inventory_items_details;
      const invoice_details = req.body?.inventory_invoice_details;

      const update_invoice_details =
        await veneer_inventory_invoice_model.updateOne(
          { _id: invoice_id },
          {
            $set: {
              ...invoice_details,
            },
          },
          { session }
        );

      console.log(update_invoice_details);

      if (
        !update_invoice_details.acknowledged ||
        update_invoice_details.modifiedCount <= 0
      )
        return next(new ApiError("Failed to update invoice", 400));

      const all_invoice_items = await veneer_inventory_items_model.deleteMany(
        { invoice_id: invoice_id },
        { session }
      );

      if (
        !all_invoice_items.acknowledged ||
        all_invoice_items.deletedCount <= 0
      )
        return next(new ApiError("Failed to update invoice items", 400));

      const update_item_details = await veneer_inventory_items_model.insertMany(
        [...items_details],
        { session }
      );

      await session.commitTransaction();
      session.endSession();
      return res
        .status(StatusCodes.OK)
        .json(
          new ApiResponse(
            StatusCodes.OK,
            "Inventory item updated successfully",
            update_item_details
          )
        );
    } catch (error) {
      console.log(error);
      await session.abortTransaction();
      session.endSession();
      return next(error);
    }
  }
);

export const edit_veneer_item_inventory = catchAsync(async (req, res, next) => {
  const item_id = req.params?.item_id;
  const item_details = req.body?.item_details;

  const update_item_details = await veneer_inventory_items_model.updateOne(
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

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Inventory item  updated successfully",
        update_item_details
      )
    );
});

export const edit_veneer_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params?.invoice_id;
    const invoice_details = req.body?.invoice_details;

    const update_voice_details = await veneer_inventory_invoice_model.updateOne(
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

    return res
      .status(200)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          "Inventory invoice has updated successfully",
          update_voice_details
        )
      );
  }
);

export const item_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no = await veneer_inventory_items_model.distinct("item_sr_no");
  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: item_sr_no,
    message: "Item Sr No Dropdown fetched successfully",
  });
});

export const inward_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no = await veneer_inventory_invoice_model.distinct(
    "inward_sr_no"
  );
  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: item_sr_no,
    message: "Inward Sr No Dropdown fetched successfully",
  });
});

export const veneer_item_listing_by_invoice = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params.invoice_id;

    const aggregate_stage = [
      {
        $match: {
          "veneer_invoice_details._id": new mongoose.Types.ObjectId(invoice_id),
        },
      },
      {
        $sort: {
          item_sr_no: 1,
        },
      },
      {
        $project: {
          veneer_invoice_details: 0,
        },
      },
    ];

    const single_invoice_list_veneer_inventory_details =
      await veneer_inventory_items_view_modal.aggregate(aggregate_stage);

    // const totalCount = await veneer_inventory_items_view_modal.countDocuments({
    //   ...match_query,
    // });

    // const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: "success",
      data: single_invoice_list_veneer_inventory_details,
      // totalPage: totalPage,
      message: "Data fetched successfully",
    });
  }
);

export const veneerLogsCsv = catchAsync(async (req, res) => {
  console.log("442");
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
  console.log("479");
  const allData = await veneer_inventory_items_view_modal.find(match_query);

  if (allData.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(new ApiResponse(StatusCodes.NOT_FOUND, "NO Data found..."));
  }
  const excelLink = await createVeneerLogsExcel(allData);
  console.log("link => ", excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, "Csv downloaded successfully...", excelLink)
  );
});
