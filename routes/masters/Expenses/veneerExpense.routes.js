import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { add_veneerExpenses, veneerExpenses_invoice_listing, veneerExpenses_item_listing_by_invoice } from "../../../controllers/masters/Expenses/veneerExpenses/veneerExpenses.controller.js";
const veneerExpenseRouter = express.Router();

veneerExpenseRouter.post(
    "/veneer-expense-invoice-listing",
    AuthMiddleware,
    RolesPermissions("expense_master", "view"),
    veneerExpenses_invoice_listing
);

veneerExpenseRouter.get(
    "/veneer-expense-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    // RolesPermissions("expense_master", "edit"),
    veneerExpenses_item_listing_by_invoice
);

veneerExpenseRouter.patch(
    "/add-veneer-expenses/:invoice_id",
    AuthMiddleware,
    // RolesPermissions("expense_master", "edit"),
    add_veneerExpenses
);

export default veneerExpenseRouter;