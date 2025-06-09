import express from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import { add_dispatch_details } from '../../controllers/dispatch/dispatch.controller.js';
const dispatchRouter = express.Router();

dispatchRouter.post("/create-dispatch", AuthMiddleware, add_dispatch_details);

export default dispatchRouter;