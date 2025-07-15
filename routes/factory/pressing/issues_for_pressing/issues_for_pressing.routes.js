import express from 'express';
import {
  fetch_all_issue_for_pressing_details,
  fetch_single_issue_for_pressing_details,
  issue_for_pressing_from_tapping,
  issue_for_pressing_from_tapping_for_order,
  revert_issue_for_pressing_item,
} from '../../../../controllers/factory/pressing/issues_for_pressing/issues_for_pressing.controller.js';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';

const issue_for_pressing_router = express.Router();

issue_for_pressing_router.post(
  '/issue-for-pressing-from-tapping/:tapping_done_item_id',
  AuthMiddleware,
  issue_for_pressing_from_tapping
);
issue_for_pressing_router.post(
  '/issue-for-pressing-for-order/:tapping_done_item_id',
  AuthMiddleware,
  issue_for_pressing_from_tapping_for_order
);
issue_for_pressing_router.post(
  '/list-issue-for-pressing',
  AuthMiddleware,
  fetch_all_issue_for_pressing_details
);
issue_for_pressing_router.get(
  '/fetch-single-issue-for-pressing-item-details/:id',
  AuthMiddleware,
  fetch_single_issue_for_pressing_details
);
issue_for_pressing_router.post(
  '/revert-issue-for-pressing-item/:issue_for_pressing_id',
  AuthMiddleware,
  revert_issue_for_pressing_item
);

export default issue_for_pressing_router;
