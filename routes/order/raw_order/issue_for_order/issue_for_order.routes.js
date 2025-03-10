import { Router } from 'express';
import log_inventory_order_router from './log_inventory/issue_log_inventory_item_order.routes.js';
import flitch_inventory_order_router from './flitch_inventory/issue_flitch_inventory_item_order.routes.js';
import plywood_inventory_order_router from './plywood_inventory/issue_plywood_inventory_item_order.routes.js';
import mdf_inventory_order_router from './mdf_inventory/issue_mdf_inventory_item_order.routes.js';

const issue_for_raw_order_router = Router();

issue_for_raw_order_router.use(
  '/issue-raw-log-order',
  log_inventory_order_router
);
issue_for_raw_order_router.use(
  '/issue-raw-flitch-order',
  flitch_inventory_order_router
);
issue_for_raw_order_router.use(
  '/issue-raw-plywood-order',
  plywood_inventory_order_router
);

issue_for_raw_order_router.use(
  '/issue-raw-mdf-order',
  mdf_inventory_order_router
);

// issue_for_raw_order_router.use('/issue-raw-plywood-order', plywood_inventory_order_router)

export default issue_for_raw_order_router;
