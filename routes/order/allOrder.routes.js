import express from 'express';
import decorativeOrderRouter from './decorative_order/decorativeOrder.routes.js';
import seriesOrderRouter from './series_product_order/series_product_order.routes.js';
import rawOrderRouter from './raw_order/rawOrder.routes.js';
import orderRouter from './order.routes.js';

const allOrderRouter = express.Router();

allOrderRouter.use('/raw-order', rawOrderRouter);
allOrderRouter.use('/decorative-order', decorativeOrderRouter);
allOrderRouter.use('/series-product-order', seriesOrderRouter);
allOrderRouter.use(orderRouter);

export default allOrderRouter;