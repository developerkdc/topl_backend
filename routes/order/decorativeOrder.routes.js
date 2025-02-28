import express from 'express';
import { add_decorative_order, update_decorative_order, update_order_item_status_by_item_id } from '../../controllers/order/decorative_order.controller.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';

const decorativeOrderRouter = express.Router();

// decorativeOrderRouter.get('/get-raw-order', AddRawOrder);
decorativeOrderRouter.post('/add-order', AuthMiddleware, add_decorative_order);
decorativeOrderRouter.post('/update-order', AuthMiddleware, update_decorative_order);

export default decorativeOrderRouter;
