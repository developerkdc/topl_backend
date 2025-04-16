import express from 'express';
import {
  fetch_all_issue_for_tapping_details,
  fetch_all_issue_for_tapping_details_for_orders,
  fetch_single_issue_for_tapping_details,
  issue_for_tapping_from_grouping_for_stock_and_sample,
  revert_issue_for_tapping_item,
} from '../../../../controllers/factory/tapping/issue_for_tapping/issue_for_tapping.controller.js';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';

const issue_for_tapping_router = express.Router();

issue_for_tapping_router.post(
  '/issue-for-tapping-stock-sample/:grouping_done_item_id',
  AuthMiddleware,
  issue_for_tapping_from_grouping_for_stock_and_sample
);
issue_for_tapping_router.post(
  '/list-issue-for-tapping',
  AuthMiddleware,
  fetch_all_issue_for_tapping_details
);
issue_for_tapping_router.get(
  '/fetch-single-issue-for-tapping-item-details/:id',
  AuthMiddleware,
  fetch_single_issue_for_tapping_details
);
issue_for_tapping_router.post(
  '/revert-issue-for-tapping-item/:issue_for_tapping_id',
  AuthMiddleware,
  revert_issue_for_tapping_item
);
issue_for_tapping_router.get(
  '/fetch-issue-for-tapping-item-for-order-details/:order_id/:order_item_id',
  AuthMiddleware,
  fetch_all_issue_for_tapping_details_for_orders
);

export default issue_for_tapping_router;
