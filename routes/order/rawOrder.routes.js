import express from 'express';
import { AddRawOrder } from '../../controllers/order/raw_order.controller.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';

const rawOrderRouter = express.Router();

rawOrderRouter.get('/get-raw-order', AddRawOrder);
rawOrderRouter.post('/add-raw-order', AuthMiddleware, AddRawOrder);
rawOrderRouter.post('/update-raw-order', AddRawOrder);

export default rawOrderRouter;
