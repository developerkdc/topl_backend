import { log_inventory_items_view_model } from "../../../database/schema/inventory/log/log.schema.js";
import ApiError from "../../../utils/errors/apiError.js";
import { catchAsync } from "../../../utils/errors/catchAsync.js"
import { StatusCodes } from "../../../utils/constants.js"

export const addIssueForPeeling = catchAsync(async function (req, res, next) {
    const userDetails = req.userDetails;
    const { log_inventory_item_id } = req.params;

    const logInventoryItem = await log_inventory_items_view_model.findOne({ _id: log_inventory_item_id });

    if (!logInventoryItem) {
        return next(new ApiError("Log Inventory Item Not Found", StatusCodes.NOT_FOUND));
    }
    

}) 