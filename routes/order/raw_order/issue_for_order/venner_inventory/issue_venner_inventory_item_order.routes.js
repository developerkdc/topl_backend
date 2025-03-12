import { Router } from 'express';
import AuthMiddleware from '../../../../../middlewares/verifyToken.js';
import { add_issue_for_order } from '../../../../../controllers/order/raw_order/issue_for_order/veneer_inventory/issue_for_order.controller.js';

const venner_inventory_order_router = Router();

venner_inventory_order_router.post(
  '/issue-order',
  AuthMiddleware,
  add_issue_for_order
);
// venner_inventory_order_router.post("/revert-order/:id", AuthMiddleware, revert_issued_item_by_id)
export default venner_inventory_order_router;
