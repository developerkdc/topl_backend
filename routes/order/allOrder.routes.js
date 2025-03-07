import express from 'express';
import decorativeOrderRouter from './decorative_order/decorativeOrder.routes.js';
import seriesOrderRouter from './series_product_order/series_product_order.routes.js';
import rawOrderRouter from './raw_order/rawOrder.routes.js';
import orderRouter from './order.routes.js';
import issue_for_raw_order_router from './raw_order/issue_for_order/issue_for_order.routes.js';
import { revert_order_by_order_id } from '../../controllers/order/order.js';

const allOrderRouter = express.Router();

allOrderRouter.use('/raw-order', rawOrderRouter);
allOrderRouter.use('/decorative-order', decorativeOrderRouter);
allOrderRouter.use('/series-product-order', seriesOrderRouter);
allOrderRouter.use(orderRouter);
allOrderRouter.use(issue_for_raw_order_router);
//revert order route
allOrderRouter.use("/revert-order/:id", revert_order_by_order_id)

export default allOrderRouter;