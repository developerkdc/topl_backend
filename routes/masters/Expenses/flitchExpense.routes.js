import express from "express";
import { add_flitchExpenses, flitchExpenses_invoice_listing, flitchExpenses_item_listing_by_invoice } from "../../../controllers/masters/Expenses/flitchExpenses/flitchExpenses.controller.js";
import RolesPermissions from "../../../middlewares/permission.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
const flitchExpenseRouter = express.Router();

flitchExpenseRouter.post(
    "/flitch-expense-invoice-listing",
    AuthMiddleware,
    RolesPermissions("expense_master", "view"),
    flitchExpenses_invoice_listing
);

flitchExpenseRouter.get(
    "/flitch-expense-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    flitchExpenses_item_listing_by_invoice
);

flitchExpenseRouter.patch(
    "/add-flitch-expenses/:invoice_id",
    AuthMiddleware,
    RolesPermissions("expense_master", "edit"),
    add_flitchExpenses
);

export default flitchExpenseRouter;