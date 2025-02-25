import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  list_issue_for_dressing,
  fetch_single_issue_of_dressing_item,
  fetch_all_issue_for_dressing_items_by_item_other_details_id,
} from '../../../../controllers/factory/dressing/issue_for_dressing/issue_for_dressing.controller.js';

const issue_for_dressing_router = Router();

issue_for_dressing_router.post(
  '/list-issue-for-dressing',
  AuthMiddleware,
  list_issue_for_dressing
);
issue_for_dressing_router.get(
  '/fetch-single-issue-for-dressing/:id',
  AuthMiddleware,
  fetch_single_issue_of_dressing_item
);
issue_for_dressing_router.get(
  '/list-issue-for-dressing-items-by-other-details-id/:id',
  AuthMiddleware,
  fetch_all_issue_for_dressing_items_by_item_other_details_id
);
export default issue_for_dressing_router;
