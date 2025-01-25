import express from "express"
import crossCuttingFactoryRoutes from './crossCutting/crossCutting.routes.js';
import flitchingFactoryRoutes from './flitching/flitching.routes.js';
import rejected_crosscutting_router from "./crossCutting/rejectedCrosscutting.routes.js";
const factoryRouter = express.Router();

factoryRouter.use(`/factory/cross-cutting`, crossCuttingFactoryRoutes);
factoryRouter.use(`/factory/rejected-crosscutting`, rejected_crosscutting_router);
factoryRouter.use(`/factory/flitching`, flitchingFactoryRoutes);
factoryRouter.use(`/factory/peeling`, flitchingFactoryRoutes);

export default factoryRouter;