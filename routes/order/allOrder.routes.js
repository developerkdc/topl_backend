import express from 'express';
// import rawOrderRouter from './rawOrder.routes.js';
import decorativeOrderRouter from './decorative_order/decorativeOrder.routes.js';
import seriesOrderRouter from './series_product_order/series_product_order.routes.js';
import rawOrderRouter from './raw_order/rawOrder.routes.js';
import issue_for_raw_order_router from './raw_order/issue_for_order/issue_for_order.routes.js';

const orderRouter = express.Router();

orderRouter.use('/raw-order', rawOrderRouter);
orderRouter.use('/decorative-order', decorativeOrderRouter);
orderRouter.use('/series-product-order', seriesOrderRouter);
orderRouter.use(issue_for_raw_order_router);

export default orderRouter;
