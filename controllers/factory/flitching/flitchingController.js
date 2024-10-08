import mongoose from "mongoose";
import { issues_for_flitching_model, issues_for_flitching_view_model } from "../../../database/schema/factory/flitching/issuedForFlitching.schema.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { log_inventory_invoice_model, log_inventory_items_model } from "../../../database/schema/inventory/log/log.schema.js";
import { issues_for_status } from "../../../database/Utils/constants/constants.js";
import { StatusCodes } from "../../../utils/constants.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/errors/apiError.js";
import { issues_for_crosscutting_model } from "../../../database/schema/factory/crossCutting/issuedForCutting.schema.js";

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
    if (issue_for_flitching?.available_quantity?.physical_length !== issue_for_flitching?.physical_length) return next(new ApiError("Cannot revert because original length is not matched", 400));

    const update_log_item_status = await log_inventory_items_model.updateOne(
      { _id: issue_for_flitching?.log_inventory_item_id },
      {
        $set: {
          issue_status: issues_for_status.log,
        },
      },
      { session }
    );

    if (!update_log_item_status.acknowledged || update_log_item_status.modifiedCount <= 0) return next(new ApiError("unable to update status", 400));

    const deleted_issues_for_flitching =
      await issues_for_flitching_model.deleteOne(
        {
          _id: issue_for_flitching?._id,
        },
        { session }
      );

    if (!deleted_issues_for_flitching?.acknowledged || deleted_issues_for_flitching?.deletedCount <= 0) return next(new ApiError("Unable to revert issue for flitching", 400));

    const issue_for_crosscutting_flitching_log_invoice_found = await issues_for_flitching_model.find({
      _id: { $ne: issue_for_flitching_id },
      invoice_id: issue_for_flitching?.invoice_id,
    });
    const issue_for_crosscutting_log_invoice_found = await issues_for_crosscutting_model.find({
      invoice_id: issue_for_flitching?.invoice_id,
    });

    if (issue_for_crosscutting_log_invoice_found?.length <= 0 && issue_for_crosscutting_flitching_log_invoice_found?.length <= 0) {
      await log_inventory_invoice_model.updateOne({ _id: issue_for_flitching?.invoice_id }, {
        $set: {
          isEditable: true
        }
      }, { session })
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

export const add_flitching_inventory = catchAsync(async (req, res, next) => { });

export const edit_flitching_inventory = catchAsync(
  async (req, res, next) => { }
);
