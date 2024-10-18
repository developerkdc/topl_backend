import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { add_mdfExpenses, mdfExpenses_invoice_listing, mdfExpenses_item_listing_by_invoice } from "../../../controllers/masters/Expenses/mdfExpenses/mdfExpenses.controller.js";
const mdfExpenseRouter = express.Router();

mdfExpenseRouter.post(
    "/mdf-expense-invoice-listing",
    AuthMiddleware,
    RolesPermissions("expense_master", "view"),
    mdfExpenses_invoice_listing
);

mdfExpenseRouter.get(
    "/mdf-expense-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    mdfExpenses_item_listing_by_invoice
);

mdfExpenseRouter.patch(
    "/add-mdf-expenses/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    add_mdfExpenses
);

export default mdfExpenseRouter;