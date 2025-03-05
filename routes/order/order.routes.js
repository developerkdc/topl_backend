import express from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import { fetch_single_order_items, order_items_dropdown, order_no_dropdown } from '../../controllers/order/order.js';

const orderRouter = express.Router();

orderRouter.get("/order-no-dropdown", AuthMiddleware, order_no_dropdown);
orderRouter.get("/order-item-no-dropdown/:order_id", AuthMiddleware, order_items_dropdown);
orderRouter.get("/fetch-single-order-item/:order_id/:item_id", AuthMiddleware, fetch_single_order_items);

export default orderRouter;
