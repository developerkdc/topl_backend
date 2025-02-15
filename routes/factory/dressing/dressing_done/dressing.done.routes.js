import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  create_dressing,
  fetch_all_dressing_done_items,
  fetch_all_dressing_done_items_by_other_details_id,
  edit_dressing_done_items,
  fetch_single_dressing_done_item,
  fetch_dressing_done_history,
} from '../../../../controllers/factory/dressing/dressing_done/dressing.done.controller.js';
const dressing_done_router = Router();

dressing_done_router.post('/create-dressing', AuthMiddleware, create_dressing);
dressing_done_router.post(
  '/list-dressing-done-items',
  AuthMiddleware,
  fetch_all_dressing_done_items
);
dressing_done_router.get(
  '/list-dressing-done-items-by-other-details/:id',
  AuthMiddleware,
  fetch_all_dressing_done_items_by_other_details_id
);
dressing_done_router.post(
  '/edit-dressing-done-items/:slicing_done_other_details_id',
  AuthMiddleware,
  edit_dressing_done_items
);
dressing_done_router.get(
  '/list-single-dressing-done-item/:id',
  AuthMiddleware,
  fetch_single_dressing_done_item
);
dressing_done_router.post(
  '/list-dressing-done-history',
  AuthMiddleware,
  fetch_dressing_done_history
);
export default dressing_done_router;
