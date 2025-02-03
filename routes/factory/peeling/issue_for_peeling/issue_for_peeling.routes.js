import express from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  addIssueForPeelingFromCrosscutDone,
  addIssueForPeelingFromLogInventory,
  fetch_single_issued_for_peeling_item,
  listing_issued_for_peeling,
  revert_issue_for_peeling,
} from '../../../controllers/factory/peeling/issue_for_peeling.controller.js';
const issueForPeelingRouter = express.Router();

issueForPeelingRouter.post(
  '/add-log-item-issue-for-peeling',
  AuthMiddleware,
  addIssueForPeelingFromLogInventory
);

issueForPeelingRouter.post(
  '/add-crosscut-done-issue-for-peeling',
  AuthMiddleware,
  addIssueForPeelingFromCrosscutDone
);

issueForPeelingRouter.post(
  '/listing-issue-for-peeling',
  AuthMiddleware,
  listing_issued_for_peeling
);

issueForPeelingRouter.get(
  '/fetch-single-issue-for-peeling/:id',
  AuthMiddleware,
  fetch_single_issued_for_peeling_item
);

issueForPeelingRouter.post(
  '/revert-issue-for-peeling',
  AuthMiddleware,
  revert_issue_for_peeling
);

export default issueForPeelingRouter;
