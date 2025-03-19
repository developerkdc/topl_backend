import { Router } from 'express';
import AuthMiddleware from '../../../../../middlewares/verifyToken.js';
import { revert_issued_item_by_id } from '../../../../../controllers/order/raw_order/issue_for_order/flitch_inventory/issue_for_order.controller.js';
import { add_issue_for_order } from '../../../../../controllers/order/raw_order/issue_for_order/crosscutting_factory/issue_for_order.controller.js';

const crosscutting_factory_order_router = Router();

crosscutting_factory_order_router.post(
  '/issue-order',
  AuthMiddleware,
  add_issue_for_order
);
crosscutting_factory_order_router.post(
  '/revert-order/:id',
  AuthMiddleware,
  revert_issued_item_by_id
);
export default crosscutting_factory_order_router;
