import mongoose from "mongoose";
import { crosscutting_done_model } from "../../../database/schema/factory/crossCutting/crosscutting.schema.js";
import { crosscutting_done_approval_model } from "../../../database/schema/factory/crossCutting/crosscuttingApproval.schema.js";
import { issues_for_crosscutting_model } from "../../../database/schema/factory/crossCutting/issuedForCutting.schema.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js";

export const crossCuttting_approval_listing = catchAsync(async function (
  req,
  res,
  next
) {
  const {
    page = 1,
    limit = 10,
    sortBy = "code",
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
  const user = req.userDetails;

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
    "approval.approvalPerson": user?._id,
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
    await crosscutting_done_approval_model.aggregate(aggregate_stage);

  const totalCount = await crosscutting_done_approval_model.countDocuments({
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
});

export const crosscutting_approval_item_listing_by_unique_id = catchAsync(
  async (req, res, next) => {
    const issued_for_cutting_id = req.params.issued_for_cutting_id;
    const unique_identifier_id = req.params._id;

    const aggregate_stage = [
      {
        $match: {
          unique_identifier: new mongoose.Types.ObjectId(unique_identifier_id),
          issue_for_crosscutting_id: new mongoose.Types.ObjectId(issued_for_cutting_id),
        },
      },
      {
        $sort: {
          code: 1,
        },
      },
    ];

    const crosscutting_details = await crosscutting_done_approval_model.aggregate(aggregate_stage);

    return res.status(200).json({
      statusCode: 200,
      status: "success",
      data: {
        crosscutting_details: crosscutting_details
      },
      message: "Data fetched successfully",
    });
  }
);

export const crosscutting_approve = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const unique_identifier_id = req.params._id; //_id for finding all time in approval collection
    const issue_for_crosscutting_id = req.params.issued_for_cutting_id;
    const user = req.userDetails;

    const items_details = await crosscutting_done_approval_model
      .find({
        unique_identifier: unique_identifier_id,
        issue_for_crosscutting_id: issue_for_crosscutting_id,
        "approval.approvalPerson": user._id,
      })
      .lean();
    if (items_details?.length <= 0)
      return next(new ApiError("No items found for approval", 404));

    // update all item's approval status which are approved in approval collection
    const crosscutDone_details = await crosscutting_done_approval_model
      .updateMany(
        {
          unique_identifier: unique_identifier_id,
          issue_for_crosscutting_id: issue_for_crosscutting_id,
          "approval.approvalPerson": user._id,
        },
        {
          $set: {
            approval_status: {
              sendForApproval: {
                status: false,
                remark: null,
              },
              approved: {
                status: true,
                remark: null,
              },
              rejected: {
                status: false,
                remark: null,
              },
            },
            "approval.approvalBy.user": user._id,
          },
        },
        { session, new: true }
      )
      .lean();
    if (!crosscutDone_details.acknowledged || crosscutDone_details.modifiedCount <= 0)
      return next(new ApiError("Failed to approve data", 404));

    await crosscutting_done_model.deleteMany({
      issue_for_crosscutting_id: issue_for_crosscutting_id,
    }, { session });

    // update the approval data in actual crossdone collection
    const approval_crosscutDone_items_data = await crosscutting_done_approval_model.aggregate([
      {
        $match: {
          unique_identifier: new mongoose.Types.ObjectId(unique_identifier_id),
          issue_for_crosscutting_id: new mongoose.Types.ObjectId(issue_for_crosscutting_id),
        },
      },
      {
        $set: {
          _id: "$crosscutting_done_id",
          approval_status: {
            sendForApproval: {
              status: false,
              remark: null,
            },
            approved: {
              status: true,
              remark: null,
            },
            rejected: {
              status: false,
              remark: null,
            },
          }
        },
      },
      {
        $unset: ["crosscutting_done_id"],
      },
    ]);


    await crosscutting_done_model.insertMany(approval_crosscutDone_items_data, { session })

    // update the available qunatity data in isuue for crosscut collection
    const available_quantity = approval_crosscutDone_items_data?.[0]
    await issues_for_crosscutting_model.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(issue_for_crosscutting_id),
      },
      {
        $set: {
          "available_quantity.physical_cmt": available_quantity?.issue_for_crosscutting_data?.physical_cmt,
          "available_quantity.physical_length": available_quantity?.issue_for_crosscutting_data?.physical_length,
          "available_quantity.amount": available_quantity?.issue_for_crosscutting_data?.amount,
          "available_quantity.sqm_factor": available_quantity?.issue_for_crosscutting_data?.sqm_factor,
          "available_quantity.expense_amount": available_quantity?.issue_for_crosscutting_data?.expense_amount,
          crosscutting_completed: available_quantity?.issue_for_crosscutting_data?.crosscutting_completed,
          approval_status: {
            sendForApproval: {
              status: false,
              remark: null,
            },
            approved: {
              status: true,
              remark: null,
            },
            rejected: {
              status: false,
              remark: null,
            },
          }
        },
      },
      { session, new: true }
    );

    await session.commitTransaction();
    session.endSession();
    return res.status(200).json({
      statusCode: 200,
      status: "success",
      message: "Invoice has approved successfully",
    });
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});

export const crosscut_reject = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const unique_identifier_id = req.params._id;
    const issue_for_crosscutting_id = req.params.issued_for_cutting_id;
    const remark = req.body?.remark;
    const user = req.userDetails;

    const crosscutting_done_approval_details = await crosscutting_done_approval_model
      .updateMany(
        {
          unique_identifier: unique_identifier_id,
          issue_for_crosscutting_id: issue_for_crosscutting_id,
          "approval.approvalPerson": user._id,
        },
        {
          $set: {
            approval_status: {
              sendForApproval: {
                status: false,
                remark: null,
              },
              approved: {
                status: false,
                remark: null,
              },
              rejected: {
                status: true,
                remark: remark,
              },
            },
            "approval.rejectedBy.user": user._id,
          },
        },
        { session, new: true }
      )
      .lean();
    if (!crosscutting_done_approval_details.acknowledged || crosscutting_done_approval_details.modifiedCount <= 0)
      return next(new ApiError("No invoice found for approval", 404));

    const update_crosscutting_done = await crosscutting_done_model.updateMany(
      {
        issue_for_crosscutting_id: issue_for_crosscutting_id,
      },
      {
        $set: {
          approval_status: {
            sendForApproval: {
              status: false,
              remark: null,
            },
            approved: {
              status: false,
              remark: null,
            },
            rejected: {
              status: true,
              remark: remark,
            },
          },
        },
      },
      { session }
    );
    if (
      !update_crosscutting_done.acknowledged ||
      update_crosscutting_done.modifiedCount <= 0
    )
      return next(new ApiError("Failed to reject invoice"), 400);

    await issues_for_crosscutting_model.findByIdAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(issue_for_crosscutting_id),
      },
      {
        $set: {
          approval_status: {
            sendForApproval: {
              status: false,
              remark: null,
            },
            approved: {
              status: false,
              remark: null,
            },
            rejected: {
              status: true,
              remark: remark,
            },
          },
        },
      },
      { session, new: true }
    );

    await session.commitTransaction();
    session.endSession();
    return res.status(200).json({
      statusCode: 200,
      status: "success",
      message: "Invoice has rejected successfully",
    });
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});
