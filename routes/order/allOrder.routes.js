import express from 'express';
// import rawOrderRouter from './rawOrder.routes.js';
import decorativeOrderRouter from './decorative_order/decorativeOrder.routes.js';
import seriesOrderRouter from './series_product_order/series_product_order.routes.js';
import rawOrderRouter from './raw_order/rawOrder.routes.js';

const orderRouter = express.Router();

orderRouter.use('/raw-order', rawOrderRouter);
orderRouter.use('/decorative-order', decorativeOrderRouter);
orderRouter.use('/series-product-order', seriesOrderRouter);

export default orderRouter;
