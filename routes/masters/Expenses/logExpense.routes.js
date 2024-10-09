import express from "express";
import { log_invoice_listing, log_item_listing_by_invoice } from "../../../controllers/inventory/log/log.controller.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
const logExpenseRouter = express.Router();

logExpenseRouter.post(
    "/log-expense-invoice-listing",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    log_invoice_listing
);

logExpenseRouter.get(
    "/log-expense-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    log_item_listing_by_invoice
);

export default logExpenseRouter;