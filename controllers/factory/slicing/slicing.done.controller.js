import { StatusCodes } from '../../../utils/constants.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';

import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import slicing_done_other_details_model from '../../../database/schema/factory/slicing/slicing_done.other.details.schema.js';

export const add_slicing_done_items = catchAsync(async (req, res, next) => {
  const { other_details } = req.body;
  const newData = await slicing_done_other_details_model.create(other_details);

  return res.json(
    new ApiResponse(StatusCodes.OK, 'Items added successfully..', newData)
  );
});
