import { Router } from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  create_packing,
  fetch_all_packing_done_items,
  revert_packing_done_items,
  update_packing_details, fetch_single_packing_done_item,
  generatePackingSlip
} from '../../../controllers/packing/packing_done/packing_done.controller.js';
const packing_done_router = Router();

packing_done_router.post('/create', AuthMiddleware, create_packing);
packing_done_router.post('/update/:id', AuthMiddleware, update_packing_details);
packing_done_router.post('/list', AuthMiddleware, fetch_all_packing_done_items);
packing_done_router.get('/packing_slip/:id', /*AuthMiddleware,*/ generatePackingSlip);
packing_done_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_packing_done_items
);
packing_done_router.get('/fetch-single-packing-done-details/:request_id', AuthMiddleware, fetch_single_packing_done_item)

export default packing_done_router;
