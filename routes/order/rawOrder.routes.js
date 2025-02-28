import express from 'express';
import { AddRawOrder, UpdateRawOrder } from '../../controllers/order/raw_order/raw_order.controller.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';

const rawOrderRouter = express.Router();

rawOrderRouter.get('/get-raw-order', AddRawOrder);
rawOrderRouter.post('/add-raw-order', AuthMiddleware, AddRawOrder);
rawOrderRouter.post('/update-raw-order/:order_details_id', AuthMiddleware, UpdateRawOrder);

export default rawOrderRouter;