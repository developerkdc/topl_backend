import express from 'express';
import flitch_router from './flitch/flitch.routes.js';
import veneer_router from './veener/venner.routes.js';
import fleece_router from './fleece/fleece.routes.js';
import coreInventoryRoutes from './core/core.routes.js';
import faceInventoryRoutes from './face/face.routes.js';
import logRouter from './log/log.routes.js';
import mdfInventoryRoutes from './mdf/mdf.routes.js';
import otherGoodsInventoryRouter from './otherGoods/otherGoods.routes.js';
import plywoodInventoryRoutes from './plywood/plywood.routes.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import { bulk_upload_inventory } from '../../controllers/bulk_uploads/inventory/inventory_bulk_upload.controller.js';
const allInventoryRouter = express.Router();

allInventoryRouter.use(`/log-inventory`, logRouter);
allInventoryRouter.use(`/flitch-inventory`, flitch_router);
allInventoryRouter.use(`/other-goods-inventory`, otherGoodsInventoryRouter);
allInventoryRouter.use(`/plywood-inventory`, plywoodInventoryRoutes);
allInventoryRouter.use(`/mdf-inventory`, mdfInventoryRoutes);
allInventoryRouter.use(`/veneer-inventory`, veneer_router);
allInventoryRouter.use(`/face-inventory`, faceInventoryRoutes);
allInventoryRouter.use(`/core-inventory`, coreInventoryRoutes);
allInventoryRouter.use(`/fleece-inventory`, fleece_router);

allInventoryRouter.use('/inventory/bulk-upload', AuthMiddleware, bulk_upload_inventory)
export default allInventoryRouter;
