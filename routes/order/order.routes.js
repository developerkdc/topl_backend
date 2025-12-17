import express from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  fetch_decorative_and_series_product_order_items,
  fetch_single_order_items,
  order_items_dropdown,
  order_details,
  order_no_dropdown,
} from '../../controllers/order/order.js';
import DecorativeSeriesOrderCancelController from '../../controllers/order/order_cancelled/decorative_series_order_cancel.controller.js';

const orderRouter = express.Router();

orderRouter.get('/order-no-dropdown', AuthMiddleware, order_no_dropdown);
orderRouter.get(
  '/order-item-no-dropdown/:order_id',
  AuthMiddleware,
  order_items_dropdown
);
orderRouter.get('/fetch-order-details', AuthMiddleware, order_details);
orderRouter.get(
  '/fetch-single-order-item/:order_id/:item_id',
  AuthMiddleware,
  fetch_single_order_items
);
orderRouter.post(
  '/cancel-order',
  AuthMiddleware,
  DecorativeSeriesOrderCancelController.cancel_order
);
orderRouter.post(
  '/cancel-order-item',
  AuthMiddleware,
  DecorativeSeriesOrderCancelController.cancel_order_item
);
orderRouter.post(
  '/fetch-orders',
  fetch_decorative_and_series_product_order_items
);

export default orderRouter;
