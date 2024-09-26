import mongoose from "mongoose";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { issues_for_crosscutting_model } from "../../../database/schema/factory/crossCutting/issuedForCutting.schema.js";
import { crosscutting_done_model } from "../../../database/schema/factory/crossCutting/crosscutting.schema.js";
import { StatusCodes } from "../../../utils/constants.js";

export const listing_cross_cutting_inventory = catchAsync(async (req, res, next) => {

});

export const add_cross_cutting_inventory = catchAsync(async (req, res, next) => {
  const issued_crosscutting_id = req.params?.issued_crosscutting_id;
  const crosscutting_details = req.body

  const issues_for_crosscutting_data = await issues_for_crosscutting_model.findOne({ _id: issued_crosscutting_id });
  if (!issues_for_crosscutting_data) return next(new ApiError("Invalid Issued crosscutting Id", 400));

  const crossCuttingLatestCode = await crosscutting_done_model.aggregate([
    {
      $match: {
        issue_for_croscutting_id: new mongoose.Types.ObjectId(issued_crosscutting_id)
      }
    },
    {
      $sort: {
        code: -1
      }
    },
    {
      $project: {
        code: 1,
        issued_crosscutting_id: 1
      }
    }
  ]);

  const crosscuttingCode = crossCuttingLatestCode?.[0]?.code
  let newCode = 'A'
  let newLogCode = `${issues_for_crosscutting_data?.log_no}${newCode}`;
  if (crosscuttingCode) {
    let asciiCode = crosscuttingCode?.charCodeAt(crosscuttingCode?.length - 1);
    asciiCode += 1;
    newCode = String.fromCharCode(asciiCode);
    newLogCode = `${issues_for_crosscutting_data?.log_no}${newCode}`
  }
  console.log(newCode,newLogCode)

  const addCrosscutting = await crosscutting_done_model.create({
    ...crosscutting_details,
    // crosscut_date:new Date(crosscutting_details?.crosscut_date),
    code: newCode,
    log_no_code: newLogCode,
    issue_for_croscutting_id: issued_crosscutting_id,
    log_no: issues_for_crosscutting_data?.log_no
  });

  return res.status(201).json(
    new ApiResponse(StatusCodes.CREATED, "Crosscutting done successfully", {
      addCrosscutting
    })
  );

});

export const edit_cross_cutting_inventory = catchAsync(async (req, res, next) => {

});
