import mongoose from "mongoose";
import {
  core_inventory_invoice_details,
  core_inventory_items_details,
} from "../../../database/schema/inventory/core/core.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";

export const listing_core_inventory = catchAsync(async (req, res, next) => {});

export const add_core_inventory = catchAsync(async (req, res, next) => {});

export const edit_core_inventory = catchAsync(async (req, res, next) => {});
