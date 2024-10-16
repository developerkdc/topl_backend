import mongoose, { startSession } from "mongoose";
import {
  issues_for_flitching_model,
  issues_for_flitching_view_model,
} from "../../../database/schema/factory/flitching/issuedForFlitching.schema.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import {
  log_inventory_invoice_model,
  log_inventory_items_model,
} from "../../../database/schema/inventory/log/log.schema.js";
import { issues_for_status } from "../../../database/Utils/constants/constants.js";
import { StatusCodes } from "../../../utils/constants.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/errors/apiError.js";
import { issues_for_crosscutting_model } from "../../../database/schema/factory/crossCutting/issuedForCutting.schema.js";
import {
  flitching_done_model,
  flitching_view_modal,
} from "../../../database/schema/factory/flitching/flitching.schema.js";
import { createFlitchingDoneExcel } from "../../../config/downloadExcel/Logs/Factory/flitching/index.js";

export const listing_issue_for_flitching = catchAsync(
  async (req, res, next) => {
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
      flitching_completed: false,
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

    const issue_for_flitching_details =
      await issues_for_flitching_view_model.aggregate(aggregate_stage);

    const totalCount = await issues_for_flitching_view_model.countDocuments({
      ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: "success",
      data: issue_for_flitching_details,
      totalPage: totalPage,
      message: "Data fetched successfully",
    });
  }
);

export const revert_issue_for_flitching = catchAsync(async function (
  req,
  res,
  next
) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const issue_for_flitching_id = req.params?.issue_for_flitching_id;
    const issue_for_flitching = await issues_for_flitching_model.findOne({
      _id: issue_for_flitching_id,
    });

    if (!issue_for_flitching) return next(new ApiError("Item not found", 400));
    if (
      issue_for_flitching?.available_quantity?.physical_length !==
      issue_for_flitching?.physical_length
    )
      return next(
        new ApiError(
          "Cannot revert because original length is not matched",
          400
        )
      );

    const update_log_item_status = await log_inventory_items_model.updateOne(
      { _id: issue_for_flitching?.log_inventory_item_id },
      {
        $set: {
          issue_status: issues_for_status.log,
        },
      },
      { session }
    );

    if (
      !update_log_item_status.acknowledged ||
      update_log_item_status.modifiedCount <= 0
    )
      return next(new ApiError("unable to update status", 400));

    const deleted_issues_for_flitching =
      await issues_for_flitching_model.deleteOne(
        {
          _id: issue_for_flitching?._id,
        },
        { session }
      );

    if (
      !deleted_issues_for_flitching?.acknowledged ||
      deleted_issues_for_flitching?.deletedCount <= 0
    )
      return next(new ApiError("Unable to revert issue for flitching", 400));

    const issue_for_crosscutting_flitching_log_invoice_found =
      await issues_for_flitching_model.find({
        _id: { $ne: issue_for_flitching_id },
        invoice_id: issue_for_flitching?.invoice_id,
      });
    const issue_for_crosscutting_log_invoice_found =
      await issues_for_crosscutting_model.find({
        invoice_id: issue_for_flitching?.invoice_id,
      });

    if (
      issue_for_crosscutting_log_invoice_found?.length <= 0 &&
      issue_for_crosscutting_flitching_log_invoice_found?.length <= 0
    ) {
      await log_inventory_invoice_model.updateOne(
        { _id: issue_for_flitching?.invoice_id },
        {
          $set: {
            isEditable: true,
          },
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();
    return res
      .status(200)
      .json(new ApiResponse(StatusCodes.OK, "Reverted successfully"));
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});

export const add_flitching_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { newData, issuedFlitchId } = req.body;
    const { _id } = req.userDetails;
    // console.log("user details => ", _id)
    const updatedData = newData?.map((item) => {
      item.created_by = _id;
      return item;
    });

    const result = await flitching_done_model.insertMany(updatedData, {
      session,
    });

    if (result && result.length < 0) {
      return res.json(
        new ApiResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Err Inserting Flitching Done Items..."
        )
      );
    }
    const update_flitching_completed_status =
      await issues_for_flitching_model.findByIdAndUpdate(
        issuedFlitchId,
        {
          $set: {
            flitching_completed: true,
          },
        },
        { runValidators: true, new: true }
      );
    if (!update_flitching_completed_status) {
      return res.json(
        new ApiResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Unable to update flitching status..."
        )
      );
    }
    await session.commitTransaction();
    session.endSession();
    return res.json(
      new ApiResponse(StatusCodes.OK, "Item Added Successfully", result)
    );
  } catch (error) {
    throw new ApiError(error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

export const edit_flitching_inventory = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { newData } = req.body;

    const all_items = await flitching_done_model.deleteMany(
      { issue_for_flitching_id: id },
      { session }
    );

    if (!all_items.acknowledged || all_items.deletedCount <= 0) {
      return next(new ApiError("Failed to update invoice items", 400));
    }
    const { _id } = req.userDetails;
    const updatedData = newData?.map((item) => {
      item.created_by = _id;
      return item;
    });
    const update_item_details = await flitching_done_model.insertMany(
      updatedData,
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          "Inventory items updated successfully",
          update_item_details
        )
      );
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});
export const listing_flitching_done_inventory = catchAsync(
  async (req, res, next) => {
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

    const flitching_done_list = await flitching_view_modal.aggregate(
      aggregate_stage
    );

    const totalCount = await flitching_view_modal.countDocuments({
      ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);

    return res
      .status(200)
      .json(
        new ApiResponse(StatusCodes.OK, "Data fetched successfully...", {
          flitching_done_list,
          totalPage,
        })
      );
  }
);

export const log_no_dropdown = catchAsync(async (req, res, next) => {
  const log_no = await flitching_view_modal.distinct("log_no");
  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: log_no,
    message: "Log No Dropdown fetched successfully",
  });
});

export const fetch_all_flitchings_by_issue_for_flitching_id = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Issue for Flitching id is missing..."
      );
    }

    const pipeline = [
      {
        $match: {
          "issue_for_flitching_id": new mongoose.Types.ObjectId(id),
        },
      },
      {
        $sort: { log_no: 1 },
      },
    ];

    const allDetails = await flitching_view_modal.aggregate(pipeline);

    if (allDetails.length === 0) {
      return res.json(
        new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "No Data Found....")
      );
    }
    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        "All Flitchings fetched successfully....",
        allDetails
      )
    );
  }
);

export const revert_flitching_done_items = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id } = req.params;
      if (!id) {
        return res.json(new ApiResponse(StatusCodes.OK, "Id is missing..."));
      }

      const update_flitching_completed_status =
        await issues_for_flitching_model.findByIdAndUpdate(
          id,
          {
            $set: { flitching_completed: false },
          },
          { runValidators: true, new: true }
        );

      if (!update_flitching_completed_status) {
        return res.json(
          new ApiResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "Err Updating Status"
          )
        );
      }

      const deleteItems = await flitching_done_model.deleteMany(
        { issue_for_flitching_id: id },
        { session }
      );
      if (!deleteItems.acknowledged || deleteItems.deletedCount <= 0) {
        return res.json(
          new ApiResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            "Failed to delete Flitching Dobe Items",
            400
          )
        );
      }
      session.commitTransaction();
      return res.json(
        new ApiResponse(StatusCodes.OK, "All Items Reverted Successfully...")
      );
    } catch (error) {
      console.log(error);
      await session.abortTransaction();
      session.endSession();
      return next(error);
    }
  }
);




export const flitchingDoneExcel = catchAsync(async (req, res) => {
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

  const allData = await flitching_done_model.find(match_query);

  const excelLink = await createFlitchingDoneExcel(allData);
  console.log("link => ", excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, "Csv downloaded successfully...", excelLink)
  );
});
