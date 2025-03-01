import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  add_series_order,
  fetch_all_series_order_items,
  fetch_all_series_order_items_by_order_id,
  update_series_order,
  update_series_order_item_status_by_item_id,
} from '../../../controllers/order/series_product_order/series_product_order.controller.js';

const seriesOrderRouter = express.Router();

// seriesOrderRouter.get('/get-raw-order', AddRawOrder);
seriesOrderRouter.post('/add-order', AuthMiddleware, add_series_order);
seriesOrderRouter.patch(
  '/update-order/:order_details_id',
  AuthMiddleware,
  update_series_order
);
seriesOrderRouter.post(
  '/list-series-orders',
  AuthMiddleware,
  fetch_all_series_order_items
);
seriesOrderRouter.post(
  '/cancel-order-item/:id',
  AuthMiddleware,
  update_series_order_item_status_by_item_id
);
seriesOrderRouter.get(
  '/fetch-series-orders-by-order-id/:id',
  AuthMiddleware,
  fetch_all_series_order_items_by_order_id
);

export default seriesOrderRouter;
