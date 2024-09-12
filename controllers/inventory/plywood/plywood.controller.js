import mongoose from "mongoose";
import {
  plywood_inventory_invoice_details,
  plywood_inventory_items_details,
} from "../../../database/schema/inventory/Plywood/plywood.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";

export const listing_plywood_inventory = catchAsync(
  async (req, res, next) => {}
);

export const add_plywood_inventory = catchAsync(async (req, res, next) => {});

export const edit_plywood_inventory = catchAsync(async (req, res, next) => {});
