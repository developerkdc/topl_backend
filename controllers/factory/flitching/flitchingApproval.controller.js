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
      $lookup: {
        from: "users",
        localField: "approval.editedBy",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              user_name: 1
            }
          }
        ],
        as: "user"
      }
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true
      }
    },
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

  const List_flitching_details =
    await flitching_approval_model.aggregate(aggregate_stage);

  const totalCount = await flitching_approval_model.countDocuments({
    ...match_query,
  });

  const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: List_flitching_details,
    totalPage: totalPage,
    message: "Data fetched successfully",
  });
});

export const flitching_approval_item_listing_by_unique_id = catchAsync(
  async (req, res, next) => {
    const issue_for_flitching_id = req.params.issue_for_flitching_id;
    const unique_identifier_id = req.params._id;

    const isApprovalPending = req?.body?.isApprovalPending

    const aggregate_stage = [
      {
        $match: {
          unique_identifier: new mongoose.Types.ObjectId(unique_identifier_id),
          "issue_for_flitching_id": new mongoose.Types.ObjectId(issue_for_flitching_id),
        },
      },
      {
        $lookup: {
          from: "flitchings",
          localField: "flitching_done_id",
          foreignField: "_id",
          as: "previous_data"
        }
      },
      {
        $unwind: {
          path: "$previous_data",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: {
          code: 1,
        },
      },
    ];

    const flitching_approval_data = await flitching_approval_model.aggregate(aggregate_stage);

    return res.status(200).json({
      statusCode: 200,
      status: "success",
      data: {
        flitching_details: flitching_approval_data
      },
      message: "Data fetched successfully",
    });
  }
);

export const flitching_approve = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const unique_identifier_id = req.params._id; //_id for finding all time in approval collection
    const issue_for_flitching_id = req.params.issue_for_flitching_id;
    const user = req.userDetails;

    const items_details = await flitching_approval_model
      .find({
        unique_identifier: unique_identifier_id,
        issue_for_flitching_id: issue_for_flitching_id,
        "approval.approvalPerson": user._id,
      })
      .lean();
    if (items_details?.length <= 0)
      return next(new ApiError("No invoice items found for approval", 404));

    // update all item's approval status which are approved in approval collection
    const flitching_details = await flitching_approval_model
      .updateMany(
        {
          unique_identifier: unique_identifier_id,
          issue_for_flitching_id: issue_for_flitching_id,
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
    if (!flitching_details.acknowledged || flitching_details.modifiedCount <= 0)
      return next(new ApiError("Failed to approve data", 404));

    // update the approval data in actual collection

    await flitching_done_model.deleteMany({
      issue_for_flitching_id: new mongoose.Types.ObjectId(issue_for_flitching_id),
    }, { session });


    const approval_flitchingdone_items_data = await flitching_approval_model.aggregate([
      {
        $match: {
          unique_identifier: new mongoose.Types.ObjectId(unique_identifier_id),
          issue_for_flitching_id: new mongoose.Types.ObjectId(issue_for_flitching_id),
        },
      },
      {
        $set: {
          _id: "$flitching_done_id",
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
        $unset: ["flitching_done_id"],
      },
    ]);

    await flitching_done_model.insertMany(approval_flitchingdone_items_data, { session })

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
    const issue_for_flitching_id = req.params?.issue_for_flitching_id;
    const unique_identifier_id = req.params._id;
    const remark = req.body?.remark;
    const user = req.userDetails;

    const flitching_details = await flitching_approval_model
      .updateMany(
        {
          unique_identifier: unique_identifier_id,
          issue_for_flitching_id: issue_for_flitching_id,
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
    if (!flitching_details)
      return next(new ApiError("No Data found for approval", 404));

    const update_flitching_details = await flitching_done_model.updateMany(
      {
        issue_for_flitching_id: issue_for_flitching_id,
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
      !update_flitching_details.acknowledged ||
      update_flitching_details.modifiedCount <= 0
    )
      return next(new ApiError("Failed to reject invoice"), 400);

    await session.commitTransaction();
    session.endSession();
    return res.status(200).json({
      statusCode: 200,
      status: "success",
      message: "Rejected successfully",
    });
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});
