import express from 'express';
import {
  add_issue_for_smoking_dying_from_veneer_inventory,
  fetch_single_issued_for_smoking_dying_item,
  listing_issued_for_smoking_dying,
  revert_issued_for_smoking_dying_item,
  add_issue_for_smoking_dying_from_dressing_done_factory,
} from '../../../controllers/factory/smoking_dying/issues_for_smoking_dying.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
const issueForSmokingDyingRouter = express.Router();

issueForSmokingDyingRouter.post(
  '/add-veneer-item-issue-for-smoking-dying',
  AuthMiddleware,
  add_issue_for_smoking_dying_from_veneer_inventory
);
issueForSmokingDyingRouter.post(
  '/add-dressing-item-issue-for-smoking-dying',
  AuthMiddleware,
  add_issue_for_smoking_dying_from_dressing_done_factory
);

issueForSmokingDyingRouter.post(
  '/listing-issue-for-smoking-dying',
  AuthMiddleware,
  listing_issued_for_smoking_dying
);

issueForSmokingDyingRouter.get(
  '/fetch-single-issue-for-smoking-dying/:unique_identifier/:pallet_number',
  AuthMiddleware,
  fetch_single_issued_for_smoking_dying_item
);

issueForSmokingDyingRouter.post(
  '/revert-issue-for-smoking-dying/:unique_identifier/:pallet_number',
  AuthMiddleware,
  revert_issued_for_smoking_dying_item
);

export default issueForSmokingDyingRouter;
