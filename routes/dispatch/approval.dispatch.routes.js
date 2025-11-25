import express from 'express';
import {
  fetch_all_dispatch_details,
  approve_dispatch_details,
  fetch_all_dispatch_items_by_dispatch_id,
  reject_dispatch_details

} from '../../controllers/dispatch/approval.dispatch.controller.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';

const approval_dispatch_done_router = express.Router();


approval_dispatch_done_router.post(
  '/dispatch/list-dispatch-details',
  AuthMiddleware,
  fetch_all_dispatch_details
);

approval_dispatch_done_router.get(
  '/dispatch/fetch-dispatch-details-by-id/:id',
  AuthMiddleware,
  fetch_all_dispatch_items_by_dispatch_id
);
approval_dispatch_done_router.post(
  '/dispatch/approve-dispatch-details/:id',
  AuthMiddleware,
  approve_dispatch_details
);
approval_dispatch_done_router.post(
  '/dispatch/reject-dispatch-details/:dispatch_details_id',
  AuthMiddleware,
  reject_dispatch_details
);


export default approval_dispatch_done_router;
