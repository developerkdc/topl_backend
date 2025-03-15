import { Router } from 'express';
import AuthMiddleware from '../../../../../middlewares/verifyToken.js';
import { add_issue_for_order } from '../../../../../controllers/order/raw_order/issue_for_order/other_goods_inventory/issue_for_order.controller.js'

const other_goods_inventory_order_router = Router();

other_goods_inventory_order_router.post(
  '/issue-order',
  AuthMiddleware,
  add_issue_for_order
);
export default other_goods_inventory_order_router;
