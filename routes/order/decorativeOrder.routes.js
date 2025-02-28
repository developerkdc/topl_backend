import express from 'express';
import { add_decorative_order, update_decorative_order, update_order_item_status_by_item_id, fetch_all_decorative_order_items, fetch_all_decorative_order_items_by_order_id } from '../../controllers/order/decorative_order.controller.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';

const decorativeOrderRouter = express.Router();

// decorativeOrderRouter.get('/get-raw-order', AddRawOrder);
decorativeOrderRouter.post('/add-order', AuthMiddleware, add_decorative_order);
decorativeOrderRouter.post('/update-order/:order_details_id', AuthMiddleware, update_decorative_order);
decorativeOrderRouter.post('/list-decorative-orders', AuthMiddleware, fetch_all_decorative_order_items);
decorativeOrderRouter.post('/cancel-order-item/:id', AuthMiddleware, update_order_item_status_by_item_id);
decorativeOrderRouter.get('/fetch-decorative-orders-by-order-id/:id', AuthMiddleware, fetch_all_decorative_order_items_by_order_id);

export default decorativeOrderRouter;
