import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  create_cnc,
  fetch_single_cnc_done_item_with_issue_for_cnc_data,
  listing_cnc_done,
  revert_cnc_done_items,
  update_cnc_done,
} from '../../../../controllers/factory/cnc/cnc_done/cnc_done.controller.js';
import { add_cnc_damage } from '../../../../controllers/factory/cnc/cnc_damage/cnc_damage.controller.js';

const bunito_done_router = Router();

bunito_done_router.post('/create', AuthMiddleware, create_cnc);
bunito_done_router.post('/update/:id', AuthMiddleware, update_cnc_done);
bunito_done_router.post('/list', AuthMiddleware, listing_cnc_done);
bunito_done_router.post('/revert/:id', AuthMiddleware, revert_cnc_done_items);
bunito_done_router.get(
  '/fetch-single-bunito-item/:id',
  AuthMiddleware,
  fetch_single_cnc_done_item_with_issue_for_cnc_data
);
// add to damage
bunito_done_router.post('/add-to-damage/:id', AuthMiddleware, add_cnc_damage);

export default cnc_done_router;
