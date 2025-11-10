import express from 'express';
import {
  fetch_all_decorative_order_items, fetch_all_decorative_order_items_by_order_id,
  reject_order, approve_order
} from '../../../controllers/order/decorative_order/approval.decorative_order.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';

const approval_decorative_order_router = express.Router();


approval_decorative_order_router.post(
  '/decorative/list-decorative-orders',
  AuthMiddleware,
  fetch_all_decorative_order_items
);

approval_decorative_order_router.get(
  '/decorative/fetch-decorative-orders-by-order-id/:id',
  AuthMiddleware,
  fetch_all_decorative_order_items_by_order_id
);
approval_decorative_order_router.post(
  '/decorative/approve-order/:id',
  AuthMiddleware,
  approve_order
);
approval_decorative_order_router.post(
  '/decorative/reject-order/:order_id',
  AuthMiddleware,
  reject_order
);


export default approval_decorative_order_router;
