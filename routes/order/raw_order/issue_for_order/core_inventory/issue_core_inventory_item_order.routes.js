import { Router } from 'express';
import AuthMiddleware from '../../../../../middlewares/verifyToken.js';
import { revert_issued_item_by_id } from '../../../../../controllers/order/raw_order/issue_for_order/flitch_inventory/issue_for_order.controller.js';
import { add_issue_for_order } from '../../../../../controllers/order/raw_order/issue_for_order/core_inventory/issue_for_order.controller.js';

const core_inventory_order_router = Router();

core_inventory_order_router.post(
  '/issue-order',
  AuthMiddleware,
  add_issue_for_order
);
core_inventory_order_router.post(
  '/revert-order/:id',
  AuthMiddleware,
  revert_issued_item_by_id
);
export default core_inventory_order_router;
