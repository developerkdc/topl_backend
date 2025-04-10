import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  create_bunito, fetch_single_bunito_done_item_with_issue_for_bunito_data, listing_bunito_done, revert_bunito_done_items, update_bunito_done
} from '../../../../controllers/factory/bunito/bunito_done/bunito_done.controller.js';


const bunito_done_router = Router();

bunito_done_router.post('/create', AuthMiddleware, create_bunito);
bunito_done_router.post('/update/:id', AuthMiddleware, update_bunito_done);
bunito_done_router.post('/list', AuthMiddleware, listing_bunito_done);
bunito_done_router.post('/revert/:id', AuthMiddleware, revert_bunito_done_items);
bunito_done_router.get(
  '/fetch-single-bunito-item/:id',
  AuthMiddleware,
  fetch_single_bunito_done_item_with_issue_for_bunito_data
);

export default bunito_done_router;
