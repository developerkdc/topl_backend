import mongoose from "mongoose";
import { createLogLogsExcel } from "../../../config/downloadExcel/Logs/Inventory/log/log.js";
import {
  fleece_inventory_invoice_modal,
  fleece_inventory_items_modal,
  fleece_inventory_items_view_modal,
} from "../../../database/schema/inventory/fleece/fleece.schema.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { StatusCodes } from "../../../utils/constants.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { createFleeceLogsExcel } from "../../../config/downloadExcel/Logs/Inventory/fleece/fleece.js";
import { fleece_approval_inventory_invoice_model, fleece_approval_inventory_items_model } from "../../../database/schema/inventory/fleece/fleeceApproval.schema.js";

export const listing_fleece_inventory = catchAsync(async (req, res, next) => {
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

  const List_fleece_inventory_details =
    await fleece_inventory_items_view_modal.aggregate(aggregate_stage);

  const totalCount = await fleece_inventory_items_view_modal.countDocuments({
    ...match_query,
  });

  const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: List_fleece_inventory_details,
    totalPage: totalPage,
    message: "Data fetched successfully",
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
          latest_inward_sr_no: { $max: "$inward_sr_no" },
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
      return next(new ApiError("Failed to add invoice", 400));
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

export const add_single_fleece_item_inventory = catchAsync(
  async (req, res, next) => {
    const item_details = req.body?.item_details;

    const invoice_id = item_details?.invoice_id;

    if (!invoice_id || !mongoose.isValidObjectId(invoice_id)) {
      return next(new ApiError("Please provide valid invoice id", 400));
    }

    const add_item_details = await fleece_inventory_items_modal.create({
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

      if (!sendForApproval) {
        const update_invoice_details =
          await fleece_inventory_invoice_modal.updateOne(
            { _id: invoice_id },
            {
              $set: {
                ...invoice_details,
              },
            },
            { session }
          );
  
        if (
          !update_invoice_details.acknowledged ||
          update_invoice_details.modifiedCount <= 0
        )
          return next(new ApiError("Failed to update invoice", 400));
  
        const all_invoice_items = await fleece_inventory_items_modal.deleteMany(
          { invoice_id: invoice_id },
          { session }
        );
  
        if (
          !all_invoice_items.acknowledged ||
          all_invoice_items.deletedCount <= 0
        )
          return next(new ApiError("Failed to update invoice items", 400));
  
        const update_item_details = await fleece_inventory_items_modal.insertMany(
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
      }else{
        const edited_by = user?.id;
        const approval_person = user.approver_id;
        const { _id, ...invoiceDetailsData } = invoice_details;

        const add_invoice_details = await fleece_approval_inventory_invoice_model.create([{
          ...invoiceDetailsData,
          invoice_id: invoice_id,
          approval_status: {
            sendForApproval: {
              status: true,
              remark: "Approval Pending"
            },
            approved: {
              status: false,
              remark: null
            },
            rejected: {
              status: false,
              remark: null
            }
          },
          approval: {
            editedBy: edited_by,
            approvalPerson: approval_person,
          }
        }], { session });

        if (!add_invoice_details?.[0])
          return next(new ApiError("Failed to add invoice approval", 400));

        await fleece_inventory_invoice_modal.updateOne(
          { _id: invoice_id },
          {
            $set: {
              approval_status: {
                sendForApproval: {
                  status: true,
                  remark: "Approval Pending"
                },
                approved: {
                  status: false,
                  remark: null
                },
                rejected: {
                  status: false,
                  remark: null
                }
              }
            },
          },
          { session }
        );

        const itemDetailsData = items_details.map((ele) => {
          const { _id, ...itemData } = ele;
          return {
            ...itemData,
            fleece_item_id: _id ? _id : new mongoose.Types.ObjectId(),
            approval_invoice_id: add_invoice_details[0]?._id
          }
        })

        const add_approval_item_details = await fleece_approval_inventory_items_model.insertMany(
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
              "Inventory item send for approval successfully",
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

export const fleeceCsv = catchAsync(async (req, res) => {
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

  const allData = await fleece_inventory_items_view_modal.find(match_query);

  const excelLink = await createLogLogsExcel(allData);
  console.log("link => ", excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, "Csv downloaded successfully...", excelLink)
  );
});

export const item_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no = await fleece_inventory_items_modal.distinct("item_sr_no");
  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: item_sr_no,
    message: "Item Sr No Dropdown fetched successfully",
  });
});

export const inward_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no = await fleece_inventory_invoice_modal.distinct(
    "inward_sr_no"
  );
  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: item_sr_no,
    message: "Inward Sr No Dropdown fetched successfully",
  });
});

export const fleece_item_listing_by_invoice = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params.invoice_id;

    const aggregate_stage = [
      {
        $match: {
          "fleece_invoice_details._id": new mongoose.Types.ObjectId(invoice_id),
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
      status: "success",
      data: single_invoice_List_fleece_inventory_details,
      // totalPage: totalPage,
      message: "Data fetched successfully",
    });
  }
);

export const fleeceLogsCsv = catchAsync(async (req, res) => {
  console.log("called");
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

  const allData = await fleece_inventory_items_view_modal.find(match_query);

  const excelLink = await createFleeceLogsExcel(allData);
  console.log("link => ", excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, "Csv downloaded successfully...", excelLink)
  );
});
