import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import {
  add_faceExpenses,
  faceExpenses_invoice_listing,
  faceExpenses_item_listing_by_invoice,
} from '../../../controllers/masters/Expenses/faceExpenses/faceExpenses.controller.js';
const faceExpenseRouter = express.Router();

faceExpenseRouter.post(
  '/face-expense-invoice-listing',
  AuthMiddleware,
  RolesPermissions('expense_master', 'view'),
  faceExpenses_invoice_listing
);

faceExpenseRouter.get(
  '/face-expense-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  // RolesPermissions("expense_master", "edit"),
  faceExpenses_item_listing_by_invoice
);

faceExpenseRouter.patch(
  '/add-face-expenses/:invoice_id',
  AuthMiddleware,
  // RolesPermissions("expense_master", "edit"),
  add_faceExpenses
);

export default faceExpenseRouter;
