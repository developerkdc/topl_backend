import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  flitching_approval_item_listing_by_unique_id,
  flitching_approval_listing,
  flitching_approve,
  flitching_reject,
} from '../../../controllers/factory/flitching/flitchingApproval.controller.js';
const flitchingApprovalRouter = express.Router();

flitchingApprovalRouter.post(
  '/flitching-approval-listing',
  AuthMiddleware,
  flitching_approval_listing
);

flitchingApprovalRouter.get(
  '/flitching-approval-item-listing-by-unique-id/:_id/:issue_for_flitching_id',
  AuthMiddleware,
  flitching_approval_item_listing_by_unique_id
);

flitchingApprovalRouter.post(
  '/flitching-approve-details/:_id/:issue_for_flitching_id',
  AuthMiddleware,
  flitching_approve
);
flitchingApprovalRouter.post(
  '/flitching-reject_details/:_id/:issue_for_flitching_id',
  AuthMiddleware,
  flitching_reject
);

export default flitchingApprovalRouter;
