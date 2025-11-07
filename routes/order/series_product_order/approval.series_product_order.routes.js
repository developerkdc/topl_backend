import express from 'express';
import {
  approve_order, fetch_all_series_product_order_items, fetch_all_series_product_order_items_by_order_id, reject_order
} from '../../../controllers/order/series_product_order/approval.series_product_order_item_details.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';

const approval_series_product_order_router = express.Router();


approval_series_product_order_router.post(
  '/series-product-order/list-series-product-orders',
  AuthMiddleware,
  fetch_all_series_product_order_items
);

approval_series_product_order_router.get(
  '/series-product-order/fetch-series-product-order-by-order-id/:id',
  AuthMiddleware,
  fetch_all_series_product_order_items_by_order_id
);
approval_series_product_order_router.post(
  '/series-product-order/approve-order/:id',
  AuthMiddleware,
  approve_order
);
approval_series_product_order_router.post(
  '/series-product-order/reject-order/:order_id',
  AuthMiddleware,
  reject_order
);


export default approval_series_product_order_router;
