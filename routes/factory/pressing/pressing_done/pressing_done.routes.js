import express from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import { add_pressing_details, fetch_all_pressing_done_items, fetch_pressing_done_consumed_item_details, revert_pressing_done_details } from '../../../../controllers/factory/pressing/pressing_done/pressing_done.controller.js';

const pressing_done_router = express.Router();

pressing_done_router.post(
  '/add-pressing-done',
  AuthMiddleware,
  add_pressing_details
);
// pressing_done_router.patch(
//   '/edit-tapping-done/:tapping_done_id',
//   AuthMiddleware,
//   edit_tapping_details
// );
pressing_done_router.post(
  '/list-pressing-done-items',
  AuthMiddleware,
  fetch_all_pressing_done_items
);
// pressing_done_router.get(
//   '/fetch-single-pressing-done-details/:id',
//   AuthMiddleware,
//   fetch_all_details_by_tapping_id
// );
pressing_done_router.get(
  '/fetch-pressing-done-consumed-item-details/:id',
  AuthMiddleware,
  fetch_pressing_done_consumed_item_details
);
pressing_done_router.post(
  '/revert-pressing-done-details/:id',
  AuthMiddleware,
  revert_pressing_done_details
);
// pressing_done_router.post(
//   '/list-tapping-done-items-history',
//   AuthMiddleware,
//   fetch_all_tapping_done_items_history
// );

export default pressing_done_router;
