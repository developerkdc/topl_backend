import mongoose from "mongoose";
import {
  log_inventory_invoice_model,
  log_inventory_items_model,
  log_inventory_items_view_model,
} from "../../../database/schema/inventory/log/log.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { StatusCodes } from "../../../utils/constants.js";
import { createMdfLogsExcel } from "../../../config/downloadExcel/Logs/Inventory/mdf/mdf.js";
import { createLogLogsExcel } from "../../../config/downloadExcel/Logs/Inventory/log/log.js";
import { issues_for_crosscutting_model } from "../../../database/schema/factory/crossCutting/issuedForCutting.schema.js";
import { issues_for_status } from "../../../database/Utils/constants/constants.js";
import { issues_for_flitching_model } from "../../../database/schema/factory/flitching/issuedForFlitching.schema.js";
import { log_approval_inventory_invoice_model, log_approval_inventory_items_model } from "../../../database/schema/inventory/log/logApproval.schema.js";

export const listing_log_inventory = catchAsync(async (req, res, next) => {
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

  const List_log_inventory_details =
    await log_inventory_items_view_model.aggregate(aggregate_stage);

  const totalCount = await log_inventory_items_view_model.countDocuments({
    ...match_query,
  });

  const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: List_log_inventory_details,
    totalPage: totalPage,
    message: "Data fetched successfully",
  });
});

export const add_log_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { inventory_invoice_details, inventory_items_details } = req.body;
    const created_by = req.userDetails.id; //extract userid from req.userDetails
    const inward_sr_no = await log_inventory_invoice_model.aggregate([
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

    const add_invoice_details = await log_inventory_invoice_model.create(
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

    const add_items_details = await log_inventory_items_model.insertMany(
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

export const add_single_log_item_inventory = catchAsync(
  async (req, res, next) => {
    const item_details = req.body?.item_details;

    const invoice_id = item_details?.invoice_id;

    if (!invoice_id || !mongoose.isValidObjectId(invoice_id)) {
      return next(new ApiError("Please provide valid invoice id", 400));
    }

    const add_item_details = await log_inventory_items_model.create({
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

export const edit_log_item_inventory = catchAsync(async (req, res, next) => {
  const item_id = req.params?.item_id;
  const item_details = req.body?.item_details;

  const update_item_details = await log_inventory_items_model.updateOne(
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

export const edit_log_item_invoice_inventory = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const invoice_id = req.params?.invoice_id;
      const items_details = req.body?.inventory_items_details;
      const invoice_details = req.body?.inventory_invoice_details;
      const sendForApproval = req.sendForApproval;
      const user = req.userDetails;

      const fetchInvoiceData = await log_inventory_invoice_model.findOne({_id:invoice_details});
      if(fetchInvoiceData.approval_status?.sendForApproval?.status) return next(new ApiError("Already send for approval"));

      if (!sendForApproval) {
        const update_invoice_details =
          await log_inventory_invoice_model.updateOne(
            { _id: invoice_id },
            {
              $set: {
                ...invoice_details,
                approval_status: {
                  sendForApproval: {
                    status: false,
                    remark: null
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
              },
            },
            { session }
          );

        if (
          !update_invoice_details.acknowledged ||
          update_invoice_details.modifiedCount <= 0
        )
          return next(new ApiError("Failed to update invoice", 400));

        const all_invoice_items = await log_inventory_items_model.deleteMany(
          { invoice_id: invoice_id },
          { session }
        );

        if (
          !all_invoice_items.acknowledged ||
          all_invoice_items.deletedCount <= 0
        )
          return next(new ApiError("Failed to update invoice items", 400));

        const update_item_details = await log_inventory_items_model.insertMany(
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

      } else {
        const edited_by = user?.id;
        const approval_person = user.approver_id;
        const { _id, createdAt, updatedAt, ...invoiceDetailsData } = invoice_details;

        const add_invoice_details = await log_approval_inventory_invoice_model.create([{
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

        await log_inventory_invoice_model.updateOne(
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
              },
            },
          },
          { session }
        );

        const itemDetailsData = items_details.map((ele) => {
          const { _id, createdAt, updatedAt, ...itemData } = ele;
          return {
            ...itemData,
            log_item_id: _id ? _id : new mongoose.Types.ObjectId(),
            approval_invoice_id: add_invoice_details[0]?._id
          }
        })

        const add_approval_item_details = await log_approval_inventory_items_model.insertMany(
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

export const edit_log_invoice_inventory = catchAsync(async (req, res, next) => {
  const invoice_id = req.params?.invoice_id;
  const invoice_details = req.body?.invoice_details;

  const update_voice_details = await log_inventory_invoice_model.updateOne(
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
});

export const logLogsCsv = catchAsync(async (req, res) => {
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

  const allData = await log_inventory_items_view_model.find(match_query);

  const excelLink = await createLogLogsExcel(allData);
  console.log("link => ", excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, "Csv downloaded successfully...", excelLink)
  );
});

export const item_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no = await log_inventory_items_model.distinct("item_sr_no");
  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: item_sr_no,
    message: "Item Sr No Dropdown fetched successfully",
  });
});

export const inward_sr_no_dropdown = catchAsync(async (req, res, next) => {
  const item_sr_no = await log_inventory_invoice_model.distinct("inward_sr_no");
  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: item_sr_no,
    message: "Inward Sr No Dropdown fetched successfully",
  });
});

export const log_invoice_listing = catchAsync(async function (req, res, next) {
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

  const List_log_invoice_details =
    await log_inventory_invoice_model.aggregate(aggregate_stage);

  const totalCount = await log_inventory_invoice_model.countDocuments({
    ...match_query,
  });

  const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: List_log_invoice_details,
    totalPage: totalPage,
    message: "Data fetched successfully",
  });
})

export const log_item_listing_by_invoice = catchAsync(
  async (req, res, next) => {
    const invoice_id = req.params.invoice_id;

    const aggregate_stage = [
      {
        $match: {
          "log_invoice_details._id": new mongoose.Types.ObjectId(invoice_id),
        },
      },
      {
        $sort: {
          item_sr_no: 1,
        },
      },
      {
        $project: {
          log_invoice_details: 0,
        },
      },
    ];

    const single_invoice_list_log_inventory_details =
      await log_inventory_items_view_model.aggregate(aggregate_stage);

    // const totalCount = await log_inventory_items_view_model.countDocuments({
    //   ...match_query,
    // });

    // const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: "success",
      data: single_invoice_list_log_inventory_details,
      // totalPage: totalPage,
      message: "Data fetched successfully",
    });
  }
);

export const add_issue_for_crosscutting = catchAsync(async (req, res, next) => {
  const log_items_ids = req.body?.log_items_ids;
  if (!Array.isArray(log_items_ids))
    return next(new ApiError("log items id must be a array", 400));
  const created_by = req.userDetails.id; //extract userid from req.userDetails

  const log_items_ids_set = new Set(log_items_ids);
  const update_log_items_status = await log_inventory_items_model.updateMany(
    { _id: { $in: [...log_items_ids_set] } },
    {
      $set: {
        issue_status: issues_for_status.crosscutting,
      },
    }
  );

  if (
    !update_log_items_status?.acknowledged &&
    update_log_items_status.modifiedCount <= 0
  )
    return next(new ApiError("Failed to update", 400));

  const log_issue_for_crosscutting_data = await log_inventory_items_model
    .find({
      _id: { $in: [...log_items_ids_set] },
      issue_status: issues_for_status.crosscutting,
    })
    .select({ created_by: 0, createdAt: 0, updatedAt: 0 })
    .lean();

  const issue_for_crosscutting = log_issue_for_crosscutting_data.map((ele) => {
    const { _id, ...data } = ele
    data.log_inventory_item_id = _id;
    data.created_by = created_by;
    return data;
  });

  const issue_for_crosscutting_data = await issues_for_crosscutting_model.insertMany(issue_for_crosscutting);

  const invoice_ids = log_issue_for_crosscutting_data.map((e) => e.invoice_id)

  const update_isEditable_invoice = await log_inventory_invoice_model.updateMany({ _id: { $in: invoice_ids } }, {
    $set: {
      isEditable: false,
    }
  })

  return res.status(200).json(
    new ApiResponse(
      StatusCodes.CREATED,
      "Issue for crosscutting done successfully",
      {
        issue_for_crosscutting_data,
      }
    )
  );
});

export const add_issue_for_flitching = catchAsync(async (req, res, next) => {
  const log_items_ids = req.body?.log_items_ids;
  if (!Array.isArray(log_items_ids))
    return next(new ApiError("log items id must be a array", 400));
  const created_by = req.userDetails.id; //extract userid from req.userDetails

  const log_items_ids_set = new Set(log_items_ids);
  const update_log_items_status = await log_inventory_items_model.updateMany(
    { _id: { $in: [...log_items_ids_set] } },
    {
      $set: {
        issue_status: issues_for_status.flitching,
      },
    }
  );

  if (
    !update_log_items_status?.acknowledged &&
    update_log_items_status.modifiedCount <= 0
  )
    return next(new ApiError("Failed to update", 400));

  const log_issue_for_flitching_data = await log_inventory_items_model
    .find({
      _id: { $in: [...log_items_ids_set] },
      issue_status: issues_for_status.flitching,
    })
    .select({ created_by: 0, createdAt: 0, updatedAt: 0 })
    .lean();

  const issue_for_flitching = log_issue_for_flitching_data.map((ele) => {
    const { _id, ...data } = ele
    // data.log_inventory_item_id = _id;
    // data.created_by = created_by;
    // return data;
    return {
      log_inventory_item_id: _id,
      item_sr_no: data?.item_sr_no,
      supplier_item_name: data?.supplier_item_name,
      supplier_log_no: data?.supplier_log_no,
      item_id: data?.item_id,
      item_name: data?.item_name,
      item_sub_category_id: data?.item_sub_category_id,
      item_sub_category_name: data?.item_sub_category_name,
      log_no: data?.log_no,
      log_formula: data?.log_formula,
      length: data?.physical_length,
      diameter: data?.physical_diameter,
      cmt: data?.physical_cmt,
      rate: data?.rate_in_inr,
      amount: data?.amount,
      amount_factor: data?.amount_factor,
      expense_amount: data?.expense_amount,
      remark: data?.remark,
      invoice_id: data?.invoice_id,
      created_by: created_by,
    }
  });

  const issue_for_flitching_data = await issues_for_flitching_model.insertMany(issue_for_flitching);

  const invoice_ids = log_issue_for_flitching_data.map((e) => e.invoice_id)

  const update_isEditable_invoice = await log_inventory_invoice_model.updateMany({ _id: { $in: invoice_ids } }, {
    $set: {
      isEditable: false,
    }
  })

  return res.status(200).json(
    new ApiResponse(
      StatusCodes.CREATED,
      "Issue for flitching done successfully",
      {
        issue_for_flitching_data,
      }
    )
  );
});

export const listing_log_history_inventory = catchAsync(async (req, res, next) => {
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
    issue_status: { $ne: issues_for_status?.log }
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

  const List_log_inventory_details =
    await log_inventory_items_view_model.aggregate(aggregate_stage);

  const totalCount = await log_inventory_items_view_model.countDocuments({
    ...match_query,
  });

  const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: List_log_inventory_details,
    totalPage: totalPage,
    message: "Data fetched successfully",
  });
});