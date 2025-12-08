import express from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  fetch_decorative_and_series_product_order_items,
  fetch_single_order_items,
  order_items_dropdown,
  order_no_dropdown,
} from '../../controllers/order/order.js';
import DecorativeSeriesOrderCancelController from '../../controllers/order/order_cancelled/decorative_series_order_cancel.controller.js';
import { verifyApproval } from '../../middlewares/approval.middleware.js';

const orderRouter = express.Router();

orderRouter.get('/order-no-dropdown', AuthMiddleware, order_no_dropdown);
orderRouter.get(
  '/order-item-no-dropdown/:order_id',
  AuthMiddleware,
  order_items_dropdown
);
orderRouter.get(
  '/fetch-single-order-item/:order_id/:item_id',
  AuthMiddleware,
  fetch_single_order_items
);
orderRouter.post(
  '/cancel-order',
  AuthMiddleware,
  verifyApproval('order', 'cancel'),
  DecorativeSeriesOrderCancelController.cancel_order
);
orderRouter.post(
  '/cancel-order-item',
  AuthMiddleware,
  verifyApproval('order', 'cancel'),
  DecorativeSeriesOrderCancelController.cancel_order_item
);
orderRouter.post("/fetch-orders", fetch_decorative_and_series_product_order_items)

//approve cancelled order
orderRouter.post(
  '/approve-cancelled-series-and-decorative-order/:approval_order_id',
  AuthMiddleware,
  DecorativeSeriesOrderCancelController.approve_order_cancellation
);
orderRouter.post(
  '/approve-cancelled-series-and-decorative-order-item/:approval_order_id/:approval_item_id',
  AuthMiddleware,
  DecorativeSeriesOrderCancelController.approve_order_item_cancellation
);
orderRouter.post(
  '/reject-cancelled-series-and-decorative-order/:order_id',
  AuthMiddleware,
  DecorativeSeriesOrderCancelController.reject_order
);
export default orderRouter;
