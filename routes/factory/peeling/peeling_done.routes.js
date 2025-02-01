import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  add_peeling_done,
  edit_peeling_done,
} from '../../../controllers/factory/peeling/peeling_done.controller.js';
const peelingDoneRouter = express.Router();

peelingDoneRouter.post('/add-peeling-done', AuthMiddleware, add_peeling_done);
peelingDoneRouter.patch(
  '/edit-peeling-done/:peeling_done_id',
  AuthMiddleware,
  edit_peeling_done
);

export default peelingDoneRouter;
