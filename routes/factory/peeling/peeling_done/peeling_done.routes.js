import express from 'express';
import {
  add_peeling_done,
  edit_peeling_done,
  fetch_all_details_by_peeling_done_id,
  fetch_all_peeling_done_items,
  revert_all_pending_done,
  update_peeling_done_items_details,
} from '../../../../controllers/factory/peeling/peeling_done/peeling_done.controller.js';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
const peelingDoneRouter = express.Router();

peelingDoneRouter.post('/add-peeling-done', AuthMiddleware, add_peeling_done);
peelingDoneRouter.patch(
  '/edit-peeling-done/:peeling_done_id',
  AuthMiddleware,
  edit_peeling_done
);
peelingDoneRouter.post(
  '/list-peeling-done-items',
  AuthMiddleware,
  fetch_all_peeling_done_items
);
peelingDoneRouter.get(
  '/fetch-single-peeling-done-details/:id',
  AuthMiddleware,
  fetch_all_details_by_peeling_done_id
);
peelingDoneRouter.post(
  '/revert-peeling-done-details/:id',
  AuthMiddleware,
  revert_all_pending_done
);
peelingDoneRouter.patch(
  '/update-peeling-done-item-details/:id',
  AuthMiddleware,
  update_peeling_done_items_details
);

export default peelingDoneRouter;
