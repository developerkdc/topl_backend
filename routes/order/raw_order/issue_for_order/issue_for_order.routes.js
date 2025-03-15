import { Router } from 'express';
import log_inventory_order_router from './log_inventory/issue_log_inventory_item_order.routes.js';
import flitch_inventory_order_router from './flitch_inventory/issue_flitch_inventory_item_order.routes.js';
import plywood_inventory_order_router from './plywood_inventory/issue_plywood_inventory_item_order.routes.js';
import mdf_inventory_order_router from './mdf_inventory/issue_mdf_inventory_item_order.routes.js';
import venner_inventory_order_router from './venner_inventory/issue_venner_inventory_item_order.routes.js';
import core_inventory_order_router from './core_inventory/issue_core_inventory_item_order.routes.js';
import face_inventory_order_router from './face_inventory/issue_face_inventory_item_order.routes.js';
import other_goods_inventory_order_router from './other_goods_inventory/issue_other_goods_inventory_item_order.routes.js';
import fleece_inventory_order_router from './fleece_inventory/issue_fleece_inventory_item_order.routes.js';

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
issue_for_raw_order_router.use(
  '/issue-raw-venner-order',
  venner_inventory_order_router
);
issue_for_raw_order_router.use(
  '/issue-raw-face-order',
  face_inventory_order_router
);

issue_for_raw_order_router.use(
  '/issue-raw-core-order',
  core_inventory_order_router
);
issue_for_raw_order_router.use(
  '/issue-raw-fleece-paper-order',
  fleece_inventory_order_router
);
issue_for_raw_order_router.use(
  '/issue-raw-other-goods-order',
  other_goods_inventory_order_router
);

// issue_for_raw_order_router.use('/issue-raw-plywood-order', plywood_inventory_order_router)

export default issue_for_raw_order_router;
