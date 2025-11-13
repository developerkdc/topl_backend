import express from 'express';
import {
  approve_packing_details, fetch_all_packing_done_items, fetch_all_packing_items_by_packing_done_other_details_id, reject_packing_details
} from '../../../controllers/packing/packing_done/approval.packing_done.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';

const approval_packing_done_router = express.Router();


approval_packing_done_router.post(
  '/packing/list-packing-details',
  AuthMiddleware,
  fetch_all_packing_done_items
);

approval_packing_done_router.get(
  '/packing/fetch-packing-details-by-id/:id',
  AuthMiddleware,
  fetch_all_packing_items_by_packing_done_other_details_id
);
approval_packing_done_router.post(
  '/packing/approve-packing-details/:id',
  AuthMiddleware,
  approve_packing_details
);
approval_packing_done_router.post(
  '/packing/reject-packing-details/:packing_done_other_details_id',
  AuthMiddleware,
  reject_packing_details
);


export default approval_packing_done_router;
