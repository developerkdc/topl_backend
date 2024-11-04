import mongoose from "mongoose";
import { flitching_done_model } from "../../../database/schema/factory/flitching/flitching.schema.js";
import { flitching_approval_model } from "../../../database/schema/factory/flitching/flitchingApproval.schema.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js";

export const flitching_approval_listing = catchAsync(async function (
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
    await flitching_approval_model.aggregate(aggregate_stage);

  const totalCount = await flitching_approval_model.countDocuments({
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

export const flitching_approval_item_listing_by_unique_id = catchAsync(
  async (req, res, next) => {
    // const invoice_id = req.params.invoice_id;
    const unique_identifier_id = req.params._id;

    const aggregate_stage = [
      {
        $match: {
          unique_identifier: new mongoose.Types.ObjectId(unique_identifier_id),
          // "invoice_id": new mongoose.Types.ObjectId(invoice_id),
        },
      },
      {
        $sort: {
          code: 1,
        },
      },
    ];

    const crosscut_item_by_issue_for_crosscutting_id =
      await flitching_approval_model.aggregate(aggregate_stage);
    // const logExpense_invoice =
    //   await log_approval_inventory_invoice_model.findOne({
    //     _id: document_id,
    //     invoice_id: invoice_id,
    //   });

    // const totalCount = await log_inventory_items_view_model.countDocuments({
    //   ...match_query,
    // });

    // const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: "success",
      data: crosscut_item_by_issue_for_crosscutting_id,
      // totalPage: totalPage,
      message: "Data fetched successfully",
    });
  }
);

export const flitching_approve = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const unique_identifier_id = req.params._id; //_id for finding all time in approval collection
    const issue_for_crosscutting_id = req.params.issued_for_cutting_id;
    const user = req.userDetails;

    const items_details = await flitching_approval_model
      .find({
        unique_identifier: unique_identifier_id,
        "approval.approvalPerson": user._id,
        //   invoice_id: invoice_id,
      })
      .lean();
    if (items_details?.length <= 0)
      return next(new ApiError("No invoice items found for approval", 404));

    // update all item's approval status which are approved in approval collection
    const invoice_details = await flitching_approval_model
      .updateMany(
        {
          unique_identifier: unique_identifier_id,
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
    if (!invoice_details)
      return next(new ApiError("No invoice found for approval", 404));

    // update the approval data in actual crossdone collection
    await flitching_approval_model.aggregate([
      {
        $match: {
          unique_identifier: new mongoose.Types.ObjectId(unique_identifier_id),
        },
      },
      {
        $set: {
          _id: "$log_flitching_done_id",
        },
      },
      {
        $unset: ["log_flitching_done_id"],
      },
      {
        $merge: {
          into: "flitching",
          whenMatched: "merge",
        },
      },
    ]);

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

export const flitching_reject = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // const invoiceId = req.params?.invoice_id;
    const unique_identifier_id = req.params._id;
    const issue_for_crosscutting_id = req.params.issued_for_cutting_id;
    const remark = req.body?.remark;
    const user = req.userDetails;

    const invoice_details = await flitching_approval_model
      .updateMany(
        {
          unique_identifier: unique_identifier_id,
          //   invoice_id: invoiceId,
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
    if (!invoice_details)
      return next(new ApiError("No invoice found for approval", 404));

    const update_log_invoice = await flitching_done_model.updateMany(
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
      !update_log_invoice.acknowledged ||
      update_log_invoice.modifiedCount <= 0
    )
      return next(new ApiError("Failed to reject invoice"), 400);

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
