import express from 'express';
import {
  add_raw_order,
  fetch_all_raw_order_items,
  fetch_all_raw_order_items_by_order_id,
  update_raw_order,
  update_raw_order_item_status_by_item_id,
} from '../../../controllers/order/raw_order/raw_order.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RawOrderCancelController from '../../../controllers/order/order_cancelled/raw_order_cancel.controller.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';

const rawOrderRouter = express.Router();

rawOrderRouter.post('/add-raw-order', AuthMiddleware, add_raw_order);
rawOrderRouter.post(
  '/update-raw-order/:order_details_id',
  AuthMiddleware,
  verifyApproval('order', 'edit'),//need to add approval for raw order edit
  update_raw_order
);
rawOrderRouter.post(
  '/list-raw-orders',
  AuthMiddleware,
  fetch_all_raw_order_items
);
rawOrderRouter.post(
  '/cancel-raw-order-item/:id',
  AuthMiddleware,
  update_raw_order_item_status_by_item_id
);
rawOrderRouter.get(
  '/fetch-raw-orders-by-order-id/:id',
  AuthMiddleware,
  fetch_all_raw_order_items_by_order_id
);

rawOrderRouter.post(
  '/cancel-order',
  AuthMiddleware,
  verifyApproval('order', 'cancel'),
  RawOrderCancelController.cancel_order
);
rawOrderRouter.post(
  '/cancel-order-item',
  AuthMiddleware,
  verifyApproval('order', 'cancel'),
  RawOrderCancelController.cancel_order_item
);

export default rawOrderRouter;
