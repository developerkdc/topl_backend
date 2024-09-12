import mongoose from "mongoose";
import {
  venner_inventory_invoice_details,
  venner_inventory_items_details,
} from "../../../database/schema/inventory/venner/venner.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";

export const listing_venner_inventory = catchAsync(
  async (req, res, next) => {}
);

export const add_venner_inventory = catchAsync(async (req, res, next) => {});

export const edit_venner_inventory = catchAsync(async (req, res, next) => {});
