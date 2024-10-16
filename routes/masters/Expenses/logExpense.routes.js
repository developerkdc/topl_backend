import express from "express";
import { log_invoice_listing, log_item_listing_by_invoice } from "../../../controllers/inventory/log/log.controller.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { add_logExpenses, logExpenses_invoice_listing, logExpenses_item_listing_by_invoice } from "../../../controllers/masters/Expenses/logExpenses/logExpenses.controller.js";
const logExpenseRouter = express.Router();

logExpenseRouter.post(
    "/log-expense-invoice-listing",
    AuthMiddleware,
    RolesPermissions("expense_master", "view"),
    logExpenses_invoice_listing
);

logExpenseRouter.get(
    "/log-expense-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    logExpenses_item_listing_by_invoice
);

logExpenseRouter.patch(
    "/add-log-expenses/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    add_logExpenses
);

export default logExpenseRouter;