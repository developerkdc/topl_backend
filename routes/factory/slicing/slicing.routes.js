import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addIssueForSlicingFromFlitchInventory,
  listing_issued_for_slicing_inventory,
  fetch_single_issued_for_slicing_item,
  revert_issued_for_slicing,
  add_issue_for_slicing_from_flitching_done,
  fetch_issue_for_slicing_wastage_details,
  fetch_issue_for_slicing_available_details,
} from '../../../controllers/factory/slicing/issuedForSlicing.controller.js';

const issueForSlicingRouter = express.Router();

issueForSlicingRouter.post(
  '/add-issue-for-slicing-from-flitch-inventory',
  AuthMiddleware,
  addIssueForSlicingFromFlitchInventory
);
issueForSlicingRouter.post(
  '/add-issue-for-slicing-from-flitching-done-factory',
  AuthMiddleware,
  add_issue_for_slicing_from_flitching_done
);
issueForSlicingRouter.post(
  '/list-issue-for-slicing',
  AuthMiddleware,
  listing_issued_for_slicing_inventory
);
issueForSlicingRouter.get(
  '/list-single-issue-for-slicing/:id',
  AuthMiddleware,
  fetch_single_issued_for_slicing_item
);
issueForSlicingRouter.post(
  '/revert-issued-for-slicing',
  AuthMiddleware,
  revert_issued_for_slicing
);
issueForSlicingRouter.post(
  '/list-issue-for-slicing-wastage',
  AuthMiddleware,
  fetch_issue_for_slicing_wastage_details
);
issueForSlicingRouter.post(
  '/list-issue-for-slicing-available',
  AuthMiddleware,
  fetch_issue_for_slicing_available_details
);
export default issueForSlicingRouter;
