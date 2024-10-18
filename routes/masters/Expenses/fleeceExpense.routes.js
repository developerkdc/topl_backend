import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { add_fleeceExpenses, fleeceExpenses_invoice_listing, fleeceExpenses_item_listing_by_invoice } from "../../../controllers/masters/Expenses/fleeceExpenses/fleeceExpenses.controller.js";
const fleeceExpenseRouter = express.Router();

fleeceExpenseRouter.post(
    "/fleece-expense-invoice-listing",
    AuthMiddleware,
    RolesPermissions("expense_master", "view"),
    fleeceExpenses_invoice_listing
);

fleeceExpenseRouter.get(
    "/fleece-expense-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    fleeceExpenses_item_listing_by_invoice
);

fleeceExpenseRouter.patch(
    "/add-fleece-expenses/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    add_fleeceExpenses
);

export default fleeceExpenseRouter;