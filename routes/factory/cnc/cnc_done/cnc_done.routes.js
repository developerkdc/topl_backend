import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  create_cnc,
  fetch_single_cnc_done_item_with_issue_for_cnc_data,
  listing_cnc_done,
  listing_cnc_history,
  revert_cnc_done_items,
  update_cnc_done,
} from '../../../../controllers/factory/cnc/cnc_done/cnc_done.controller.js';
import { add_cnc_damage } from '../../../../controllers/factory/cnc/cnc_damage/cnc_damage.controller.js';

const cnc_done_router = Router();

cnc_done_router.post('/create', AuthMiddleware, create_cnc);
cnc_done_router.post('/update/:id', AuthMiddleware, update_cnc_done);
cnc_done_router.post('/list', AuthMiddleware, listing_cnc_done);
cnc_done_router.post('/revert/:id', AuthMiddleware, revert_cnc_done_items);
cnc_done_router.get(
  '/fetch-single-cnc-item/:id',
  AuthMiddleware,
  fetch_single_cnc_done_item_with_issue_for_cnc_data
);
cnc_done_router.post('/history-list', AuthMiddleware, listing_cnc_history);
// cnc_done_router.post("/add-to-damage", AuthMiddleware, add_cnc_damage)
export default cnc_done_router;
