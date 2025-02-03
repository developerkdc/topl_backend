import { Router } from 'express';
import {
  add_slicing_done,
  fetch_all_slicing_done_items,
  fetch_all_details_by_slicing_done_id,
  fetch_slicing_done_history,
} from '../../../controllers/factory/slicing/slicing.done.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';

const slicingDoneRouter = Router();

slicingDoneRouter.post('/create-slicing', AuthMiddleware, add_slicing_done);
slicingDoneRouter.post(
  '/list-slicing-done',
  AuthMiddleware,
  fetch_all_slicing_done_items
);
slicingDoneRouter.get(
  '/fetch-single-slicing-done-details/:id',
  AuthMiddleware,
  fetch_all_details_by_slicing_done_id
);

slicingDoneRouter.post(
  '/list-slicing-done-history',
  AuthMiddleware,
  fetch_slicing_done_history
);
export default slicingDoneRouter;
