import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  create_dressing,
  fetch_all_dressing_done_items,
  fetch_all_dressing_done_items_by_other_details_id,
  edit_dressing_done_items,
  fetch_single_dressing_done_item,
  fetch_dressing_done_history,
  revert_dressing_done_items,
  create_dressing_items_from_dressing_report,
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
  '/edit-dressing-done-items/:id',
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
dressing_done_router.post(
  '/revert-dressing-done/:other_details_id',
  AuthMiddleware,
  revert_dressing_done_items
);
dressing_done_router.post(
  '/create-dressing-from-report',
  AuthMiddleware,
  create_dressing_items_from_dressing_report
);
export default dressing_done_router;
