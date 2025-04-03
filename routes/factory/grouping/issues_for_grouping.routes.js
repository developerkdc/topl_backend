import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  fetch_all_issue_for_grouping_details,
  fetch_single_issue_for_grouping_details,
  issue_for_grouping_from_dressing_done,
  issue_for_grouping_from_smoking_dying_done,
  issue_for_grouping_from_veneer_inventory,
  revert_issue_for_grouping,
} from '../../../controllers/factory/grouping/issues_for_grouping.controller.js';
const issueForGroupingRouter = express.Router();

issueForGroupingRouter.post(
  '/add-issue-for-grouping-form-veneer-inventory',
  AuthMiddleware,
  issue_for_grouping_from_veneer_inventory
);
issueForGroupingRouter.post(
  '/add-issue-for-grouping-form-smoking-dying/:process_done_id',
  AuthMiddleware,
  issue_for_grouping_from_smoking_dying_done
);
issueForGroupingRouter.post(
  '/add-issue-for-grouping-form-dressing-done/:dressing_done_id',
  AuthMiddleware,
  issue_for_grouping_from_dressing_done
);
issueForGroupingRouter.post(
  '/revert-issue-for-grouping/:unique_identifier/:pallet_number(*)',
  AuthMiddleware,
  revert_issue_for_grouping
);
issueForGroupingRouter.get(
  '/fetch-single-issue-for-grouping/:unique_identifier/:pallet_number(*)',
  AuthMiddleware,
  fetch_single_issue_for_grouping_details
);
issueForGroupingRouter.post(
  '/listing-issue-for-grouping',
  AuthMiddleware,
  fetch_all_issue_for_grouping_details
);

export default issueForGroupingRouter;
