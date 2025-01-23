import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import {
  add_otherGoodsExpenses,
  otherGoodsExpenses_invoice_listing,
  otherGoodsExpenses_item_listing_by_invoice,
} from '../../../controllers/masters/Expenses/otherGoodsExpenses/otherGoodsExpenses.controller.js';
const otherGoodsExpenseRouter = express.Router();

otherGoodsExpenseRouter.post(
  '/otherGoods-expense-invoice-listing',
  AuthMiddleware,
  RolesPermissions('expense_master', 'view'),
  otherGoodsExpenses_invoice_listing
);

otherGoodsExpenseRouter.get(
  '/otherGoods-expense-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  // RolesPermissions("expense_master", "edit"),
  otherGoodsExpenses_item_listing_by_invoice
);

otherGoodsExpenseRouter.patch(
  '/add-otherGoods-expenses/:invoice_id',
  AuthMiddleware,
  // RolesPermissions("expense_master", "edit"),
  add_otherGoodsExpenses
);

export default otherGoodsExpenseRouter;
