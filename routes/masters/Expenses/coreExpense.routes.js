import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import {
  add_coreExpenses,
  coreExpenses_invoice_listing,
  coreExpenses_item_listing_by_invoice,
} from '../../../controllers/masters/Expenses/coreExpenses/coreExpenses.controller.js';
const coreExpenseRouter = express.Router();

coreExpenseRouter.post(
  '/core-expense-invoice-listing',
  AuthMiddleware,
  RolesPermissions('expense_master', 'view'),
  coreExpenses_invoice_listing
);

coreExpenseRouter.get(
  '/core-expense-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  // RolesPermissions("expense_master", "edit"),
  coreExpenses_item_listing_by_invoice
);

coreExpenseRouter.patch(
  '/add-core-expenses/:invoice_id',
  AuthMiddleware,
  // RolesPermissions("expense_master", "edit"),
  add_coreExpenses
);

export default coreExpenseRouter;
