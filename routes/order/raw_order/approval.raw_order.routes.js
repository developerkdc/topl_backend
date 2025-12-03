import express from 'express';
import {
  fetch_all_raw_order_items, fetch_all_raw_order_items_by_order_id, reject_raw_order, approve_raw_order
} from '../../../controllers/order/raw_order/approval.raw_order.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';

const approval_raw_order_router = express.Router();


approval_raw_order_router.post(
  '/raw/list-raw-orders',
  AuthMiddleware,
  fetch_all_raw_order_items
);

approval_raw_order_router.get(
  '/raw/fetch-raw-orders-by-order-id/:id',
  AuthMiddleware,
  fetch_all_raw_order_items_by_order_id
);
approval_raw_order_router.post(
  '/raw/approve-order/:id',
  AuthMiddleware,
  approve_raw_order
);
approval_raw_order_router.post(
  '/raw/reject-order/:order_id',
  AuthMiddleware,
  reject_raw_order
);


export default approval_raw_order_router;
