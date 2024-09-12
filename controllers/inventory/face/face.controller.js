import mongoose from "mongoose";
import {
  face_inventory_invoice_details,
  face_inventory_items_details,
} from "../../../database/schema/inventory/face/face.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import ApiError from "../../../utils/errors/apiError.js";
import ApiResponse from "../../../utils/ApiResponse.js";

export const listing_face_inventory = catchAsync(async (req, res, next) => {});

export const add_face_inventory = catchAsync(async (req, res, next) => {});

export const edit_face_inventory = catchAsync(async (req, res, next) => {});
