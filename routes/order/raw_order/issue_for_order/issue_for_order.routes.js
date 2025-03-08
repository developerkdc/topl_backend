import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import { add_issue_for_order } from '../../../../controllers/order/raw_order/issue_for_order/log_inventory/issue_for_order.controller.js';
import log_inventory_order_router from './log_inventory/issue_log_inventory_item_order.routes.js';
import flitch_inventory_order_router from './flitch_inventory/issue_flitch_inventory_item_order.routes.js';

const issue_for_raw_order_router = Router();

issue_for_raw_order_router.use(
  '/issue-raw-log-order',
  log_inventory_order_router
);
issue_for_raw_order_router.use(
  '/issue-raw-flitch-order',
  flitch_inventory_order_router
);

export default issue_for_raw_order_router;
