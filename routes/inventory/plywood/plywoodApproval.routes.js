import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  plywood_approve_invoice_details,
  plywood_reject_invoice_details,
  plywoodApproval_invoice_listing,
  plywoodApproval_item_listing_by_invoice,
} from '../../../controllers/inventory/plywood/plywoodApproval.controller.js';
const plywoodApprovalRouter = express.Router();

plywoodApprovalRouter.post(
  '/plywood-approval-invoice-listing',
  AuthMiddleware,
  plywoodApproval_invoice_listing
);

plywoodApprovalRouter.get(
  '/plywood-approval-item-listing-by-invoice/:_id/:invoice_id',
  AuthMiddleware,
  plywoodApproval_item_listing_by_invoice
);

plywoodApprovalRouter.post(
  '/plywood-approve_invoice_details/:_id/:invoice_id',
  AuthMiddleware,
  plywood_approve_invoice_details
);
plywoodApprovalRouter.post(
  '/plywood-reject_invoice_details/:_id/:invoice_id',
  AuthMiddleware,
  plywood_reject_invoice_details
);

export default plywoodApprovalRouter;
