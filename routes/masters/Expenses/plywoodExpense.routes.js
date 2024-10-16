import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { add_plywoodExpenses, plywoodExpenses_invoice_listing, plywoodExpenses_item_listing_by_invoice } from "../../../controllers/masters/Expenses/plywoodExpenses/plywoodExpenses.controller.js";
const plywoodExpenseRouter = express.Router();

plywoodExpenseRouter.post(
    "/plywood-expense-invoice-listing",
    AuthMiddleware,
    RolesPermissions("expense_master", "view"),
    plywoodExpenses_invoice_listing
);

plywoodExpenseRouter.get(
    "/plywood-expense-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    plywoodExpenses_item_listing_by_invoice
);

plywoodExpenseRouter.patch(
    "/add-plywood-expenses/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    add_plywoodExpenses
);

export default plywoodExpenseRouter;