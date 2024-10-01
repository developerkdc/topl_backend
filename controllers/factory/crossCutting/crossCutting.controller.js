import mongoose from "mongoose";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { issues_for_crosscutting_model } from "../../../database/schema/factory/crossCutting/issuedForCutting.schema.js";
import { crosscutting_done_model } from "../../../database/schema/factory/crossCutting/crosscutting.schema.js";
import { StatusCodes } from "../../../utils/constants.js";
import { log_inventory_items_model } from "../../../database/schema/inventory/log/log.schema.js";
import { issues_for_status } from "../../../database/Utils/constants/constants.js";

//Issue for crosscutting
export const revert_issue_for_crosscutting = catchAsync(async function (
  req,
  res,
  next
) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const issue_for_crosscutting_id = req.params?.issue_for_crosscutting_id;
    const issue_for_crosscutting = await issues_for_crosscutting_model.findOne({
      _id: issue_for_crosscutting_id,
    });
    if (!issue_for_crosscutting)
      return next(new ApiError("Item not found", 400));
    if (
      issue_for_crosscutting?.avaiable_quantity?.physical_length !==
      issue_for_crosscutting?.physical_length
    )
      return next(
        new ApiError(
          "Cannot revert because original length is not matched",
          400
        )
      );

    const deleted_issues_for_crosscutting =
      await issues_for_crosscutting_model.deleteOne(
        {
          _id: issue_for_crosscutting?._id,
        },
        { session }
      );

    if (
      !deleted_issues_for_crosscutting.acknowledged ||
      deleted_issues_for_crosscutting.deletedCount <= 0
    )
      return next(new ApiError("Unable to revert issue for crosscutting", 400));

    const update_log_item_status = await log_inventory_items_model.updateOne(
      { _id: issue_for_crosscutting_id },
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

//Crosscutting done
export const listing_cross_cutting_inventory = catchAsync(
  async (req, res, next) => {}
);

export const add_cross_cutting_inventory = catchAsync(
  async (req, res, next) => {
    // const session = await mongoose.startSession();
    // session.startTransaction();
    // try {
    const issued_crosscutting_id = req.params?.issued_crosscutting_id;
    const crosscutting_details = req.body?.crosscutting_done_details;
    const is_crosscutting_completed =
      req.body?.is_crosscutting_completed || false;

    const issues_for_crosscutting_data =
      await issues_for_crosscutting_model.findOne({
        _id: issued_crosscutting_id,
      });
    if (!issues_for_crosscutting_data)
      return next(new ApiError("Invalid Issued crosscutting Id", 400));

    const crossCuttingLatestCode = await crosscutting_done_model.aggregate([
      {
        $match: {
          issue_for_croscutting_id: new mongoose.Types.ObjectId(
            issued_crosscutting_id
          ),
        },
      },
      {
        $sort: {
          code: -1,
        },
      },
      {
        $project: {
          code: 1,
          issued_crosscutting_id: 1,
        },
      },
    ]);

    //Logic for autoincrement code
    const crosscuttingCode = crossCuttingLatestCode?.[0]?.code;
    let newCode = "A";
    let newLogCode = `${issues_for_crosscutting_data?.log_no}${newCode}`;
    let asciiCode = newCode?.charCodeAt();

    if (crosscuttingCode) {
      asciiCode = crosscuttingCode?.charCodeAt();
      asciiCode += 1;
      newCode = String.fromCharCode(asciiCode);
      newLogCode = `${issues_for_crosscutting_data?.log_no}${newCode}`;
    }

    let issued_crosscuting_avaiable_physical_length =
      issues_for_crosscutting_data?.avaiable_quantity?.physical_length;
    for (let crosscutting of crosscutting_details) {
      //Updating latest avaible physical length
      let crosscutting_done_length = crosscutting?.length;
      issued_crosscuting_avaiable_physical_length =
        issued_crosscuting_avaiable_physical_length - crosscutting_done_length;

      //Comparing avaible physical length should not be less then 0
      if (issued_crosscuting_avaiable_physical_length < 0)
        return next(new ApiError("Invaild input of length", 400));

      //insert crosscutting single item data
      const addCrosscutting = await crosscutting_done_model.create({
        ...crosscutting,
        // crosscut_date:new Date(crosscutting_details?.crosscut_date),
        code: newCode,
        log_no_code: newLogCode,
        issue_for_croscutting_id: issues_for_crosscutting_data?._id,
        log_inventory_item_id:
          issues_for_crosscutting_data?.log_inventory_item_id,
        log_no: issues_for_crosscutting_data?.log_no,
      });

      //update avaible quantity of issue for crosscutting
      await issues_for_crosscutting_model.updateOne(
        { _id: issued_crosscutting_id },
        {
          $set: {
            "avaiable_quantity.physical_length":
              issued_crosscuting_avaiable_physical_length,
            crosscutting_completed: is_crosscutting_completed,
          },
        }
      );

      asciiCode += 1;
      newCode = String.fromCharCode(asciiCode);
      newLogCode = `${issues_for_crosscutting_data?.log_no}${newCode}`;
    }

    //   await session.commitTransaction();
    //   session.endSession();
    return res
      .status(201)
      .json(
        new ApiResponse(StatusCodes.CREATED, "Crosscutting done successfully")
      );
    // } catch (error) {
    //   console.log(error);
    //   await session.abortTransaction();
    //   session.endSession();
    //   return next(error);
    // }
  }
);

export const edit_cross_cutting_inventory = catchAsync(
  async (req, res, next) => {}
);
