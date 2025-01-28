import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addIssueForSlicingFromFlitchInventory,
  listing_issued_for_slicing_inventory, fetch_single_issued_for_slicing_item, revert_issued_for_slicing
} from '../../../controllers/factory/slicing/issuedForSlicing.controller.js';

const issueForSlicingRouter = express.Router();

issueForSlicingRouter.post(
  '/add-issue-for-slicing',
  AuthMiddleware,
  addIssueForSlicingFromFlitchInventory
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

export default issueForSlicingRouter;
