import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import { add_peeling_done } from '../../../controllers/factory/peeling/peeling_done.controller.js';
const peelingDoneRouter = express.Router();

peelingDoneRouter.post('/add-peeling-done', AuthMiddleware, add_peeling_done);

export default peelingDoneRouter;
