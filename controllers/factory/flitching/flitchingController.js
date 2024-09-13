import mongoose from "mongoose";
import { flitchingModel } from "../../../database/schema/factory/flitching/flitching.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";

export const listing_flitching_inventory = catchAsync(
  async (req, res, next) => {}
);

export const add_flitching_inventory = catchAsync(async (req, res, next) => {});

export const edit_flitching_inventory = catchAsync(
  async (req, res, next) => {}
);
